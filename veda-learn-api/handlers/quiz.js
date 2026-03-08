// veda-learn-api/handlers/quiz.js
'use strict';

const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { chatCompletion, MODELS } = require('../lib/openrouter');
const { pushToUser } = require('../lib/websocket');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

module.exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Content-Type': 'application/json',
    };

    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    const { action, userId, lessonId, concept, language, answers } = body;

    // ── GET quiz for a lesson ────────────────────────────────────────────────────
    if (action === 'get' || !action) {
        if (!lessonId) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'lessonId required' }) };
        }

        try {
            // On-demand generation if not cached (fallback path)
            if (concept && language) {
                const raw = await chatCompletion({
                    model: MODELS.HAIKU,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a quiz generator. Respond only in JSON.',
                        },
                        {
                            role: 'user',
                            content: `Generate 3 MCQ questions for the concept "${concept}" in ${language}.
Return ONLY: {"questions":[{"question":"","options":["A.","B.","C.","D."],"answerIndex":0,"explanation":""}]}`,
                        },
                    ],
                    maxTokens: 600,
                });
                const quiz = JSON.parse(raw);
                return { statusCode: 200, headers, body: JSON.stringify({ quiz }) };
            }

            return { statusCode: 200, headers, body: JSON.stringify({ message: 'Quiz was delivered via WebSocket' }) };
        } catch (err) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
        }
    }

    // ── SUBMIT quiz answers ──────────────────────────────────────────────────────
    if (action === 'submit') {
        if (!userId || !lessonId || !Array.isArray(answers)) {
            return {
                statusCode: 400, headers,
                body: JSON.stringify({ error: 'userId, lessonId, and answers[] required' }),
            };
        }

        try {
            // Score answers
            const score = answers.reduce((acc, a) => acc + (a.correct ? 1 : 0), 0);
            const total = answers.length;
            const passed = score >= Math.ceil(total * 0.6); // 60% to pass
            const xpEarned = passed ? 15 * score : 5;

            // Update quiz record
            await dynamo.send(new UpdateItemCommand({
                TableName: 'veda-quizzes',
                Key: { lessonId: { S: lessonId }, userId: { S: userId } },
                UpdateExpression: 'SET completed = :t, score = :s, xpEarned = :x, completedAt = :d',
                ExpressionAttributeValues: {
                    ':t': { BOOL: true },
                    ':s': { N: score.toString() },
                    ':x': { N: xpEarned.toString() },
                    ':d': { S: new Date().toISOString() },
                },
            }));

            // Push XP update via WebSocket
            if (passed) {
                await pushToUser(userId, {
                    type: 'progress',
                    data: { xpDelta: xpEarned, quizPassed: true, concept },
                }).catch(() => { });
            }

            return {
                statusCode: 200, headers,
                body: JSON.stringify({ score, total, passed, xpEarned }),
            };
        } catch (err) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
        }
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
};
