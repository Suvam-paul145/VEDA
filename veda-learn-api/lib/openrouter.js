'use strict';

const https = require('https');

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

/**
 * Make a chat completion call to OpenRouter.
 * Supports claude-haiku, claude-sonnet, gemini-flash as fallbacks.
 *
 * @param {object} opts
 * @param {string} opts.model      - e.g. 'anthropic/claude-3-haiku-20240307'
 * @param {Array}  opts.messages   - OpenAI-format messages array
 * @param {number} [opts.maxTokens]
 * @param {number} [opts.temperature]
 * @returns {Promise<string>}      - The text content of the first choice
 */
async function chatCompletion({ model, messages, maxTokens = 1500, temperature = 0.4 }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const body = JSON.stringify({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    // OpenRouter attribution headers
    transforms: [],
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      `${OPENROUTER_BASE}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer':  'https://talk-with-veda.vercel.app',
          'X-Title':       'Veda Learn',
        },
      },
      (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            console.error(`OpenRouter ${res.statusCode}: ${data}`);
            return reject(new Error(`OpenRouter ${res.statusCode}: ${data}`));
          }
          try {
            const json = JSON.parse(data);
            if (!json.choices || !json.choices[0] || !json.choices[0].message) {
              throw new Error('Invalid response format from OpenRouter');
            }
            resolve(json.choices[0].message.content);
          } catch (e) {
            console.error('OpenRouter parse error:', e.message, 'Response:', data);
            reject(new Error(`OpenRouter parse error: ${e.message}`));
          }
        });
      }
    );
    req.on('error', (err) => {
      console.error('OpenRouter request error:', err.message);
      reject(err);
    });
    req.write(body);
    req.end();
  });
}

/**
 * Run multiple prompts in parallel — used by lesson.js for
 * explanation + code-fix + concept-diagram in one go.
 */
async function parallelCompletion(requests) {
  return Promise.all(requests.map(chatCompletion));
}

// Model aliases for convenience
const MODELS = {
  HAIKU:  'anthropic/claude-3-haiku-20240307',
  SONNET: 'anthropic/claude-3-5-sonnet-20241022',
  FLASH:  'google/gemini-flash-1.5',     // Cheap fallback
  GPT4O_MINI: 'openai/gpt-4o-mini',     // Fallback option
};

module.exports = { chatCompletion, parallelCompletion, MODELS };