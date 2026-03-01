/**
 * VEDA Lambda — Local Test Runner
 * ────────────────────────────────
 * Run: node test/run-local.mjs
 *
 * Prerequisites:
 *   export GEMINI_API_KEY=your_key
 *   export AWS_REGION=us-east-1
 *   export AWS_PROFILE=default
 *   (or: export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...)
 */

import { handler } from "../index.mjs";

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const RESET  = "\x1b[0m";

function event(body) {
  return { httpMethod: "POST", body: JSON.stringify(body) };
}

function printResult(label, result) {
  const b = JSON.parse(result.body);
  const ok = result.statusCode === 200;
  console.log(`\n${CYAN}${"─".repeat(65)}${RESET}`);
  console.log(`${ok ? GREEN + "✅" : RED + "❌"} ${label}${RESET}`);
  console.log(`${"─".repeat(65)}`);
  console.log(`  Status  : ${result.statusCode}`);
  if (b._meta) {
    console.log(`  Provider: ${b._meta.provider}`);
    console.log(`  Model   : ${b._meta.model}`);
    console.log(`  Latency : ${b._meta.latency_ms}ms`);
    console.log(`  Escalate: ${b._meta.escalated}`);
  }
  if (b.severity) console.log(`  Severity: ${YELLOW}${b.severity}${RESET}`);
  if (b.bug_type) console.log(`  Bug type: ${b.bug_type}`);
  if (b.hint)     console.log(`  Hint    : ${b.hint}`);
  if (b.explanation) console.log(`  Explain : ${b.explanation.slice(0, 120)}...`);
  if (b.error)    console.log(`  ${RED}ERROR: ${b.error}${RESET}`);
}

const TESTS = [
  {
    label: "1 — Companion mode  → expect Gemini, <600ms",
    body: {
      code: "async function getUser(id) { const user = fetchUser(id); return user.name; }",
      language: "javascript",
      mode: "companion",
    },
  },
  {
    label: "2 — Null reference  → Claude 3.5 Sonnet, severity high",
    body: {
      code: "const user = null;\nconsole.log(user.name);",
      language: "javascript",
      question: "What is wrong?",
      mode: "analyze",
    },
  },
  {
    label: "3 — Diagram only    → Claude 3.5 Haiku",
    body: {
      code: "function divide(a, b) { return a / b; }",
      language: "javascript",
      question: "Show me a flow diagram",
      mode: "diagram",
    },
  },
  {
    label: "4 — Deep escalation → 'intermittent' keyword → Claude Opus",
    body: {
      code: "let count = 0;\nsetInterval(() => count++, 100);\nsetTimeout(() => console.log(count), 500);",
      language: "javascript",
      question: "This sometimes fails intermittently in production — why?",
      mode: "analyze",
    },
  },
  {
    label: "5 — Security issue  → plaintext password",
    body: {
      code: "const password = req.body.password;\ndb.users.insert({ username, password });",
      language: "javascript",
      question: "Is this code secure?",
      mode: "analyze",
    },
  },
  {
    label: "6 — No bug          → severity: none",
    body: {
      code: "const add = (a, b) => a + b;\nconsole.log(add(2, 3));",
      language: "javascript",
      question: "Any issues?",
      mode: "analyze",
    },
  },
  {
    label: "7 — Python code     → language detection",
    body: {
      code: "def get_user(id):\n    user = None\n    return user['name']",
      language: "python",
      question: "What will crash here?",
      mode: "analyze",
    },
  },
  {
    label: "8 — CORS preflight  → 200 with no body processing",
    body: {},
    override: { httpMethod: "OPTIONS", body: "{}" },
  },
];

console.log(`\n${CYAN}═══════════════════════════════════════════════════════════════${RESET}`);
console.log(`  VEDA Lambda — Local Test Suite`);
console.log(`  Gemini key: ${process.env.GEMINI_API_KEY ? GREEN + "✅ present" : RED + "❌ missing (companion will fallback to Haiku)"}${RESET}`);
console.log(`${CYAN}═══════════════════════════════════════════════════════════════${RESET}`);

let passed = 0;
let failed = 0;

for (const test of TESTS) {
  try {
    const evt = test.override ?? event(test.body);
    const result = await handler(evt);
    printResult(test.label, result);
    if (result.statusCode < 500) passed++;
    else failed++;
  } catch (err) {
    console.error(`\n${RED}CRASH: ${test.label}${RESET}`);
    console.error(err.message);
    failed++;
  }
}

console.log(`\n${CYAN}═══════════════════════════════════════════════════════════════${RESET}`);
console.log(`  Results: ${GREEN}${passed} passed${RESET}  ${failed > 0 ? RED + failed + " failed" : ""}${RESET}`);
console.log(`${CYAN}═══════════════════════════════════════════════════════════════\n${RESET}`);
