// lib/openrouter.js
const fetch = require('node-fetch');

async function callOpenRouter({ model, systemPrompt, userPrompt, maxTokens = 500 }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://veda-learn.app',
      'X-Title': 'Veda Learn'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${err}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

module.exports = { callOpenRouter };