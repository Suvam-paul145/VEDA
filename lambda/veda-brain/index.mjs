/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         VEDA Brain — Lambda Handler v3.0                         ║
 * ║         AWS Bharat Hackathon                                     ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  ROUTING:                                                        ║
 * ║  companion → Gemini 2.5 Flash (free, 250 req/day)                ║
 * ║  analyze   → OpenRouter → claude-haiku-4-5 (free credits)        ║
 * ║  diagram   → OpenRouter → claude-haiku-4-5 (free credits)        ║
 * ║  deep      → OpenRouter → claude-sonnet-4-5 (free credits)       ║
 * ║  fallback  → OpenRouter → llama-3.3-70b:free (100% free)         ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  WHY OPENROUTER:                                                  ║
 * ║  • No AWS Bedrock marketplace subscription needed                 ║
 * ║  • OpenAI-compatible API format — simple fetch() call            ║
 * ║  • 39+ completely free models as fallback                        ║
 * ║  • Single API key for all models                                  ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  SECRETS MANAGER ENV VARS NEEDED:                                 ║
 * ║  OPENROUTER_SECRET_ARN → {"OPENROUTER_API_KEY":"sk-or-v1-..."}   ║
 * ║  GEMINI_SECRET_ARN     → {"GEMINI_API_KEY":"AIzaSy..."}          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

// ─── Secrets Manager client ───────────────────────────────────────────────────
const smClient = new SecretsManagerClient({ region: "us-east-1" });

// ─── Key cache — loaded once on cold start, reused on every warm start ─────────
let _openrouterKey = null;
let _geminiKey     = null;

async function loadKeys() {
  await Promise.all([
    loadSecret("OPENROUTER_SECRET_ARN", "OPENROUTER_API_KEY", (v) => { _openrouterKey = v; }, "OpenRouter"),
    loadSecret("GEMINI_SECRET_ARN",     "GEMINI_API_KEY",     (v) => { _geminiKey = v; },     "Gemini"),
  ]);
}

async function loadSecret(envVar, jsonField, setter, label) {
  if (setter._loaded) return;
  const arn = process.env[envVar];
  if (!arn) { console.warn(`[VEDA] ${envVar} not set — ${label} disabled`); return; }
  try {
    const res    = await smClient.send(new GetSecretValueCommand({ SecretId: arn }));
    const parsed = JSON.parse(res.SecretString);
    const value  = parsed[jsonField];
    if (!value) {
      console.error(`[VEDA] Secret loaded but field "${jsonField}" missing. Check your secret JSON.`);
      return;
    }
    setter(value);
    setter._loaded = true;
    console.log(`[VEDA] ${label} key loaded ✅`);
  } catch (e) {
    console.error(`[VEDA] Failed to load ${label} key:`, e.message);
  }
}

// ─── OpenRouter config ────────────────────────────────────────────────────────
// OpenRouter uses OpenAI-compatible format: POST /v1/chat/completions
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Model IDs — prefix "anthropic/" for Claude models via OpenRouter
// ":free" suffix = completely free, zero credits needed (Llama fallback)
const OR_MODELS = {
  fast:     "anthropic/claude-haiku-4-5",          // Haiku — fast, cheap credits
  best:     "anthropic/claude-sonnet-4-5",         // Sonnet — deep analysis
  free:     "meta-llama/llama-3.3-70b-instruct:free", // 100% free fallback
};

// ─── Gemini config ────────────────────────────────────────────────────────────
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ─── Deep-escalation keywords ─────────────────────────────────────────────────
const DEEP_TRIGGERS = [
  "production", "race condition", "memory leak", "intermittent",
  "sometimes fails", "flaky", "concurrency", "deadlock",
  "out of memory", "random crash", "only in prod", "heap",
];

// ─── System Prompts ───────────────────────────────────────────────────────────
const COMPANION_PROMPT = `You are VEDA, a real-time code watcher inside VSCode.
Scan the code for issues. Be fast — under 150 tokens total.
Return ONLY valid JSON. No markdown. No backticks. First char { last char }.

{
  "has_issue": true or false,
  "severity": "critical" | "high" | "medium" | "low" | "none",
  "bug_type": "null_reference" | "async_issue" | "syntax_error" | "logic_error" | "type_error" | "security" | "performance" | "none",
  "hint": "One short sentence. Empty string if no issue.",
  "voice_response": "One spoken sentence. Empty string if no issue."
}`;

const ANALYSIS_PROMPT = `You are VEDA, an expert AI debugging assistant inside VSCode.
Find bugs, explain them clearly, produce a Mermaid diagram, and suggest a fix.

STRICT OUTPUT RULES:
1. Output ONLY a valid JSON object — nothing else
2. First character must be {  Last character must be }
3. No markdown, no backticks, no prose before or after JSON
4. mermaid_diagram: use literal \\n for line breaks (two chars, not actual newline)

JSON structure:
{
  "explanation": "2-3 sentences: what the bug is and its impact on the program",
  "severity": "critical" | "high" | "medium" | "low" | "none",
  "bug_type": "null_reference" | "async_issue" | "syntax_error" | "logic_error" | "type_error" | "security" | "performance" | "none",
  "root_cause": "One precise sentence: the mechanical reason this bug occurs",
  "mermaid_diagram": "flowchart TD\\n A[Start] --> B[Step]\\n B --> C{Decision?}\\n C -->|Bug path| D[❌ Error]\\n C -->|Good path| E[✅ OK]",
  "fix_code": "Corrected code only — no comments or explanation",
  "fix_explanation": "1-2 sentences: why this fix resolves the root cause",
  "voice_response": "2 spoken sentences: what the bug is, then what the fix does"
}

If no bug found: severity=none, bug_type=none, mermaid shows success flow, fix_code="".`;

const DEEP_PROMPT = `You are VEDA performing deep root-cause analysis on a complex bug.
Race conditions, memory leaks, intermittent failures, heap issues.

STRICT: Only JSON. First char {. Last char }. No markdown. \\n for mermaid newlines.

{
  "explanation": "3-5 sentences including runtime behaviour and edge cases",
  "severity": "critical" | "high" | "medium" | "low",
  "bug_type": "null_reference" | "async_issue" | "logic_error" | "type_error" | "security" | "performance",
  "root_cause": "2-3 sentences: mechanical reason including timing and state conditions",
  "mermaid_diagram": "Detailed flowchart showing full error propagation. Use \\n for newlines.",
  "fix_code": "Complete corrected code for the affected function or block",
  "fix_explanation": "3-4 sentences: rationale, trade-offs, edge cases to watch",
  "voice_response": "3 spoken sentences for a senior developer discussion"
}`;

// ─── Main Handler ─────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return ok({});

  // Load both API keys on cold start (cached on warm start — no extra latency)
  await loadKeys();

  const t0 = Date.now();

  try {
    const body = JSON.parse(event.body || "{}");
    const {
      code     = "",
      question = "What bugs do you see in this code?",
      language = "javascript",
      mode     = "analyze",
    } = body;

    if (!code && !question) {
      return clientErr("Provide at least 'code' or 'question' in the request body.");
    }

    // Auto-escalate to deep analysis on production complexity keywords
    const shouldEscalate = DEEP_TRIGGERS.some((kw) => question.toLowerCase().includes(kw));
    const effectiveMode  = shouldEscalate ? "deep" : mode;

    let result;

    if (effectiveMode === "companion") {
      // Companion: try Gemini first (fastest, free), fall back to OpenRouter
      result = _geminiKey
        ? await callGemini(code, language, t0)
        : await callOpenRouter(code, question, language, "analyze", false, t0);
    } else {
      result = await callOpenRouter(code, question, language, effectiveMode, shouldEscalate, t0);
    }

    return ok(result);

  } catch (e) {
    console.error("[VEDA Error]", e.name, e.message);
    return handleError(e);
  }
};

// ─── Gemini 2.5 Flash ─────────────────────────────────────────────────────────
async function callGemini(code, language, t0) {
  const userText = `Language: ${language}\nCode:\n\`\`\`${language}\n${code.slice(0, 3000)}\n\`\`\``;

  let res;
  try {
    res = await fetch(`${GEMINI_URL}?key=${_geminiKey}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents:          [{ parts: [{ text: userText }] }],
        systemInstruction: { parts: [{ text: COMPANION_PROMPT }] },
        generationConfig:  {
          temperature:      0.05,
          maxOutputTokens:  300,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch (netErr) {
    console.warn("[VEDA] Gemini network error → OpenRouter fallback:", netErr.message);
    return callOpenRouter(code, "Quick bug check", language, "analyze", false, t0);
  }

  if (!res.ok) {
    console.warn("[VEDA] Gemini HTTP", res.status, "→ OpenRouter fallback");
    return callOpenRouter(code, "Quick bug check", language, "analyze", false, t0);
  }

  const data    = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  return {
    ...safeJsonParse(rawText),
    _meta: {
      provider:   "Google",
      model:      GEMINI_MODEL,
      mode:       "companion",
      latency_ms: Date.now() - t0,
    },
  };
}

// ─── OpenRouter (OpenAI-compatible format) ────────────────────────────────────
// OpenRouter accepts: POST /v1/chat/completions
// Headers: Authorization: Bearer sk-or-v1-...
// Body: { model, messages: [{role, content}], max_tokens, temperature }
// Response: choices[0].message.content  ← same as OpenAI
async function callOpenRouter(code, question, language, mode, escalated, t0) {
  if (!_openrouterKey) {
    console.error("[VEDA] OpenRouter key not loaded");
    return noKeyResponse("OpenRouter");
  }

  // Choose model: Sonnet for deep, Haiku for everything else
  const model     = mode === "deep" ? OR_MODELS.best : OR_MODELS.fast;
  const maxTokens = { analyze: 700, diagram: 300, deep: 1200 }[mode] ?? 700;
  const system    = mode === "deep" ? DEEP_PROMPT : ANALYSIS_PROMPT;

  const userContent = code
    ? `Language: ${language}\nCode:\n\`\`\`${language}\n${code.slice(0, 6000)}\n\`\`\`\n\nQuestion: ${question}`
    : `Question: ${question}`;

  // Try primary model, fall back to free Llama if rate-limited or credits empty
  for (const attemptModel of [model, OR_MODELS.free]) {
    try {
      const result = await fetchOpenRouter(attemptModel, system, userContent, maxTokens, mode, escalated, t0);
      return result;
    } catch (e) {
      if (
        e.name === "ThrottlingException" ||
        e.name === "InsufficientCredits" ||
        (e.status >= 429 && attemptModel !== OR_MODELS.free)
      ) {
        console.warn(`[VEDA] ${attemptModel} throttled/out of credits → trying free Llama fallback`);
        continue;
      }
      throw e;
    }
  }

  return serverErr("All OpenRouter models unavailable. Retry in a few minutes.");
}

async function fetchOpenRouter(model, system, userContent, maxTokens, mode, escalated, t0) {
  const res = await fetch(OPENROUTER_URL, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${_openrouterKey}`,
      "HTTP-Referer":  "https://github.com/Suvam-paul145/VEDA",  // Required by OpenRouter
      "X-Title":       "VEDA Debugging Assistant",                 // Shows in OpenRouter dashboard
    },
    body: JSON.stringify({
      model,
      max_tokens:  maxTokens,
      temperature: 0.05,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const errMsg  = errBody?.error?.message ?? "OpenRouter API error";
    console.error(`[VEDA] OpenRouter ${res.status}:`, errMsg);

    const e    = new Error(errMsg);
    e.status   = res.status;
    e.name     = res.status === 429 ? "ThrottlingException"   :
                 res.status === 402 ? "InsufficientCredits"    :
                 res.status === 401 ? "AccessDeniedException"  :
                                      "OpenRouterAPIError";
    throw e;
  }

  const data    = await res.json();
  const rawText = data?.choices?.[0]?.message?.content ?? "{}";

  return {
    ...safeJsonParse(rawText),
    _meta: {
      provider:   "OpenRouter",
      model,
      mode,
      escalated:  !!escalated,
      latency_ms: Date.now() - t0,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function noKeyResponse(provider) {
  return {
    explanation:     `${provider} API key not loaded. Check Secrets Manager ARN in Lambda env vars.`,
    severity:        "none",
    bug_type:        "none",
    root_cause:      "",
    mermaid_diagram: `flowchart TD\n A[VEDA] --> B[⚠️ No ${provider} Key]`,
    fix_code:        "",
    fix_explanation: "",
    voice_response:  `${provider} API key is not configured.`,
    _meta:           { provider: "none", error: "missing_key" },
  };
}

// ─── Safe JSON Parser ─────────────────────────────────────────────────────────
function safeJsonParse(text) {
  if (!text) return {};

  // Attempt 1: direct parse
  try { return JSON.parse(text); } catch (_) {}

  // Attempt 2: strip markdown fences
  const stripped = text
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(stripped); } catch (_) {}

  // Attempt 3: extract first {...} block
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch (_) {} }

  console.error("[VEDA] Cannot parse model output:", text.slice(0, 200));
  return {
    explanation:     "Analysis complete but response format unexpected. Please try again.",
    severity:        "none",
    bug_type:        "none",
    root_cause:      "",
    mermaid_diagram: "flowchart TD\n A[Analysis] --> B[⚠️ Parse Error]",
    fix_code:        "",
    fix_explanation: "",
    voice_response:  "I analyzed your code but had a formatting issue. Please try once more.",
  };
}

// ─── Response Builders ────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Content-Type":                 "application/json",
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Api-Key, Authorization",
};

const ok        = (body) => ({ statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(body) });
const clientErr = (msg)  => ({ statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: msg }) });
const serverErr = (msg)  => ({ statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: msg }) });

function handleError(e) {
  const map = {
    AccessDeniedException: [401, "OpenRouter API key invalid. Check your key in Secrets Manager."],
    InsufficientCredits:   [402, "OpenRouter credits exhausted. Free Llama fallback also failed."],
    ThrottlingException:   [429, "Rate limit hit. Wait 60 seconds and retry."],
    OpenRouterAPIError:    [502, `OpenRouter error: ${e.message}`],
  };
  const [code, msg] = map[e.name] ?? [500, `Unexpected error: ${e.message}`];
  return { statusCode: code, headers: CORS_HEADERS, body: JSON.stringify({ error: msg, type: e.name }) };
}
