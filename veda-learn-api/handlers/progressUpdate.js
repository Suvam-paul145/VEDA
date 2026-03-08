// veda-learn-api/handlers/progressUpdate.js
'use strict';

const {
    DynamoDBClient,
    UpdateItemCommand,
    GetItemCommand,
    PutItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { unmarshall, marshall } = require('@aws-sdk/util-dynamodb');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

// XP thresholds for badges
const BADGES = [
    { id: 'first_lesson', label: '🎓 First Lesson', xp: 0, check: (p) => p.totalLessons >= 1 },
    { id: 'streak_3', label: '🔥 3-Day Streak', xp: 0, check: (p) => p.streak >= 3 },
    { id: 'streak_7', label: '⚡ 7-Day Streak', xp: 0, check: (p) => p.streak >= 7 },
    { id: 'xp_100', label: '💯 100 XP', xp: 100, check: (p) => p.xp >= 100 },
    { id: 'xp_500', label: '🚀 500 XP', xp: 500, check: (p) => p.xp >= 500 },
    { id: 'concept_master', label: '🧠 Concept Master', xp: 0, check: (p) => Object.values(p.concepts || {}).some(v => v >= 90) },
];

module.exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Content-Type': 'application/json',
    };

    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    const { userId, xpDelta = 0, quizPassed, concept, mistakeType } = body;

    if (!userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) };
    }

    try {
        // ── 1. Fetch current profile ───────────────────────────────────────────────
        const res = await dynamo.send(new GetItemCommand({
            TableName: 'veda-learning-profiles',
            Key: { userId: { S: userId } },
        }));

        const now = new Date().toISOString();
        const today = now.split('T')[0];

        let profile = res.Item
            ? unmarshall(res.Item)
            : { userId, xp: 0, streak: 0, lastActiveDate: null, concepts: {}, quizzesTaken: 0, quizzesPassed: 0, totalLessons: 0, badges: [] };

        // ── 2. Update XP ───────────────────────────────────────────────────────────
        profile.xp += xpDelta;

        // ── 3. Update streak ───────────────────────────────────────────────────────
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (profile.lastActiveDate === yesterday) {
            profile.streak += 1;
        } else if (profile.lastActiveDate !== today) {
            profile.streak = 1;
        }
        profile.lastActiveDate = today;

        // ── 4. Update concept mastery (0-100 scale) ────────────────────────────────
        if (concept) {
            const current = profile.concepts[concept] || 0;
            const delta = quizPassed ? 15 : 5;
            profile.concepts[concept] = Math.min(100, current + delta);
        }

        // ── 5. Update lesson/quiz counters ─────────────────────────────────────────
        if (concept) profile.totalLessons += 1;
        if (quizPassed !== undefined) {
            profile.quizzesTaken += 1;
            if (quizPassed) profile.quizzesPassed += 1;
        }

        // ── 6. Check and award badges ──────────────────────────────────────────────
        const existingBadges = new Set(profile.badges || []);
        const newBadges = [];

        for (const badge of BADGES) {
            if (!existingBadges.has(badge.id) && badge.check(profile)) {
                existingBadges.add(badge.id);
                newBadges.push(badge);
            }
        }
        profile.badges = [...existingBadges];

        // ── 7. Save updated profile ────────────────────────────────────────────────
        await dynamo.send(new PutItemCommand({
            TableName: 'veda-learning-profiles',
            Item: marshall(profile),
        }));

        return {
            statusCode: 200, headers,
            body: JSON.stringify({
                ...profile,
                newBadges,
                level: Math.floor(profile.xp / 100) + 1,
            }),
        };
    } catch (err) {
        console.error('[progressUpdate] Error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};
