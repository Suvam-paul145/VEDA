const { callOpenRouter } = require('../lib/openrouter');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

// Auth guard helper
function verifyToken(event) {
    const auth = event.headers?.Authorization || event.headers?.authorization || '';
    const token = auth.replace('Bearer ', '');
    return jwt.verify(token, process.env.JWT_SECRET); // throws if invalid
}

module.exports.handler = async (event) => {
    let userId;
    try {
        ({ userId } = verifyToken(event));
    } catch {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const { fileContent, language } = JSON.parse(event.body || '{}');
    if (!fileContent || !language) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing fileContent or language' }) };
    }

    try {
        const result = await callOpenRouter({
            model: 'anthropic/claude-haiku-4-5',
            systemPrompt: 'You are a code quality analyzer. Respond ONLY with valid JSON, no other text, no code fences.',
            userPrompt: `Analyze this ${language} code snippet. Return ONLY this JSON:
{"isMistake":true|false,"confidence":0.0-1.0,"mistakeType":"antipattern"|"bug"|"security"|"performance"|"style",
"conceptId":"mutable-default"|"callback-hell"|"any-type"|"null-ref"|"n-plus-one"|"sql-injection"|"memory-leak"|"dry-violation",
"severity":"low"|"medium"|"high","problematicCode":"the exact bad snippet","lineNumber":1}
If no mistake found return {"isMistake":false,"confidence":0}. Only flag if confidence >= 0.85.
Code:
${fileContent.slice(0, 3000)}`,
            maxTokens: 300
        });

        const parsed = JSON.parse(result);

        if (!parsed.isMistake || parsed.confidence < 0.85) {
            return { statusCode: 200, body: JSON.stringify({ teach: false }) };
        }

        // Save to DynamoDB
        const mistakeId = uuidv4();
        await ddb.send(new PutCommand({
            TableName: 'veda-mistakes',
            Item: {
                mistakeId, userId, language,
                mistakeType: parsed.mistakeType,
                conceptId: parsed.conceptId,
                severity: parsed.severity,
                confidence: parsed.confidence,
                problematicCode: parsed.problematicCode,
                lineNumber: parsed.lineNumber || 0,
                createdAt: new Date().toISOString()
            }
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ teach: true, mistakeId, ...parsed })
        };

    } catch (err) {
        console.error('Analyze error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};