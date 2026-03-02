/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           VEDA Brain — Lambda Handler v1.1                   ║
 * ║           AWS Bharat Hackathon                               ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Routing Strategy:                                           ║
 * ║  companion → GCP Gemini 2.0 Flash  (~400ms, free, 1500 RPM) ║
 * ║  analyze   → Claude 3.5 Sonnet CRIS (~1.5s, best quality)   ║
 * ║  diagram   → Claude 3.5 Haiku CRIS  (~600ms, fast + cheap)  ║
 * ║  deep      → Claude 3 Opus CRIS     (~3-5s, max reasoning)  ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Gemini key fetched from AWS Secrets Manager at cold start   ║
 * ║  Cached in module scope — never fetched twice on warm start  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

// ─────────────────────────────────────────────────────────────────────────────
// AWS Clients
// ─────────────────────────────────────────────────────────────────────────────
const bedrockClient       = new BedrockRuntimeClient({ region: "us-east-1" });
const secretsManagerClient = new SecretsManagerClient({ region: "us-east-1" });

// ─────────────────────────────────────────────────────────────────────────────
// Gemini key — fetched from Secrets Manager ONCE per cold start, then cached.
// Lambda env var GEMINI_SECRET_ARN holds the ARN of the secret.
// ─────────────────────────────────────────────────────────────────────────────
let _geminiKey = null;   // module-level cache

async function getGeminiKey() {
  if (_geminiKey) return _geminiKey;   // warm start → return cached

  const secretArn = process.env.GEMINI_SECRET_ARN;
  if (!secretArn) {
    console.warn("[VEDA] GEMINI_SECRET_ARN env var not set — companion mode will use Haiku fallback");
    return null;
  }

  try {
    const cmd = new GetSecretValueCommand({ SecretId: secretArn });
    const res = await secretsManagerClient.send(cmd);
    const parsed = JSON.parse(res.SecretString);
    _geminiKey = parsed.GEMINI_API_KEY;
    console.log("[VEDA] Gemini key loaded from Secrets Manager ✅");
    return _geminiKey;
  } catch (err) {
    console.error("[VEDA] Failed to load Gemini key from Secrets Manager:", err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Model IDs  (CRIS = "us." prefix → 3× effective Bedrock quota for free)
// Use 3.5 Sonnet NOT Claude 4.x (4.x has 5× output token burndown penalty)
// ─────────────────────────────────────────────────────────────────────────────
const MODELS = {
  companion_fallback: process.env.MODEL_COMPANION_ID || "us.anthropic.claude-3-5-haiku-20241022-v1:0",
  analyze:            process.env.MODEL_ANALYZE_ID   || "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
  diagram:            process.env.MODEL_DIAGRAM_ID   || "us.anthropic.claude-3-5-haiku-20241022-v1:0",
  deep:               process.env.MODEL_DEEP_ID      || "us.anthropic.claude-3-opus-20240229-v1:0",
};

const GEMINI_MODEL = "gemini-2.0-flash";

// ─────────────────────────────────────────────────────────────────────────────
// Keywords that auto-escalate the request to Claude Opus (deep reasoning)
// ─────────────────────────────────────────────────────────────────────────────
const DEEP_TRIGGERS = [
  "production", "race condition", "memory leak", "intermittent",
  "sometimes fails", "flaky", "concurrency", "deadlock",
  "out of memory", "random crash", "only in prod", "heap",
];

// ─────────────────────────────────────────────────────────────────────────────
// System Prompts
// ─────────────────────────────────────────────────────────────────────────────
const COMPANION_PROMPT = `You are VEDA, a real-time code watcher inside VSCode.
Scan the code for issues. Be fast — under 150 tokens total.
Return ONLY valid JSON. No markdown. No backticks. No text outside JSON.
First character must be { and last must be }.

{
  "has_issue": true or false,
  "severity": "critical" or "high" or "medium" or "low" or "none",
  "bug_type": "null_reference" or "async_issue" or "syntax_error" or "logic_error" or "type_error" or "security" or "performance" or "none",
  "hint": "One short sentence for an inline hint. Empty string if no issue.",
  "voice_response": "One spoken sentence. Empty string if no issue."
}`;

const ANALYSIS_PROMPT = `You are VEDA, an expert AI debugging assistant inside VSCode.
Find bugs, explain them clearly, produce a Mermaid diagram, and suggest a fix.

STRICT OUTPUT RULES:
1. Output ONLY a valid JSON object — nothing else
2. First character must be {  |  Last character must be }
3. No markdown, no backticks, no prose before or after JSON
4. For mermaid_diagram: use literal \\n (two chars) for line breaks, NOT actual newlines

JSON structure:
{
  "explanation": "2-3 sentences: what the bug is and its impact on the program",
  "severity": "critical" or "high" or "medium" or "low" or "none",
  "bug_type": "null_reference" or "async_issue" or "syntax_error" or "logic_error" or "type_error" or "security" or "performance" or "none",
  "root_cause": "One precise sentence: the mechanical reason this bug occurs",
  "mermaid_diagram": "flowchart TD\\n A[Start] --> B[Step]\\n B --> C{Decision}\\n C -->|bad path| D[❌ Error]\\n C -->|good path| E[✅ OK]",
  "fix_code": "Corrected code only — no comments or explanation inside this field",
  "fix_explanation": "1-2 sentences: why this fix resolves the root cause",
  "voice_response": "2 sentences spoken aloud: what the bug is, then what the fix does"
}

If no bug: severity=none, bug_type=none, mermaid shows success flow, fix_code="".`;

const DEEP_PROMPT = `You are VEDA performing deep root-cause analysis on a complex or production bug.
This is for race conditions, memory leaks, intermittent failures, heap issues.

STRICT OUTPUT RULES — same as standard:
Only JSON. First char {. Last char }. No markdown. \\n for newlines in mermaid.

{
  "explanation": "3-5 sentences including runtime behaviour and edge cases",
  "severity": "critical" or "high" or "medium" or "low",
  "bug_type": "null_reference" or "async_issue" or "logic_error" or "type_error" or "security" or "performance",
  "root_cause": "2-3 sentences: precise mechanical reason including timing and state conditions",
  "mermaid_diagram": "Detailed Mermaid flowchart showing full error propagation with timing/state. Use \\n for newlines.",
  "fix_code": "Complete corrected code for the affected function or block",
  "fix_explanation": "3-4 sentences: fix rationale, why it works, trade-offs, edge cases to watch",
  "voice_response": "3 spoken sentences suitable for a senior developer discussion"
}`;

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────
export const handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return buildResponse(200, {});
  }

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
      return buildResponse(400, { error: "Provide at least code or a question." });
    }

    // Auto-escalate if question contains production-complexity keywords
    const shouldEscalate = DEEP_TRIGGERS.some((kw) =>
      question.toLowerCase().includes(kw)
    );
    const effectiveMode = shouldEscalate ? "deep" : mode;

    let result;

    if (effectiveMode === "companion") {
      // Try Gemini first (fastest); falls back to Haiku if key unavailable
      const geminiKey = await getGeminiKey();
      if (geminiKey) {
        result = await callGemini(code, language, geminiKey, t0);
      } else {
        result = await callBedrock(code, question, language, "companion_fallback", false, t0);
      }
    } else {
      result = await callBedrock(code, question, language, effectiveMode, shouldEscalate, t0);
    }

    return buildResponse(200, result);

  } catch (err) {
    console.error("[VEDA Error]", err.name, err.message);
    return handleError(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GCP Gemini 2.0 Flash  (companion mode — fastest, free)
// ─────────────────────────────────────────────────────────────────────────────
async function callGemini(code, language, geminiKey, t0) {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;
  const userText  = `Language: ${language}\nCode:\n\`\`\`${language}\n${code.slice(0, 3000)}\n\`\`\``;

  let res;
  try {
    res = await fetch(geminiUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents:          [{ parts: [{ text: userText }] }],
        systemInstruction: { parts: [{ text: COMPANION_PROMPT }] },
        generationConfig:  {
          temperature:      0.05,
          maxOutputTokens:  250,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch (networkErr) {
    console.warn("[VEDA] Gemini network error → falling back to Haiku:", networkErr.message);
    return callBedrock(code, "Quick bug check", language, "companion_fallback", false, t0);
  }

  // Fixed: was incorrectly referencing `response` (function name) instead of `res`
  if (!res.ok) {
    console.warn("[VEDA] Gemini HTTP", res.status, "→ falling back to Haiku");
    return callBedrock(code, "Quick bug check", language, "companion_fallback", false, t0);
  }

  const data    = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed  = safeJsonParse(rawText);

  return {
    ...parsed,
    _meta: {
      provider:   "GCP",
      model:      GEMINI_MODEL,
      mode:       "companion",
      latency_ms: Date.now() - t0,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AWS Bedrock — Claude via CRIS
// ─────────────────────────────────────────────────────────────────────────────
async function callBedrock(code, question, language, mode, escalated, t0) {
  const modelId = MODELS[mode] ?? MODELS.analyze;

  // CRITICAL: Bedrock deducts max_tokens UPFRONT from quota.
  // Set to realistic output size — not theoretical maximum.
  const maxTokens = {
    companion_fallback: 200,
    diagram:            400,
    analyze:            800,
    deep:              1500,
  }[mode] ?? 800;

  const systemPrompt =
    mode === "deep"               ? DEEP_PROMPT      :
    mode === "companion_fallback" ? COMPANION_PROMPT  :
                                    ANALYSIS_PROMPT;

  const userContent = code
    ? `Language: ${language}\nCode:\n\`\`\`${language}\n${code.slice(0, 8000)}\n\`\`\`\n\nDeveloper question: ${question}`
    : `Developer question: ${question}`;

  const cmd = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept:      "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens:        maxTokens,
      temperature:       0.05,
      system:            systemPrompt,
      messages:          [{ role: "user", content: userContent }],
    }),
  });

  const raw     = await bedrockClient.send(cmd);
  const resBody = JSON.parse(new TextDecoder().decode(raw.body));
  const rawText = resBody?.content?.[0]?.text ?? "{}";
  const parsed  = safeJsonParse(rawText);

  return {
    ...parsed,
    _meta: {
      provider:   "AWS",
      model:      modelId,
      mode,
      escalated:  !!escalated,
      latency_ms: Date.now() - t0,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe JSON Parser
// Handles cases where Claude/Gemini wraps output in markdown despite instructions
// ─────────────────────────────────────────────────────────────────────────────
function safeJsonParse(text) {
  if (!text) return {};

  // Attempt 1 — direct parse
  try { return JSON.parse(text); } catch (_) { /* continue */ }

  // Attempt 2 — strip markdown code fences
  const stripped = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try { return JSON.parse(stripped); } catch (_) { /* continue */ }

  // Attempt 3 — extract first { … } block
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch (_) { /* continue */ } }

  console.error("[VEDA] Cannot parse model output:", text.slice(0, 200));
  return {
    explanation:     "Analysis complete but response could not be parsed. Please try again.",
    severity:        "none",
    bug_type:        "none",
    root_cause:      "",
    mermaid_diagram: "flowchart TD\n A[Analysis] --> B[⚠️ Parse Error]",
    fix_code:        "",
    fix_explanation: "",
    voice_response:  "I analyzed your code but had a formatting issue. Please try once more.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Response Builder — CORS headers on every response
// ─────────────────────────────────────────────────────────────────────────────
function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type":                 "application/json",
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Api-Key, Authorization",
    },
    body: JSON.stringify(body),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Handler — maps AWS SDK error names → useful HTTP responses
// ─────────────────────────────────────────────────────────────────────────────
function handleError(err) {
  const map = {
    AccessDeniedException:       [403, "IAM role missing required permission. Check AmazonBedrockFullAccess and SecretsManager policy."],
    ThrottlingException:         [429, "Bedrock rate limit hit. Wait 10 s and retry."],
    ValidationException:         [400, `Model ID invalid or not enabled in Bedrock Model Access. Detail: ${err.message}`],
    ResourceNotFoundException:   [404, "Model or secret not found. Check Bedrock Model Access and Secrets Manager."],
    ModelNotReadyException:      [503, "Model loading. Retry in 30 s."],
    ServiceUnavailableException: [503, "Bedrock temporarily unavailable. Retry in 60 s."],
  };
  const [status, message] = map[err.name] ?? [500, `Unexpected error: ${err.message}`];
  return buildResponse(status, { error: message, aws_error_type: err.name });
}
