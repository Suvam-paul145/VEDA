/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           VEDA Brain — Lambda Handler v1.0                   ║
 * ║           AWS Bharat Hackathon                               ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Routing Strategy:                                           ║
 * ║  companion → GCP Gemini 2.0 Flash  (~400ms, free, 1500 RPM) ║
 * ║  analyze   → Claude 3.5 Sonnet CRIS (~1.5s, best quality)   ║
 * ║  diagram   → Claude 3.5 Haiku CRIS  (~600ms, fast + cheap)  ║
 * ║  deep      → Claude 3 Opus CRIS     (~3-5s, max reasoning)  ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  CRIS (Cross-Region Inference) = "us." model ID prefix       ║
 * ║  → Routes across us-east-1, us-east-2, us-west-2            ║
 * ║  → 3× effective Bedrock quota, zero extra cost               ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  IMPORTANT: Use Claude 3.5 Sonnet NOT Claude 4.x             ║
 * ║  Claude 4.x has 5× output token burndown (quota penalty)     ║
 * ║  Claude 3.5 Sonnet has 1:1 burndown — 5× more headroom       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// ─────────────────────────────────────────────────────────────────────────────
// AWS Bedrock Client  (us-east-1; CRIS handles multi-region routing)
// ─────────────────────────────────────────────────────────────────────────────
const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });

// ─────────────────────────────────────────────────────────────────────────────
// Model IDs
// The "us." prefix activates Cross-Region Inference (CRIS)
// ─────────────────────────────────────────────────────────────────────────────
const MODELS = {
  companion_fallback: "us.anthropic.claude-3-5-haiku-20241022-v1:0",   // Haiku: fast fallback
  analyze:            "us.anthropic.claude-3-5-sonnet-20241022-v2:0",  // Sonnet: main analysis
  diagram:            "us.anthropic.claude-3-5-haiku-20241022-v1:0",   // Haiku: diagram gen
  deep:               "us.anthropic.claude-3-opus-20240229-v1:0",      // Opus:  deep reasoning
};

// ─────────────────────────────────────────────────────────────────────────────
// GCP Gemini 2.0 Flash  (companion mode: sub-500ms, 1500 RPM free)
// Get key at: https://aistudio.google.com/app/apikey
// ─────────────────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL   = "gemini-2.0-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ─────────────────────────────────────────────────────────────────────────────
// Keywords that auto-escalate to Claude Opus (deep reasoning)
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
    return response(200, {});
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
      return response(400, { error: "Provide at least code or a question." });
    }

    // Auto-escalate if question contains production-complexity keywords
    const shouldEscalate = DEEP_TRIGGERS.some((kw) =>
      question.toLowerCase().includes(kw)
    );
    const effectiveMode = shouldEscalate ? "deep" : mode;

    let result;

    if (effectiveMode === "companion" && GEMINI_API_KEY) {
      // Fast path → GCP Gemini 2.0 Flash
      result = await callGemini(code, language, t0);
    } else {
      // Main path → AWS Bedrock CRIS
      result = await callBedrock(code, question, language, effectiveMode, shouldEscalate, t0);
    }

    return response(200, result);
  } catch (err) {
    console.error("[VEDA Error]", err.name, err.message);
    return handleError(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GCP Gemini 2.0 Flash  (companion mode)
// ─────────────────────────────────────────────────────────────────────────────
async function callGemini(code, language, t0) {
  const userText = `Language: ${language}\nCode:\n\`\`\`${language}\n${code.slice(0, 3000)}\n\`\`\``;

  let res;
  try {
    res = await fetch(GEMINI_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userText }] }],
        systemInstruction: { parts: [{ text: COMPANION_PROMPT }] },
        generationConfig: {
          temperature:      0.05,
          maxOutputTokens:  250,
          responseMimeType: "application/json",  // JSON mode — no markdown wrapping
        },
      }),
    });
  } catch (networkErr) {
    console.warn("[VEDA] Gemini network error — falling back to Haiku:", networkErr.message);
    return callBedrock(code, "Quick bug check", language, "companion_fallback", false, t0);
  }

  if (!response.ok && !res.ok) {
    console.warn("[VEDA] Gemini HTTP", res.status, "— falling back to Haiku");
    return callBedrock(code, "Quick bug check", language, "companion_fallback", false, t0);
  }

  const data    = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed  = safeJsonParse(rawText);

  return {
    ...parsed,
    _meta: { provider: "GCP", model: GEMINI_MODEL, mode: "companion", latency_ms: Date.now() - t0 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AWS Bedrock — Claude via CRIS
// ─────────────────────────────────────────────────────────────────────────────
async function callBedrock(code, question, language, mode, escalated, t0) {
  const modelId = MODELS[mode] ?? MODELS.analyze;

  // Set max_tokens to realistic output size, NOT theoretical max.
  // Bedrock deducts max_tokens UPFRONT from quota — smaller = more quota headroom.
  const maxTokens = { companion_fallback: 200, diagram: 400, analyze: 800, deep: 1500 }[mode] ?? 800;

  const systemPrompt =
    mode === "deep"               ? DEEP_PROMPT     :
    mode === "companion_fallback" ? COMPANION_PROMPT :
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
  const body    = JSON.parse(new TextDecoder().decode(raw.body));
  const rawText = body?.content?.[0]?.text ?? "{}";
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
// Claude/Gemini occasionally wraps output in markdown despite instructions.
// This strips it before parsing.
// ─────────────────────────────────────────────────────────────────────────────
function safeJsonParse(text) {
  if (!text) return {};

  // Attempt 1 — direct
  try { return JSON.parse(text); } catch (_) { /* continue */ }

  // Attempt 2 — strip markdown fences
  const stripped = text
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
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
// Response Builder  (CORS headers on every response)
// ─────────────────────────────────────────────────────────────────────────────
function response(statusCode, body) {
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
// Error Handler  (maps AWS SDK error names to HTTP codes + helpful messages)
// ─────────────────────────────────────────────────────────────────────────────
function handleError(err) {
  const map = {
    AccessDeniedException:      [403, "IAM role missing AmazonBedrockFullAccess. Add it in IAM console."],
    ThrottlingException:        [429, "Bedrock rate limit hit. Wait 10 s and retry. Consider requesting quota increase."],
    ValidationException:        [400, `Model ID invalid or not enabled in Bedrock Model Access. Detail: ${err.message}`],
    ResourceNotFoundException:  [404, "Model not found. Go to Bedrock → Model Access and enable the model."],
    ModelNotReadyException:     [503, "Model loading. Retry in 30 s."],
    ServiceUnavailableException:[503, "Bedrock temporarily unavailable. Retry in 60 s."],
  };
  const [status, message] = map[err.name] ?? [500, `Unexpected error: ${err.message}`];
  return response(status, { error: message, aws_error_type: err.name });
}
