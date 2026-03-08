// veda-learn-api/lib/openrouter.js
'use strict';

const https = require('https');

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

/**
 * Make a chat completion call to OpenRouter.
 * Supports claude-haiku, claude-sonnet, gemini-flash as fallbacks.
 *
 * @param {object} opts
 * @param {string} opts.model      - e.g. 'anthropic/claude-haiku-4-5'
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
        transforms: [],
    });

    return new Promise((resolve, reject) => {
        const req = https.request(
            `${OPENROUTER_BASE}/chat/completions`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://vedalearn.com',
                    'X-Title': 'Veda Learn',
                },
            },
            (res) => {
                let data = '';
                res.on('data', chunk => (data += chunk));
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        return reject(new Error(`OpenRouter ${res.statusCode}: ${data}`));
                    }
                    try {
                        const json = JSON.parse(data);
                        resolve(json.choices[0].message.content);
                    } catch (e) {
                        reject(new Error(`OpenRouter parse error: ${e.message}`));
                    }
                });
            }
        );
        req.on('error', reject);
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
    HAIKU: 'anthropic/claude-haiku-4-5',
    SONNET: 'anthropic/claude-sonnet-4-6',
    FLASH: 'google/gemini-flash-1.5',     // Cheap fallback
};

module.exports = { chatCompletion, parallelCompletion, MODELS };
