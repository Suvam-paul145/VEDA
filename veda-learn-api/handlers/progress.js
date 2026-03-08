// veda-learn-api/handlers/progress.js
'use strict';

const { DynamoDBClient, GetItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

const handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Content-Type': 'application/json',
    };

    const userId = event.pathParameters?.userId
        || event.queryStringParameters?.userId
        || JSON.parse(event.body || '{}').userId;

    if (!userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) };
    }

    try {
        // ── 1. Fetch learning profile ─────────────────────────────────────────────
        const profileRes = await dynamo.send(new GetItemCommand({
            TableName: 'veda-learning-profiles',
            Key: { userId: { S: userId } },
        }));

        // Default profile for new users
        const profile = profileRes.Item
            ? unmarshall(profileRes.Item)
            : {
                userId,
                xp: 0,
                streak: 0,
                lastActiveDate: null,
                concepts: {},
                quizzesTaken: 0,
                quizzesPassed: 0,
                totalLessons: 0,
                badges: [],
            };

        // ── 2. Recalculate streak based on today's date ────────────────────────────
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const lastDate = profile.lastActiveDate;

        if (lastDate && lastDate !== today && lastDate !== yesterday) {
            // Streak broken — reset
            profile.streak = 0;
        }

        // ── 3. Fetch recent mistakes for activity feed ─────────────────────────────
        let recentMistakes = [];
        try {
            const mistakesRes = await dynamo.send(new QueryCommand({
                TableName: 'veda-mistakes',
                IndexName: 'userId-index',
                KeyConditionExpression: 'userId = :uid',
                ExpressionAttributeValues: { ':uid': { S: userId } },
                ScanIndexForward: false,
                Limit: 10,
            }));
            recentMistakes = (mistakesRes.Items || []).map(i => unmarshall(i));
        } catch (err) {
            // veda-mistakes table may not exist yet — non-fatal
            console.warn('[progress] Could not fetch mistakes:', err.message);
        }

        // ── 4. Compute weekly XP chart (last 7 days) ───────────────────────────────
        const weeklyXP = computeWeeklyXP(recentMistakes, profile.xp);

        return {
            statusCode: 200, headers,
            body: JSON.stringify({
                ...profile,
                weeklyXP,
                recentMistakes: recentMistakes.slice(0, 5),
                level: Math.floor(profile.xp / 100) + 1,   // Level up every 100 XP
                nextLevelXP: ((Math.floor(profile.xp / 100) + 1) * 100),
            }),
        };
    } catch (err) {
        console.error('[progress] Error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};

/** Generate a 7-day XP breakdown for the progress chart */
function computeWeeklyXP(mistakes, totalXP) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        const dayMistakes = mistakes.filter(m =>
            m.detectedAt && m.detectedAt.startsWith(date)
        ).length;
        days.push({
            date,
            label: new Date(Date.now() - i * 86400000).toLocaleDateString('en', { weekday: 'short' }),
            xp: dayMistakes * 15,   // 15 XP per lesson/day approximation
        });
    }
    return days;
}

module.exports.get = handler;
module.exports.handler = handler;
