// veda-learn-api/handlers/lesson.js
'use strict';

const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { chatCompletion, parallelCompletion, MODELS } = require('../lib/openrouter');
const { synthesizeLessonSafe } = require('../lib/polly');
const { pushToUser } = require('../lib/websocket');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

// ─── System prompt shared across all 3 lesson calls ───────────────────────────
const SYSTEM = `You are Veda, an expert programming tutor. Your lessons are:
- Concise (200-300 words max for explanation)
- Actionable (always show before AND after code)  
- Memorable (use an analogy or mental model)
- Friendly but precise — like a senior dev doing a code review
Always respond in the exact JSON format requested. No markdown wrapping.`;

// ─── Prompt builders ───────────────────────────────────────────────────────────

function buildExplanationPrompt(concept, code, language) {
    return {
        model: MODELS.SONNET,
        messages: [
            { role: 'system', content: SYSTEM },
            {
                role: 'user',
                content: `
Generate a lesson for the concept: "${concept}"
Language: ${language}
Student's code that triggered this:
\`\`\`${language}
${code}
\`\`\`

Respond with ONLY this JSON (no markdown):
{
  "title": "Short lesson title (5-7 words)",
  "severity": "bug|antipattern|performance|style",
  "explanation": "2-3 paragraph explanation with an analogy. Plain text, no markdown.",
  "whyItMatters": "One sentence on real-world impact.",
  "audioText": "What Polly should speak aloud (same as explanation but optimized for listening — no code, no symbols)."
}`,
            },
        ],
        maxTokens: 800,
    };
}

function buildCodeFixPrompt(concept, code, language) {
    return {
        model: MODELS.SONNET,
        messages: [
            { role: 'system', content: SYSTEM },
            {
                role: 'user',
                content: `
Show a before/after code fix for the concept: "${concept}"
Language: ${language}
Student's code:
\`\`\`${language}
${code}
\`\`\`

Respond with ONLY this JSON (no markdown):
{
  "codeBefore": "The problematic code snippet (max 15 lines)",
  "codeAfter": "The fixed code snippet (max 15 lines)",
  "diffHighlights": ["line 3: changed X to Y", "added null check on line 5"],
  "keyChange": "One sentence describing the most important change."
}`,
            },
        ],
        maxTokens: 600,
    };
}

function buildQuizPrompt(concept, language) {
    return {
        model: MODELS.HAIKU,
        messages: [
            { role: 'system', content: SYSTEM },
            {
                role: 'user',
                content: `
Generate exactly 3 multiple-choice quiz questions to test understanding of: "${concept}" in ${language}.

Rules:
- Question 1: conceptual understanding
- Question 2: identify the bug in code
- Question 3: best practice / real-world scenario
- Each question: 1 correct answer, 3 distractors
- Distractors must be plausible — not obviously wrong

Respond with ONLY this JSON (no markdown):
{
  "questions": [
    {
      "question": "Question text",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answerIndex": 0,
      "explanation": "Why this answer is correct (1-2 sentences)."
    }
  ]
}`,
            },
        ],
        maxTokens: 700,
    };
}

// ─── Main handler ──────────────────────────────────────────────────────────────

module.exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Content-Type': 'application/json',
    };

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const { mistakeId, userId, concept, code, language = 'python', confidence } = body;

    if (!userId || !concept || !code) {
        return {
            statusCode: 400, headers,
            body: JSON.stringify({ error: 'Required: userId, concept, code' }),
        };
    }

    console.log(`[lesson] Generating for userId=${userId} concept=${concept}`);
    const lessonId = uuidv4();
    const startTime = Date.now();

    try {
        // ── STEP 1: Run 3 parallel AI calls ──────────────────────────────────────
        console.log('[lesson] Firing 3 parallel AI calls…');
        const [explanationRaw, codeFixRaw, quizRaw] = await parallelCompletion([
            buildExplanationPrompt(concept, code, language),
            buildCodeFixPrompt(concept, code, language),
            buildQuizPrompt(concept, language),
        ]);

        // ── STEP 2: Parse responses ───────────────────────────────────────────────
        let explanation, codeFix, quiz;
        try {
            explanation = JSON.parse(explanationRaw);
            codeFix = JSON.parse(codeFixRaw);
            quiz = JSON.parse(quizRaw);
        } catch (parseErr) {
            console.error('[lesson] JSON parse error:', parseErr.message);
            console.error('explanationRaw:', explanationRaw);
            console.error('codeFixRaw:', codeFixRaw);
            console.error('quizRaw:', quizRaw);
            throw new Error('AI response was not valid JSON');
        }

        // ── STEP 3: Synthesize audio ──────────────────────────────────────────────
        console.log('[lesson] Synthesizing audio with Polly…');
        const audioUrl = await synthesizeLessonSafe(
            explanation.audioText || explanation.explanation,
            lessonId,
            userId
        );

        // ── STEP 4: Build lesson payload ──────────────────────────────────────────
        const lesson = {
            lessonId,
            mistakeId: mistakeId || null,
            concept,
            language,
            confidence: confidence || 0,
            title: explanation.title,
            severity: explanation.severity || 'antipattern',
            explanation: explanation.explanation,
            whyItMatters: explanation.whyItMatters,
            codeBefore: codeFix.codeBefore,
            codeAfter: codeFix.codeAfter,
            diffHighlights: codeFix.diffHighlights || [],
            keyChange: codeFix.keyChange,
            audioUrl: audioUrl || null,   // null → frontend uses Web Speech API
            generatedAt: new Date().toISOString(),
            generationMs: Date.now() - startTime,
        };

        // ── STEP 5: Store lesson + quiz in DynamoDB ───────────────────────────────
        console.log('[lesson] Saving to DynamoDB…');
        await Promise.all([
            dynamo.send(new PutItemCommand({
                TableName: 'veda-lessons',
                Item: {
                    lessonId: { S: lesson.lessonId },
                    userId: { S: userId },
                    mistakeId: { S: lesson.mistakeId || '' },
                    concept: { S: concept },
                    language: { S: language },
                    title: { S: lesson.title },
                    explanation: { S: lesson.explanation },
                    audioUrl: { S: lesson.audioUrl || '' },
                    deliveredAt: { S: lesson.generatedAt },
                    gotIt: { BOOL: false },
                    deepDive: { BOOL: false },
                },
            })),
            dynamo.send(new PutItemCommand({
                TableName: 'veda-quizzes',
                Item: {
                    quizId: { S: uuidv4() },
                    lessonId: { S: lessonId },
                    userId: { S: userId },
                    concept: { S: concept },
                    questions: { S: JSON.stringify(quiz.questions) },
                    createdAt: { S: new Date().toISOString() },
                    completed: { BOOL: false },
                },
            })),
        ]);

        // ── STEP 6: Push lesson + quiz to browser via WebSocket ───────────────────
        console.log('[lesson] Pushing to WebSocket…');
        await pushToUser(userId, {
            type: 'lesson',
            data: lesson,
        });

        // Push quiz 3s after lesson so the UI can animate the lesson in first
        setTimeout(async () => {
            try {
                await pushToUser(userId, {
                    type: 'quiz',
                    data: { lessonId, concept, questions: quiz.questions },
                });
            } catch (e) {
                console.error('[lesson] Delayed quiz push failed:', e.message);
            }
        }, 3000);

        console.log(`[lesson] ✅ Complete in ${Date.now() - startTime}ms`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, lessonId, lesson }),
        };

    } catch (err) {
        console.error('[lesson] Fatal error:', err);

        // Push error to user so they see feedback in the UI
        await pushToUser(userId, {
            type: 'error',
            data: { message: 'Lesson generation failed. Try again in a moment.' },
        }).catch(() => { });

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message }),
        };
    }
};

// Deep-dive handler stub — referenced by serverless.yml lessonDeep function
module.exports.deepHandler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Content-Type': 'application/json',
    };
    // Reuse the main lesson handler for deep dives (same logic, different depth)
    return module.exports.handler(event);
};
