// handlers/doubt.js — AI Doubt/Chat handler using OpenRouter

const jwt = require('jsonwebtoken');
const { chatCompletion, MODELS } = require('../lib/openrouter');

/**
 * POST /api/doubt
 * Context-aware AI chat for code questions
 * 
 * Body: { question, codeContext, language }
 * Returns: { answer }
 */
module.exports.handler = async (event) => {
  console.log('[doubt] Request received');

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // 1. Auth
  const token = event.headers?.Authorization?.replace('Bearer ', '') || event.headers?.authorization?.replace('Bearer ', '');
  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized - No token provided' }),
    };
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId || decoded.sub || decoded.id;
  } catch (err) {
    console.error('[doubt] JWT verification failed:', err.message);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized - Invalid token' }),
    };
  }

  // 2. Parse request
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const { question, codeContext = '', language = 'javascript' } = body;

  if (!question || question.trim().length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Question is required' }),
    };
  }

  console.log(`[doubt] User ${userId} asking: "${question.substring(0, 50)}..."`);

  // 3. Build context-aware prompt
  const systemPrompt = `You are Veda, an AI coding tutor. Answer the user's question about their code concisely and clearly.
Focus on practical explanations with examples. Keep responses under 200 words.
If code is provided, reference specific lines or patterns.`;

  const userPrompt = codeContext
    ? `Language: ${language}

Code context:
\`\`\`${language}
${codeContext.substring(0, 1000)}
\`\`\`

Question: ${question}`
    : `Question about ${language}: ${question}`;

  // 4. Call OpenRouter with Claude Haiku for fast responses
  try {
    const answer = await chatCompletion({
      model: MODELS.HAIKU,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 300,
    });

    console.log('[doubt] Answer generated successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ answer }),
    };
  } catch (err) {
    console.error('[doubt] OpenRouter error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate answer',
        message: err.message,
      }),
    };
  }
};
