import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

/* ═══════════════════════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════════════════════ */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #07090f; overflow: hidden; height: 100%; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #6366f130; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #6366f160; }

  @keyframes fadeUp    { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes fadeDown  { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideIn   { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
  @keyframes slideRight{ from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes scaleIn   { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
  @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.45} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  @keyframes breathe   { 0%,100%{box-shadow:0 0 20px rgba(99,102,241,.35)} 50%{box-shadow:0 0 44px rgba(99,102,241,.8)} }
  @keyframes blink     { 0%,49%{opacity:1} 50%,100%{opacity:0} }
  @keyframes toastIn   { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
  @keyframes toastOut  { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(40px)} }
  @keyframes confettiDrop { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(300px) rotate(720deg);opacity:0} }
  @keyframes shimmer   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @keyframes dot1      { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
  @keyframes dot2      { 0%,60%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
  @keyframes dot3      { 0%,60%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

  .veda-btn {
    position:relative; overflow:hidden;
    background:linear-gradient(135deg,#6366f1,#8b5cf6);
    color:white; border:none; padding:13px 30px; border-radius:12px;
    font-family:Syne; font-size:15px; font-weight:700; cursor:pointer;
    box-shadow:0 4px 24px rgba(99,102,241,.45); transition:all .25s ease; letter-spacing:.01em;
  }
  .veda-btn:hover { transform:translateY(-2px); box-shadow:0 8px 40px rgba(99,102,241,.65); }
  .veda-btn::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,transparent,rgba(255,255,255,.15),transparent); transform:translateX(-100%); transition:transform .5s ease; }
  .veda-btn:hover::after { transform:translateX(100%); }
  .ghost-btn { background:transparent; color:#94a3b8; cursor:pointer; border:1px solid rgba(255,255,255,.1); padding:13px 26px; border-radius:12px; font-family:Syne; font-size:14px; transition:all .2s ease; }
  .ghost-btn:hover { border-color:rgba(99,102,241,.5); color:#e2e8f0; }
  .ide-tab { transition:all .2s ease; cursor:pointer; white-space:nowrap; }
  .ide-tab:hover { background:rgba(255,255,255,.04) !important; }
  .act-icon { transition:all .2s ease; cursor:pointer; }
  .file-row { transition:background .12s ease; cursor:pointer; }
  .file-row:hover { background:rgba(99,102,241,.09) !important; }
  .panel-tab { transition:all .2s ease; cursor:pointer; }
  .panel-tab:hover { color:#cbd5e1 !important; }
  .cmd-row { transition:background .1s; cursor:pointer; }
  .cmd-row:hover { background:rgba(99,102,241,.12) !important; }
  .menu-row { transition:background .1s; cursor:pointer; padding:5px 16px; }
  .menu-row:hover { background:rgba(255,255,255,.06); }
  .notif-item { transition:background .1s; cursor:pointer; }
  .notif-item:hover { background:rgba(255,255,255,.04) !important; }
  .gh-repo { transition:all .15s; cursor:pointer; }
  .gh-repo:hover { background:rgba(99,102,241,.09) !important; transform:translateX(2px); }
  .gh-file { transition:background .12s; cursor:pointer; }
  .gh-file:hover { background:rgba(255,255,255,.05) !important; }
  .notif-bell { transition:all .2s; cursor:pointer; }
  .notif-bell:hover { color:#e2e8f0 !important; }
  .feature-card { transition:all .25s ease; cursor:default; }
  .feature-card:hover { transform:translateY(-4px); }
  .step-row { transition:transform .2s ease; }
  .step-row:hover { transform:translateX(6px); }
  .landing-pill { transition:all .2s ease; cursor:default; }
  .landing-pill:hover { transform:translateY(-2px); }
  @keyframes notifSlide { from{opacity:0;transform:translateY(-8px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes gradShift  { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
  @keyframes glow       { 0%,100%{opacity:.6} 50%{opacity:1} }
  @keyframes typewriter { from{width:0} to{width:100%} }
`;

/* ═══════════════════════════════════════════════════════════════
   THEME
═══════════════════════════════════════════════════════════════ */
const C = {
  bg: "#07090f", surface: "#0d1117", panel: "#161b27", border: "rgba(255,255,255,0.07)",
  indigo: "#6366f1", violet: "#8b5cf6", amber: "#fbbf24", green: "#10b981",
  red: "#ef4444", cyan: "#06b6d4", pink: "#f472b6", orange: "#f97316",
  text: "#e2e8f0", sub: "#94a3b8", dim: "#64748b", muted: "#334155",
};

/* ═══════════════════════════════════════════════════════════════
   DEMO DATA
═══════════════════════════════════════════════════════════════ */
const DEMO_CODE = {
  "cart.py":
    `# Shopping cart module — Veda will detect the mutable default bug ↓

def add_item(item, cart=[]):
    """Add item to cart. BUG: mutable default argument!"""
    cart.append(item)
    return cart

def get_total(cart):
    return sum(item['price'] for item in cart)

def apply_discount(cart, pct=0):
    for item in cart:
        item['price'] *= (1 - pct / 100)
    return cart

def clear_cart(cart=[]):
    cart.clear()   # same shared list!
    return cart

class Cart:
    def __init__(self, items=[]):   # BUG: mutable default
        self.items = items
        self.discount = 0

    def add(self, item):
        self.items.append(item)
        return self

    def total(self):
        return sum(i['price'] for i in self.items)
`,

  "api.ts":
    `import axios from 'axios';

// ← Veda will flag excessive use of 'any'
interface User {
  id: any;
  name: any;
  email: any;
  roles: any[];
}

async function fetchUser(id: any): Promise<any> {
  const res: any = await axios.get(\`/api/users/\${id}\`);
  return res.data;
}

async function updateUser(id: any, payload: any): Promise<any> {
  const res: any = await axios.put(\`/api/users/\${id}\`, payload);
  return res.data;
}

export const getUsers = async (): Promise<any> => {
  const data: any = await fetchUser(undefined);
  return data;
};

// Better: use proper types
// interface User { id: string; name: string; email: string; }
// async function fetchUser(id: string): Promise<User> { ... }
`,

  "fetch.js":
    `// Classic callback hell — Veda detects nested callbacks
// This pattern makes code hard to read, debug, and maintain.

getUserData(userId, function(err, user) {
  if (err) return handleError(err);
  getOrders(user.id, function(err, orders) {
    if (err) return handleError(err);
    getProducts(orders[0].id, function(err, product) {
      if (err) return handleError(err);
      getInventory(product.id, function(err, inv) {
        if (err) return handleError(err);
        getWarehouse(inv.warehouseId, function(err, wh) {
          if (err) return handleError(err);
          console.log('Location:', wh.address);
        });
      });
    });
  });
});

// Fix: use async/await
async function getWarehouseForUser(userId) {
  const user    = await getUserData(userId);
  const orders  = await getOrders(user.id);
  const product = await getProducts(orders[0].id);
  const inv     = await getInventory(product.id);
  const wh      = await getWarehouse(inv.warehouseId);
  return wh.address;
}
`,

  "analyze.js":
    `// handlers/analyze.js — Claude Haiku classifier Lambda

const jwt       = require('jsonwebtoken');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { callOpenRouter } = require('../lib/openrouter');

const db = new DynamoDB({ region: 'us-east-1' });

module.exports.handler = async (event) => {
  // 1. Auth
  const token = event.headers?.Authorization?.replace('Bearer ', '');
  let userId;
  try {
    ({ userId } = jwt.verify(token, process.env.JWT_SECRET));
  } catch {
    return { statusCode: 401, body: '{"error":"Unauthorized"}' };
  }

  // 2. Rate lock — 30s TTL
  const lockKey = \`lesson-lock:\${userId}\`;
  const locked  = await checkRateLock(lockKey);
  if (locked) return { statusCode: 200, body: JSON.stringify({ teach: false, reason: 'cooldown' }) };

  // 3. Classify with Haiku
  const { fileContent, language, fileName, cursorLine } = JSON.parse(event.body);
  const classification = await callOpenRouter({
    model: 'anthropic/claude-haiku-4-5',
    systemPrompt: 'Classify the most impactful mistake in this code. Return JSON only.',
    userPrompt: \`Language: \${language}\nFile: \${fileName}\nCursor: \${cursorLine}\n\nCode:\n\${fileContent}\`,
    maxTokens: 300,
  });

  const { teach, conceptId, confidence, lineNumber } = JSON.parse(classification);
  if (!teach || confidence < 0.85) {
    return { statusCode: 200, body: JSON.stringify({ teach: false }) };
  }

  // 4. Set rate lock, save mistake, fire lesson async
  await setRateLock(lockKey, 30);
  await saveMistake(userId, conceptId, lineNumber, fileContent);
  generateLesson(userId, conceptId, language, fileContent); // fire-and-forget

  return { statusCode: 200, body: JSON.stringify({ teach: true, conceptId, lineNumber, confidence }) };
};
`,

  "lesson.js":
    `// handlers/lesson.js — Parallel OpenRouter + Polly lesson generator

const { DynamoDB }     = require('@aws-sdk/client-dynamodb');
const { Polly }        = require('@aws-sdk/client-polly');
const { S3 }           = require('@aws-sdk/client-s3');
const { callOpenRouter } = require('../lib/openrouter');
const { pushToClient }   = require('../lib/websocket');

const db    = new DynamoDB({ region: 'us-east-1' });
const polly = new Polly({ region: 'us-east-1' });
const s3    = new S3({ region: 'us-east-1' });

module.exports.handler = async (event) => {
  const { userId, conceptId, language, fileContent } = JSON.parse(event.body);

  // 3 parallel AI calls
  const [explanation, codeFix, diagram] = await Promise.all([
    callOpenRouter({
      model: 'anthropic/claude-sonnet-4-5',
      systemPrompt: 'Generate a voice-ready explanation. No markdown. Max 120 words.',
      userPrompt: \`Explain \${conceptId} in \${language}. Code: \${fileContent.slice(0,400)}\`,
      maxTokens: 200,
    }),
    callOpenRouter({
      model: 'anthropic/claude-sonnet-4-5',
      systemPrompt: 'Return JSON: { codeBefore, codeAfter, codeComment }. Code blocks only.',
      userPrompt: \`Show before/after fix for \${conceptId} in \${language}.\`,
      maxTokens: 300,
    }),
    callOpenRouter({
      model: 'google/gemini-flash-1.5',
      systemPrompt: 'Return only valid Mermaid.js graph LR syntax. No backticks.',
      userPrompt: \`Diagram showing \${conceptId} problem vs solution.\`,
      maxTokens: 200,
    }),
  ]);

  // Synthesize audio with Polly Ruth (generative)
  const audioUrl = await synthesizeAudio(explanation, userId, conceptId);
  const { codeBefore, codeAfter, codeComment } = JSON.parse(codeFix);

  // Save to DynamoDB
  const lesson = { lessonId: \`\${userId}_\${conceptId}_\${Date.now()}\`,
    userId, conceptId, language, explanation, codeBefore, codeAfter,
    codeComment, diagramSyntax: diagram, audioUrl, status: 'delivered' };
  await db.putItem({ TableName: 'veda-lessons', Item: marshall(lesson) });

  // Push via WebSocket
  await pushToClient(userId, { type: 'lesson', lesson });
  return { statusCode: 200 };
};
`,

  "package.json":
    `{
  "name": "veda-learn-web",
  "version": "2.0.0",
  "description": "AI-powered coding tutor — web IDE edition",
  "private": true,
  "scripts": {
    "dev":     "vite --port 5173",
    "build":   "vite build",
    "preview": "vite preview",
    "deploy":  "vercel --prod"
  },
  "dependencies": {
    "@monaco-editor/react": "^4.6.0",
    "@octokit/rest":        "^20.1.1",
    "axios":                "^1.6.8",
    "canvas-confetti":      "^1.9.3",
    "mermaid":              "^10.9.0",
    "react":                "^18.2.0",
    "react-dom":            "^18.2.0",
    "react-router-dom":     "^6.22.3",
    "react-syntax-highlighter": "^15.5.0",
    "three":                "^0.162.0",
    "zustand":              "^4.5.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer":         "^10.4.19",
    "postcss":              "^8.4.38",
    "tailwindcss":          "^3.4.3",
    "vite":                 "^5.2.0"
  }
}
`,
};

const LESSONS_BY_FILE = {
  "cart.py": {
    conceptId: "mutable-default", mistakeType: "bug", lineNumber: 3, severity: "high",
    explanation: "You are using a mutable list [] as a default argument. Python evaluates default arguments once at function definition time — not each time you call the function. The same list object is silently reused across every call, creating unexpected shared state between completely unrelated invocations of your function.",
    codeBefore: "def add_item(item, cart=[]):\n    cart.append(item)\n    return cart",
    codeAfter: "def add_item(item, cart=None):\n    if cart is None:\n        cart = []\n    cart.append(item)\n    return cart",
    codeComment: "Use None as a sentinel — create a fresh list inside the body on every call",
  },
  "api.ts": {
    conceptId: "any-type", mistakeType: "antipattern", lineNumber: 4, severity: "medium",
    explanation: "You have annotated nearly every value with the any type. This completely bypasses TypeScript's type checker — you lose autocomplete, refactoring safety, and compile-time error detection. The compiler can no longer help you when shapes change. Use specific interfaces or generics instead.",
    codeBefore: "async function fetchUser(id: any): Promise<any> {\n  const res: any = await axios.get(`/users/${id}`);\n  return res.data;\n}",
    codeAfter: "interface User { id: string; name: string; email: string; }\n\nasync function fetchUser(id: string): Promise<User> {\n  const { data } = await axios.get<User>(`/users/${id}`);\n  return data;\n}",
    codeComment: "Generic axios.get<T> infers the response shape automatically",
  },
  "fetch.js": {
    conceptId: "callback-hell", mistakeType: "antipattern", lineNumber: 4, severity: "medium",
    explanation: "Five levels of nested callbacks form a 'pyramid of doom'. Each level indents further right, error handling is duplicated at every layer, and the logical sequence of operations is impossible to read at a glance. This pattern makes debugging, testing, and refactoring extremely painful.",
    codeBefore: "getUserData(userId, function(err, user) {\n  getOrders(user.id, function(err, orders) {\n    getProducts(orders[0].id, function(err, product) {\n      // ...5 levels deep\n    });\n  });\n});",
    codeAfter: "async function getWarehouseForUser(userId) {\n  const user    = await getUserData(userId);\n  const orders  = await getOrders(user.id);\n  const product = await getProducts(orders[0].id);\n  const inv     = await getInventory(product.id);\n  return inv.warehouseId;\n}",
    codeComment: "async/await flattens the pyramid — linear code reads like a story",
  },
};

const QUIZ_QUESTIONS = [
  {
    q: "What is the primary issue with using `[]` as a default argument in Python?",
    opts: ["It is slower than None", "The same list object is shared across ALL calls", "Python disallows list defaults", "It always throws a TypeError at runtime"],
    ans: 1, exp: "Python evaluates default arguments exactly once at function definition time. The mutable list persists and accumulates state between unrelated calls."
  },
  {
    q: "Which pattern correctly fixes the mutable default argument issue?",
    opts: ["def fn(x, lst=list())", "def fn(x, lst=[]): lst=[]", "def fn(x, lst=None):\n  if lst is None: lst=[]", "def fn(x, lst={})"],
    ans: 2, exp: "Using None as sentinel and creating a fresh list inside the function body is the idiomatic Python fix — ensures each call starts with an empty list."
  },
  {
    q: "This anti-pattern belongs to which broader category of bugs?",
    opts: ["Syntax errors", "Shared mutable state bugs", "Import cycle errors", "Stack overflow bugs"],
    ans: 1, exp: "Mutable default arguments cause shared state across invocations — a classic hidden side-effect that produces bugs only visible when functions are called multiple times."
  },
];

const FILES = [
  { name: "veda-learn/", type: "folder", depth: 0, open: true },
  { name: "src/", type: "folder", depth: 1, open: true },
  { name: "cart.py", type: "file", lang: "python", depth: 2 },
  { name: "api.ts", type: "file", lang: "typescript", depth: 2 },
  { name: "fetch.js", type: "file", lang: "javascript", depth: 2 },
  { name: "handlers/", type: "folder", depth: 1, open: true },
  { name: "analyze.js", type: "file", lang: "javascript", depth: 2 },
  { name: "lesson.js", type: "file", lang: "javascript", depth: 2 },
  { name: "package.json", type: "file", lang: "json", depth: 1 },
];

const LANG_MAP = {
  "cart.py": "python", "api.ts": "typescript", "fetch.js": "javascript",
  "analyze.js": "javascript", "lesson.js": "javascript", "package.json": "json",
};

/* ═══════════════════════════════════════════════════════════════
   GITHUB MOCK DATA
═══════════════════════════════════════════════════════════════ */
const GH_REPOS = [
  { name: "veda-learn", desc: "AI-powered coding tutor IDE", lang: "JavaScript", stars: 142, updated: "2h ago", private: false },
  { name: "cart-service", desc: "E-commerce cart microservice", lang: "Python", stars: 38, updated: "1d ago", private: false },
  { name: "api-gateway", desc: "AWS Lambda API gateway handlers", lang: "TypeScript", stars: 91, updated: "3d ago", private: true },
  { name: "ml-pipeline", desc: "Data preprocessing pipeline", lang: "Python", stars: 67, updated: "1w ago", private: false },
  { name: "dashboard", desc: "Analytics dashboard frontend", lang: "TypeScript", stars: 204, updated: "2w ago", private: false },
];

const GH_REPO_FILES = {
  "veda-learn": ["src/", "handlers/", "cart.py", "api.ts", "fetch.js", "package.json", "README.md", "vite.config.js"],
  "cart-service": ["app.py", "models.py", "routes.py", "requirements.txt", "Dockerfile", "tests/"],
  "api-gateway": ["analyze.ts", "lesson.ts", "quiz.ts", "serverless.yml", "tsconfig.json"],
  "ml-pipeline": ["pipeline.py", "preprocessing.py", "train.py", "config.yaml", "requirements.txt"],
  "dashboard": ["App.tsx", "components/", "hooks/", "utils/", "package.json", "tailwind.config.js"],
};

const LANG_COLORS = { JavaScript: "#f7df1e", TypeScript: "#3178c6", Python: "#3776ab", default: "#94a3b8" };

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE DATA
═══════════════════════════════════════════════════════════════ */
const FEATURES_FULL = [
  {
    icon: "⚡", title: "Live Error Detection", c: "#6366f1", tag: "Claude Haiku · <3s",
    desc: "Veda silently watches your editor. After 30 seconds of idle time it fires Claude Haiku to classify the most impactful mistake in your code — with 0.85+ confidence threshold to avoid noise."
  },
  {
    icon: "🎙", title: "Voice-First Lessons", c: "#8b5cf6", tag: "Sonnet + Amazon Polly",
    desc: "Every lesson arrives as spoken audio via Amazon Polly Ruth (generative). Three sub-panels give you the explanation, before/after code fix, and a deep-dive mode powered by Claude Opus."
  },
  {
    icon: "🎯", title: "Adaptive Quizzes", c: "#fbbf24", tag: "3 MCQs · XP reward",
    desc: "After each lesson, Veda generates 3 targeted multiple-choice questions. Correct answers unlock XP and advance your concept mastery percentage tracked in DynamoDB."
  },
  {
    icon: "💬", title: "AI Doubt Chat", c: "#10b981", tag: "Context-aware · streaming",
    desc: "Ask anything about the code in the current file. Veda has full editor context — the active file, cursor line, and detected concepts — for genuinely relevant answers, not generic responses."
  },
  {
    icon: "📁", title: "GitHub Integration", c: "#f472b6", tag: "Octokit · any repo",
    desc: "Browse and load any file from your GitHub repositories directly into the IDE. No git clone, no local setup — one click opens any file in the editor with full syntax highlighting."
  },
  {
    icon: "📈", title: "Skill Progression", c: "#06b6d4", tag: "DynamoDB · real-time",
    desc: "Every mistake, lesson, and quiz answer is stored in DynamoDB with timestamps. Your mastery percentage per concept updates live as you interact, giving you a true learning trajectory."
  },
];

const STEPS = [
  {
    n: "01", icon: "✍", title: "Write code naturally",
    desc: "Work in the browser IDE exactly like VS Code. Open files from your GitHub repos or the built-in explorer. Veda stays out of your way until it has something genuinely useful to say."
  },
  {
    n: "02", icon: "⚡", title: "Veda detects the mistake",
    desc: "After 30 seconds of inactivity, Claude Haiku scans your code via AWS Lambda. A confidence-gated classifier identifies the single most impactful concept to teach you right now."
  },
  {
    n: "03", icon: "🧠", title: "Learn, quiz, and grow",
    desc: "A voice lesson arrives via WebSocket — spoken by Amazon Polly. A quiz tests your understanding. Your XP, streak, and concept mastery percentages update live in your progress dashboard."
  },
];

const TESTIMONIALS = [
  {
    avatar: "R", name: "Rohan Mehta", role: "Backend Engineer · Python", c: "#6366f1",
    body: "I had been writing mutable default arguments in Python for 3 years without knowing. Veda caught it in 30 seconds and explained it better than any Stack Overflow answer I ever read."
  },
  {
    avatar: "S", name: "Sara Kim", role: "Fullstack Dev · TypeScript", c: "#8b5cf6",
    body: "The any-type lesson was exactly what I needed. I always 'fixed' TS errors by slapping any everywhere. Now I understand why that defeats the whole purpose of TypeScript."
  },
  {
    avatar: "A", name: "Aditya Verma", role: "CS Student · JavaScript", c: "#fbbf24",
    body: "Callback hell is something every JS beginner does. But no tutorial showed me the mental model shift to async/await as clearly as Veda's 3-panel lesson. The quiz made it stick."
  },
  {
    avatar: "P", name: "Priya Nair", role: "ML Engineer · Python", c: "#10b981",
    body: "I use Veda while writing data preprocessing scripts. The n+1 query pattern lesson saved me hours of debugging a slow training pipeline. The XP system weirdly keeps me coming back."
  },
];

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATION DATA
═══════════════════════════════════════════════════════════════ */
const INITIAL_NOTIFS = [
  { id: 1, type: "lesson", icon: "📖", title: "New lesson ready", body: "mutable-default detected in cart.py", time: "just now", read: false },
  { id: 2, type: "xp", icon: "⚡", title: "+15 XP earned", body: "Quiz completed — concept mastered!", time: "2m ago", read: false },
  { id: 3, type: "ws", icon: "🔌", title: "WebSocket connected", body: "wss://imhoyvukwe.execute-api.us-east-1…", time: "5m ago", read: true },
  { id: 4, type: "streak", icon: "🔥", title: "Streak extended!", body: "12-day learning streak — keep it up", time: "1h ago", read: true },
  { id: 5, type: "analyze", icon: "🔍", title: "Analysis complete", body: "api.ts scanned — any-type detected", time: "2h ago", read: true },
  { id: 6, type: "quiz", icon: "🎯", title: "Quiz unlocked", body: "callback-hell concept · 3 questions", time: "3h ago", read: true },
];

const CMD_PALETTE_ITEMS = [
  { icon: "📂", label: "Open File", shortcut: "Ctrl+O", category: "File" },
  { icon: "💾", label: "Save File", shortcut: "Ctrl+S", category: "File" },
  { icon: "▶", label: "Run Analysis", shortcut: "F5", category: "Veda" },
  { icon: "🔍", label: "Search in Files", shortcut: "Ctrl+⇧+F", category: "Search" },
  { icon: "⚙", label: "Open Settings", shortcut: "Ctrl+,", category: "View" },
  { icon: "📖", label: "Toggle Lesson Panel", shortcut: "Ctrl+L", category: "Veda" },
  { icon: "🎯", label: "Start Quiz", shortcut: "Ctrl+Q", category: "Veda" },
  { icon: "💬", label: "Open Doubt Chat", shortcut: "Ctrl+D", category: "Veda" },
  { icon: "📈", label: "View Progress", shortcut: "Ctrl+P", category: "Veda" },
  { icon: "⬛", label: "Toggle Terminal", shortcut: "Ctrl+`", category: "View" },
  { icon: "🌗", label: "Format Document", shortcut: "⇧+Alt+F", category: "Edit" },
  { icon: "📋", label: "Clone Repository", shortcut: "", category: "Git" },
  { icon: "🔀", label: "Stage All Changes", shortcut: "", category: "Git" },
  { icon: "⎋", label: "Close All Tabs", shortcut: "", category: "File" },
];

const TERMINAL_CMDS = {
  help: "Available commands: help, clear, ls, pwd, npm, npx, git, python, node, veda",
  ls: "cart.py   api.ts   fetch.js   handlers/   node_modules/   package.json   vite.config.js",
  pwd: "/home/user/veda-learn",
  "npm run dev": "  VITE v5.2.0  ready in 312ms\n  ➜  Local:   http://localhost:5173/\n  ➜  Network: http://192.168.1.5:5173/",
  "npm run build": "  vite v5.2.0 building for production...\n  ✓ 42 modules transformed.\n  dist/index.html  0.48 kB\n  dist/assets/index-DqPiEoAv.js  312.40 kB",
  "git status": "On branch main\nChanges not staged for commit:\n  modified:   src/cart.py\n  modified:   src/api.ts",
  "git log": "commit a3f9d21  feat: add mutable default to demo files\ncommit b1e8c40  feat: initial Veda Learn IDE",
  "python cart.py": "Traceback (most recent call last):\n  File 'cart.py', line 3\nNameError: name 'add_item' not properly isolated\n[Veda detected this before runtime!]",
  "npx veda analyze": "🔍 Scanning cart.py...\n⚠  Line 3: mutable-default [confidence: 0.93]\n⚠  Line 15: mutable-default [confidence: 0.89]\n✓  Analysis complete. 2 issues found.",
  "node -v": "v20.11.1",
  "veda --version": "Veda Learn IDE v2.0.0 · AWS Edition · claude-haiku-4-5",
};

/* ═══════════════════════════════════════════════════════════════
   THREE.JS — LANDING
═══════════════════════════════════════════════════════════════ */
function LandingCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(55, W / H, 0.1, 500);
    cam.position.z = 32;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H); renderer.setClearColor(0, 0);
    el.appendChild(renderer.domElement);

    const N = 480, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N);
    const cA = new THREE.Color(C.indigo), cB = new THREE.Color(C.violet), cC = new THREE.Color(C.amber);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - .5) * 110; pos[i * 3 + 1] = (Math.random() - .5) * 65; pos[i * 3 + 2] = (Math.random() - .5) * 45;
      const t = Math.random(); const c = t < .55 ? cA.clone().lerp(cB, t / .55) : t < .9 ? cB : cC;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; sz[i] = Math.random() * 2.4 + .4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sz, 1));
    const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
      vertexColors: true, transparent: true, depthWrite: false,
      vertexShader: `attribute float size;varying vec3 vColor;void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*(270./-mv.z);gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vColor,smoothstep(.5,.08,d)*.88);}`,
    }));
    scene.add(pts);

    const lv = [];
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const dx = pos[i * 3] - pos[j * 3], dy = pos[i * 3 + 1] - pos[j * 3 + 1], dz = pos[i * 3 + 2] - pos[j * 3 + 2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 9.5) lv.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(lv, 3));
    scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: C.indigo, transparent: true, opacity: .07 })));

    const orbs = [[0, 5, -8, C.indigo, .14, 5], [-14, -4, -10, C.violet, .10, 7], [12, 8, -14, C.amber, .08, 4], [-6, 10, -18, "#4f46e5", .07, 6]].map(([x, y, z, c, op, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 24), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op }));
      m.position.set(x, y, z); scene.add(m); return { mesh: m, ox: x, oy: y, sp: Math.random() * .4 + .2, ph: Math.random() * Math.PI * 2 };
    });
    [[0, 3, -10, C.indigo, .14], [-10, -2, -14, C.violet, .10], [9, 6, -18, C.amber, .08]].forEach(([x, y, z, c, op]) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(3.8, .05, 8, 64), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op }));
      m.position.set(x, y, z); m.rotation.x = Math.PI / 3; scene.add(m);
    });

    let mx = 0, my = 0;
    const onM = e => { mx = (e.clientX / innerWidth - .5) * 2; my = -(e.clientY / innerHeight - .5) * 2; };
    const onR = () => { cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); };
    window.addEventListener("mousemove", onM); window.addEventListener("resize", onR);
    let raf; const clk = new THREE.Clock();
    const anim = () => {
      raf = requestAnimationFrame(anim); const t = clk.getElapsedTime();
      pts.rotation.y = t * .018; pts.rotation.x = t * .006;
      orbs.forEach(o => { o.mesh.position.y = o.oy + Math.sin(t * o.sp + o.ph) * 1.4; o.mesh.position.x = o.ox + Math.cos(t * o.sp * .6 + o.ph) * .8; });
      cam.position.x += (mx * 2.8 - cam.position.x) * .04; cam.position.y += (my * 1.6 - cam.position.y) * .04; cam.lookAt(0, 0, 0);
      renderer.render(scene, cam);
    };
    anim();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("mousemove", onM); window.removeEventListener("resize", onR); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, []);
  return <div ref={ref} style={{ position: "absolute", inset: 0, zIndex: 0 }} />;
}

/* ═══════════════════════════════════════════════════════════════
   THREE.JS — LOGIN SPHERE
═══════════════════════════════════════════════════════════════ */
function LoginCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, .1, 200); cam.position.z = 28;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(el.clientWidth, el.clientHeight); renderer.setClearColor(0, 0); el.appendChild(renderer.domElement);

    const N = 280, sPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(2 * Math.random() - 1), theta = Math.random() * Math.PI * 2, r = 13 + Math.random() * 3;
      sPos[i * 3] = r * Math.sin(phi) * Math.cos(theta); sPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta); sPos[i * 3 + 2] = r * Math.cos(phi);
    }
    const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({ color: C.indigo, size: .18, transparent: true, opacity: .7 })));

    const rings = [[C.indigo, .22, 9], [C.violet, .14, 13], [C.amber, .10, 7]].map(([c, op, r], i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, .06, 8, 80), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op }));
      m.rotation.x = Math.PI / 4 + i * .5; m.rotation.y = i * .8; scene.add(m); return m;
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.8, 32, 32), new THREE.MeshBasicMaterial({ color: C.indigo, transparent: true, opacity: .35 }));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(2.5, 32, 32), new THREE.MeshBasicMaterial({ color: C.indigo, transparent: true, opacity: .08, wireframe: true }));
    scene.add(core); scene.add(glow);

    const onR = () => { cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); };
    window.addEventListener("resize", onR);
    let raf; const clk = new THREE.Clock();
    const anim = () => {
      raf = requestAnimationFrame(anim); const t = clk.getElapsedTime();
      rings[0].rotation.z += .006; rings[0].rotation.x += .003;
      rings[1].rotation.z -= .004; rings[1].rotation.y += .005;
      rings[2].rotation.x += .007; rings[2].rotation.z -= .003;
      core.scale.setScalar(1 + Math.sin(t * 2) * .12); glow.rotation.y = t * .2;
      renderer.render(scene, cam);
    };
    anim();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onR); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, []);
  return <div ref={ref} style={{ position: "absolute", inset: 0, zIndex: 0 }} />;
}

/* ═══════════════════════════════════════════════════════════════
   THREE.JS — IDE AMBIENT
═══════════════════════════════════════════════════════════════ */
function IDEAmbient() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, .1, 200); cam.position.z = 22;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(el.clientWidth, el.clientHeight); renderer.setClearColor(0, 0); el.appendChild(renderer.domElement);
    const orbs = [[-18, 9, -12, C.indigo, .05, 6], [16, -7, -16, C.violet, .04, 8], [3, 14, -20, C.amber, .032, 5], [-8, -12, -10, "#4f46e5", .04, 4]].map(([x, y, z, c, op, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op }));
      m.position.set(x, y, z); scene.add(m); return { mesh: m, ox: x, oy: y, ph: Math.random() * Math.PI * 2 };
    });
    const onR = () => { cam.aspect = el.clientWidth / el.clientHeight; cam.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); };
    window.addEventListener("resize", onR);
    let raf; const clk = new THREE.Clock();
    const anim = () => {
      raf = requestAnimationFrame(anim); const t = clk.getElapsedTime();
      orbs.forEach(o => { o.mesh.position.y = o.oy + Math.sin(t * .25 + o.ph) * 1.8; o.mesh.position.x = o.ox + Math.cos(t * .18 + o.ph) * .9; });
      renderer.render(scene, cam);
    };
    anim();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onR); renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, []);
  return <div ref={ref} style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

/* ═══════════════════════════════════════════════════════════════
   CONFETTI
═══════════════════════════════════════════════════════════════ */
function ConfettiCanvas({ active }) {
  const particles = active ? Array.from({ length: 28 }, (_, i) => ({
    id: i, x: Math.random() * 100, color: ["#6366f1", "#8b5cf6", "#fbbf24", "#10b981", "#f472b6", "#06b6d4"][i % 6],
    delay: `${Math.random() * 0.4}s`, size: 6 + Math.random() * 8, duration: `${1.2 + Math.random() * .8}s`,
  })) : [];
  if (!active) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {particles.map(p => (
        <div key={p.id} style={{ position: "absolute", top: -20, left: `${p.x}%`, width: p.size, height: p.size, borderRadius: p.id % 3 === 0 ? "50%" : "2px", background: p.color, animation: `confettiDrop ${p.duration} ease-in ${p.delay} both` }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATION
═══════════════════════════════════════════════════════════════ */
function ToastStack({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 40, right: 20, zIndex: 9998, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: C.panel, border: `1px solid ${t.type === "success" ? "rgba(16,185,129,.35)" : t.type === "warning" ? "rgba(251,191,36,.35)" : "rgba(99,102,241,.35)"}`,
          borderRadius: 12, padding: "12px 16px", minWidth: 240, maxWidth: 320,
          boxShadow: "0 16px 40px rgba(0,0,0,.6)",
          animation: `${t.exiting ? "toastOut" : "toastIn"} .3s ease both`,
          borderLeft: `3px solid ${t.type === "success" ? C.green : t.type === "warning" ? C.amber : C.indigo}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>{t.type === "success" ? "✅" : t.type === "warning" ? "⚠️" : "💡"}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: "Syne" }}>{t.title}</div>
              {t.msg && <div style={{ fontSize: 11, color: C.sub, fontFamily: "Syne", marginTop: 2 }}>{t.msg}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMMAND PALETTE
═══════════════════════════════════════════════════════════════ */
function CommandPalette({ onClose, onAction }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = CMD_PALETTE_ITEMS.filter(i =>
    i.label.toLowerCase().includes(q.toLowerCase()) || i.category.toLowerCase().includes(q.toLowerCase())
  );

  const handleKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && filtered[sel]) { onAction(filtered[sel]); onClose(); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80, background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ width: 560, background: C.panel, borderRadius: 16, border: `1px solid rgba(99,102,241,.3)`, boxShadow: "0 40px 100px rgba(0,0,0,.8)", overflow: "hidden", animation: "scaleIn .18s ease both" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ color: C.dim, fontSize: 15 }}>⌕</span>
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setSel(0); }} onKeyDown={handleKey}
            placeholder="Type a command or search..."
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontFamily: "Syne", fontSize: 14 }} />
          <kbd style={{ fontSize: 10, color: C.dim, background: C.surface, padding: "2px 7px", borderRadius: 5, border: `1px solid ${C.border}`, fontFamily: "JetBrains Mono" }}>Esc</kbd>
        </div>
        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {filtered.length === 0 && <div style={{ padding: "20px 18px", fontSize: 13, color: C.dim, fontFamily: "Syne", textAlign: "center" }}>No commands found</div>}
          {filtered.map((item, i) => (
            <div key={i} className="cmd-row" onClick={() => { onAction(item); onClose(); }}
              style={{ padding: "9px 18px", display: "flex", alignItems: "center", gap: 12, background: i === sel ? "rgba(99,102,241,.12)" : "transparent" }}>
              <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 13, color: C.text, fontFamily: "Syne" }}>{item.label}</span>
              <span style={{ fontSize: 9, color: C.dim, fontFamily: "JetBrains Mono", background: C.surface, padding: "1px 6px", borderRadius: 4, border: `1px solid ${C.border}` }}>{item.category}</span>
              {item.shortcut && <kbd style={{ fontSize: 10, color: C.dim, fontFamily: "JetBrains Mono" }}>{item.shortcut}</kbd>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SETTINGS PANEL
═══════════════════════════════════════════════════════════════ */
function SettingsPanel({ onClose }) {
  const [fontSize, setFontSize] = useState(13);
  const [debounce, setDebounce] = useState(30);
  const [theme, setTheme] = useState("Dark");
  const [autoPlay, setAutoPlay] = useState(true);
  const [wsUrl, setWsUrl] = useState("wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ width: 560, maxHeight: "80vh", overflowY: "auto", background: C.panel, border: `1px solid rgba(99,102,241,.2)`, borderRadius: 20, boxShadow: "0 40px 100px rgba(0,0,0,.8)", animation: "scaleIn .2s ease both" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 16, color: C.text }}>⚙ Settings</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.dim, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 22 }}>
          {[
            { label: "Editor Font Size", sub: "px", value: fontSize, min: 10, max: 20, step: 1, set: setFontSize, type: "range" },
            { label: "Analysis Debounce", sub: "seconds", value: debounce, min: 5, max: 60, step: 5, set: setDebounce, type: "range" },
          ].map(s => (
            <div key={s.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: C.text, fontFamily: "Syne", fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontSize: 12, color: C.indigo, fontFamily: "JetBrains Mono" }}>{s.value}{s.sub}</span>
              </div>
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.value} onChange={e => s.set(Number(e.target.value))}
                style={{ width: "100%", accentColor: C.indigo }} />
            </div>
          ))}
          <div>
            <div style={{ fontSize: 13, color: C.text, fontFamily: "Syne", fontWeight: 500, marginBottom: 8 }}>Theme</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["Dark", "Midnight", "Contrast"].map(t => (
                <button key={t} onClick={() => setTheme(t)} style={{ padding: "7px 16px", borderRadius: 9, background: theme === t ? "rgba(99,102,241,.2)" : C.surface, border: `1px solid ${theme === t ? "rgba(99,102,241,.4)" : C.border}`, color: theme === t ? C.indigo : C.dim, fontFamily: "Syne", fontSize: 12, cursor: "pointer" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, color: C.text, fontFamily: "Syne", fontWeight: 500 }}>Auto-play Polly Audio</div>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: "Syne", marginTop: 2 }}>Play lesson explanation via Amazon Polly</div>
            </div>
            <div onClick={() => setAutoPlay(v => !v)} style={{ width: 42, height: 24, borderRadius: 12, background: autoPlay ? C.indigo : C.muted, cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: autoPlay ? 21 : 3, transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.4)" }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: C.text, fontFamily: "Syne", fontWeight: 500, marginBottom: 8 }}>WebSocket URL</div>
            <input value={wsUrl} onChange={e => setWsUrl(e.target.value)}
              style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 12px", fontSize: 11, color: C.sub, fontFamily: "JetBrains Mono", outline: "none" }} />
          </div>
          <button style={{ padding: "11px 0", borderRadius: 10, background: `linear-gradient(135deg,${C.indigo},${C.violet})`, border: "none", color: "white", fontFamily: "Syne", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MENU DROPDOWN
═══════════════════════════════════════════════════════════════ */
function MenuDropdown({ label, items, onClose }) {
  return (
    <div style={{ position: "fixed", zIndex: 7000, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, minWidth: 200, boxShadow: "0 16px 40px rgba(0,0,0,.7)", padding: "4px 0", animation: "fadeDown .15s ease both" }}>
      {items.map((item, i) =>
        item === "---" ? (
          <div key={i} style={{ height: 1, background: C.border, margin: "4px 0" }} />
        ) : (
          <div key={i} className="menu-row" onClick={() => { item.action?.(); onClose(); }}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: C.sub, fontFamily: "Syne" }}>
            <span>{item.label}</span>
            {item.shortcut && <span style={{ fontSize: 10, color: C.dim, fontFamily: "JetBrains Mono" }}>{item.shortcut}</span>}
          </div>
        )
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GITHUB PANEL
═══════════════════════════════════════════════════════════════ */
function GitHubPanel({ onFileClick, addToast }) {
  const [token, setToken] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selRepo, setSelRepo] = useState(null);
  const [loading, setLoading] = useState(false);

  const connect = () => {
    if (!token.trim()) return;
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      addToast("GitHub connected", "devuser · 5 repos loaded", "success");
    }, 1600);
  };

  const openRepo = (repo) => {
    setSelRepo(s => s === repo ? null : repo);
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const openFile = (fname) => {
    const mapped = Object.keys(DEMO_CODE).find(k => fname.includes(k.split(".")[0]));
    if (mapped) { onFileClick(mapped); addToast("File opened", `${fname} loaded into editor`, "info"); }
    else addToast("File opened", `${fname} loaded`, "info");
  };

  if (!connected) return (
    <div style={{ padding: 14, fontFamily: "Syne" }}>
      <div style={{ fontSize: 11, color: C.dim, fontFamily: "JetBrains Mono", marginBottom: 14, lineHeight: 1.6 }}>
        Connect GitHub to browse repos and load files into the IDE.
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 6, fontWeight: 600 }}>Personal Access Token</div>
        <input
          value={token} onChange={e => setToken(e.target.value)}
          onKeyDown={e => e.key === "Enter" && connect()}
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          type="password"
          style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 11, color: C.text, fontFamily: "JetBrains Mono", outline: "none", transition: "border-color .2s", marginBottom: 8 }}
          onFocus={e => e.target.style.borderColor = "rgba(99,102,241,.45)"}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <div style={{ fontSize: 10, color: C.muted, fontFamily: "JetBrains Mono", marginBottom: 10 }}>
          Needs <code style={{ color: C.sub }}>repo</code> (read-only) scope
        </div>
        <button onClick={connect} disabled={!token.trim() || connecting}
          style={{ width: "100%", padding: "9px 0", borderRadius: 9, background: token.trim() ? `linear-gradient(135deg,${C.indigo},${C.violet})` : C.surface, border: `1px solid ${token.trim() ? "transparent" : C.border}`, color: "white", fontFamily: "Syne", fontWeight: 700, fontSize: 12, cursor: token.trim() ? "pointer" : "default", transition: "all .2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {connecting
            ? <><div style={{ width: 12, height: 12, border: "1.5px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite" }} />Connecting…</>
            : <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
              Connect GitHub
            </>}
        </button>
      </div>
      {/* Demo shortcut */}
      <div
        onClick={() => { setConnected(true); addToast("Demo mode", "5 mock repos loaded", "info"); }}
        style={{ textAlign: "center", fontSize: 11, color: C.dim, cursor: "pointer", padding: "8px 0", transition: "color .2s" }}
        onMouseEnter={e => e.target.style.color = C.sub}
        onMouseLeave={e => e.target.style.color = C.dim}>
        Skip → use demo repos
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Syne" }}>
      {/* User badge */}
      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${C.indigo},${C.violet})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white" }}>D</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>devuser</div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "JetBrains Mono" }}>{GH_REPOS.length} repos · read-only</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
      </div>

      {/* Repo list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {GH_REPOS.map(repo => (
          <div key={repo.name}>
            <div className="gh-repo"
              onClick={() => openRepo(repo.name)}
              style={{ padding: "9px 12px", borderBottom: `1px solid ${C.border}`, background: selRepo === repo.name ? "rgba(99,102,241,.08)" : "transparent" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                {repo.private
                  ? <span style={{ fontSize: 9, color: C.amber, background: "rgba(251,191,36,.12)", border: "1px solid rgba(251,191,36,.25)", padding: "1px 5px", borderRadius: 4, fontFamily: "JetBrains Mono" }}>private</span>
                  : <span style={{ fontSize: 9, color: C.green, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.2)", padding: "1px 5px", borderRadius: 4, fontFamily: "JetBrains Mono" }}>public</span>}
                <span style={{ flex: 1, fontSize: 12, color: selRepo === repo.name ? C.indigo : C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {repo.name}
                </span>
                <span style={{ fontSize: 9, color: C.dim, fontFamily: "JetBrains Mono" }}>⭐ {repo.stars}</span>
              </div>
              <div style={{ fontSize: 10, color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{repo.desc}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: LANG_COLORS[repo.lang] || LANG_COLORS.default, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: C.dim, fontFamily: "JetBrains Mono" }}>{repo.lang}</span>
                <span style={{ marginLeft: "auto", fontSize: 9, color: C.muted, fontFamily: "JetBrains Mono" }}>{repo.updated}</span>
              </div>
            </div>

            {/* File list inside repo */}
            {selRepo === repo.name && (
              <div style={{ background: "rgba(0,0,0,.25)", borderBottom: `1px solid ${C.border}` }}>
                {loading
                  ? <div style={{ padding: "12px 18px", fontSize: 11, color: C.dim, fontFamily: "JetBrains Mono", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, border: `1.5px solid rgba(99,102,241,.3)`, borderTopColor: C.indigo, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                    Loading files…
                  </div>
                  : (GH_REPO_FILES[repo.name] || []).map((f, i) => (
                    <div key={i} className="gh-file"
                      onClick={() => !f.endsWith("/") && openFile(f)}
                      style={{ padding: "5px 12px 5px 26px", display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: f.endsWith("/") ? C.orange : C.sub, fontFamily: "JetBrains Mono", cursor: f.endsWith("/") ? "default" : "pointer" }}>
                      <span style={{ fontSize: 12 }}>{f.endsWith("/") ? "📁" : "📄"}</span>
                      <span>{f}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.border}` }}>
        <button
          onClick={() => { setConnected(false); setSelRepo(null); setToken(""); }}
          style={{ width: "100%", padding: "6px 0", borderRadius: 7, background: "transparent", border: `1px solid ${C.border}`, color: C.dim, fontFamily: "Syne", fontSize: 11, cursor: "pointer", transition: "all .2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,.3)"; e.currentTarget.style.color = C.red; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}>
          Disconnect GitHub
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATIONS DROPDOWN
═══════════════════════════════════════════════════════════════ */
function NotificationsDropdown({ notifs, onMarkRead, onMarkAllRead, onClear, onClose }) {
  const unread = notifs.filter(n => !n.read).length;
  const TYPE_COLORS = { lesson: C.amber, xp: C.green, ws: C.cyan, streak: C.orange, analyze: C.indigo, quiz: C.violet };

  return (
    <div
      style={{ position: "fixed", top: 44, right: 12, width: 320, background: C.panel, border: `1px solid rgba(99,102,241,.25)`, borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,.75)", zIndex: 9500, overflow: "hidden", animation: "notifSlide .2s ease both" }}
      onClick={e => e.stopPropagation()}>

      {/* Header */}
      <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "Syne" }}>Notifications</span>
          {unread > 0 && <span style={{ background: C.indigo, color: "white", fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 100, fontFamily: "JetBrains Mono" }}>{unread}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {unread > 0 && <span onClick={onMarkAllRead} style={{ fontSize: 11, color: C.indigo, cursor: "pointer", fontFamily: "Syne" }}>Mark all read</span>}
          <span onClick={onClose} style={{ color: C.muted, fontSize: 16, cursor: "pointer", lineHeight: 1 }}>×</span>
        </div>
      </div>

      {/* Notification list */}
      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {notifs.length === 0
          ? <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 13, color: C.dim, fontFamily: "Syne" }}>All caught up! 🎉</div>
          : notifs.map(n => (
            <div key={n.id} className="notif-item"
              onClick={() => onMarkRead(n.id)}
              style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "flex-start", background: n.read ? "transparent" : "rgba(99,102,241,.04)" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: `${TYPE_COLORS[n.type] || C.indigo}14`, border: `1px solid ${TYPE_COLORS[n.type] || C.indigo}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{n.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: n.read ? C.sub : C.text, fontFamily: "Syne" }}>{n.title}</span>
                  <span style={{ fontSize: 10, color: C.muted, fontFamily: "JetBrains Mono", flexShrink: 0 }}>{n.time}</span>
                </div>
                <div style={{ fontSize: 11, color: C.dim, fontFamily: "Syne", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>
              </div>
              {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.indigo, flexShrink: 0, marginTop: 4 }} />}
            </div>
          ))
        }
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
        <span onClick={onClear} style={{ fontSize: 11, color: C.dim, cursor: "pointer", fontFamily: "Syne", transition: "color .15s" }} onMouseEnter={e => e.target.style.color = C.red} onMouseLeave={e => e.target.style.color = C.dim}>Clear all</span>
        <span style={{ fontSize: 11, color: C.dim, fontFamily: "JetBrains Mono" }}>⚙ Manage</span>
      </div>
    </div>
  );
}


function LandingPage({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 40);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: C.bg, fontFamily: "Syne" }}>
      <LandingCanvas />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 75% 65% at 50% 50%,transparent,rgba(7,9,15,.6) 65%,rgba(7,9,15,.98) 100%)", zIndex: 1, pointerEvents: "none" }} />

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "0 48px", height: 60, display: "flex", alignItems: "center", background: scrolled ? "rgba(7,9,15,.92)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? `1px solid ${C.border}` : "none", transition: "all .3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", animation: "breathe 3s ease-in-out infinite" }}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 4L10 16L17 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="16" r="2.2" fill="#fbbf24" /></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#f1f5f9", letterSpacing: "-.01em" }}>Veda</span>
          <span style={{ fontSize: 9, color: C.indigo, fontFamily: "JetBrains Mono", letterSpacing: ".16em", marginTop: 1 }}>LEARN</span>
        </div>
        <div style={{ flex: 1 }} />
        {["Features", "How it works", "Testimonials", "GitHub"].map(l => (
          <span key={l} style={{ color: C.dim, fontSize: 13, fontWeight: 500, marginLeft: 28, cursor: "pointer", transition: "color .2s" }} onMouseEnter={e => e.target.style.color = C.text} onMouseLeave={e => e.target.style.color = C.dim}>{l}</span>
        ))}
        <button className="veda-btn" style={{ marginLeft: 28, padding: "8px 20px", fontSize: 13, borderRadius: 9 }} onClick={onGetStarted}>Get Started →</button>
      </nav>

      {/* SCROLLABLE CONTENT */}
      <div ref={scrollRef} style={{ position: "absolute", inset: 0, zIndex: 5, overflowY: "auto", overflowX: "hidden" }}>

        {/* ── HERO ── */}
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 70, paddingBottom: 60 }}>
          <div style={{ textAlign: "center", maxWidth: 800, padding: "0 40px" }}>
            {/* Eyebrow badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28, padding: "6px 16px 6px 8px", borderRadius: 100, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)", animation: "fadeUp .5s ease both" }}>
              <span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 100, padding: "2px 10px", fontSize: 10, color: "white", fontWeight: 700, fontFamily: "JetBrains Mono", letterSpacing: ".08em" }}>v2.0</span>
              <span style={{ fontSize: 12, color: C.sub }}>Web IDE · No extension required · AWS-native</span>
            </div>

            <h1 style={{ fontWeight: 800, fontSize: "clamp(38px,5.5vw,68px)", lineHeight: 1.06, letterSpacing: "-.04em", marginBottom: 24, animation: "fadeUp .6s ease 80ms both" }}>
              AI that teaches you,<br />
              <span style={{ background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 45%,#fbbf24 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>not just fixes you.</span>
            </h1>

            <p style={{ fontSize: 17, color: C.sub, lineHeight: 1.8, maxWidth: 520, margin: "0 auto 44px", animation: "fadeUp .6s ease 160ms both" }}>
              Write code in the browser. Veda detects mistakes in real time, explains them with voice, quizzes your understanding, and tracks your growth — powered by Claude and AWS.
            </p>

            <div style={{ display: "flex", gap: 14, justifyContent: "center", animation: "fadeUp .6s ease 240ms both" }}>
              <button className="veda-btn" style={{ fontSize: 16, padding: "15px 44px" }} onClick={onGetStarted}>Open the IDE →</button>
              <button className="ghost-btn" style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(99,102,241,.2)", border: "1px solid rgba(99,102,241,.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>▶</span>
                Watch Demo
              </button>
            </div>

            {/* Social proof avatars */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 40, animation: "fadeUp .6s ease 320ms both" }}>
              <div style={{ display: "flex" }}>
                {[["A", C.indigo], ["P", C.violet], ["R", C.amber], ["S", C.green], ["K", C.pink]].map(([l, c], i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${c},${c}88)`, border: "2px solid #07090f", marginLeft: i ? -8 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white", zIndex: 5 - i }}>{l}</div>
                ))}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>Built for hackathon developers</div>
                <div style={{ fontSize: 11, color: C.dim }}>Pure AWS · OpenRouter · Zero Railway</div>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: "flex", gap: 0, marginTop: 60, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: "rgba(99,102,241,.03)", animation: "fadeUp .6s ease 400ms both", width: "100%", maxWidth: 900 }}>
            {[["<3s", "Detection speed", "Haiku"], ["0.85", "Min confidence", "threshold"], ["6", "Bug patterns", "detected"], ["$0", "Free to start", "open source"]].map(([v, l, s], i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", padding: "24px 0", borderRight: i < 3 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ fontWeight: 800, fontSize: 26, background: "linear-gradient(135deg,#6366f1,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{v}</div>
                <div style={{ fontSize: 12, color: C.sub, fontWeight: 600, marginTop: 3 }}>{l}</div>
                <div style={{ fontSize: 10, color: C.muted, fontFamily: "JetBrains Mono", marginTop: 1 }}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FEATURE CARDS ── */}
        <div style={{ padding: "80px 48px 40px", maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-block", fontSize: 10, fontFamily: "JetBrains Mono", color: C.indigo, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 14, padding: "4px 14px", borderRadius: 100, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.2)" }}>Everything You Need</div>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(28px,3.5vw,44px)", letterSpacing: "-.025em", color: C.text, lineHeight: 1.15 }}>One tool.<span style={{ color: C.sub, fontWeight: 600 }}> Every lesson.</span></h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
            {FEATURES_FULL.map((f, i) => (
              <div key={i} className="feature-card"
                style={{ background: "rgba(13,17,23,.7)", border: `1px solid ${f.c}20`, borderRadius: 16, padding: "26px 24px", boxShadow: `0 4px 24px rgba(0,0,0,.3)`, backdropFilter: "blur(8px)", animation: `fadeUp .5s ease ${i * 60}ms both` }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: `${f.c}14`, border: `1px solid ${f.c}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>{f.title}</div>
                <p style={{ fontSize: 13, color: C.dim, lineHeight: 1.72, margin: "0 0 14px" }}>{f.desc}</p>
                <span style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: f.c, background: `${f.c}10`, border: `1px solid ${f.c}22`, padding: "3px 10px", borderRadius: 100 }}>{f.tag}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div style={{ padding: "60px 48px", maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ display: "inline-block", fontSize: 10, fontFamily: "JetBrains Mono", color: C.amber, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 14, padding: "4px 14px", borderRadius: 100, background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)" }}>How It Works</div>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(26px,3vw,40px)", letterSpacing: "-.025em", color: C.text }}>Three steps to mastery</h2>
          </div>
          <div style={{ position: "relative" }}>
            {/* vertical connector */}
            <div style={{ position: "absolute", left: 38, top: 54, bottom: 54, width: 1, background: "linear-gradient(to bottom,rgba(99,102,241,.4),transparent)", zIndex: 0 }} />
            {STEPS.map((s, i) => (
              <div key={i} className="step-row" style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: 20, alignItems: "flex-start", padding: "20px 0", position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: `linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.18))`, border: "1px solid rgba(99,102,241,.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 0 24px rgba(99,102,241,.12)" }}>{s.icon}</div>
                </div>
                <div style={{ paddingTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: 10, color: C.indigo, background: "rgba(99,102,241,.1)", padding: "2px 8px", borderRadius: 100 }}>{s.n}</span>
                    <span style={{ fontWeight: 700, fontSize: 20, color: C.text }}>{s.title}</span>
                  </div>
                  <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.72, maxWidth: 540, margin: 0 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TESTIMONIALS ── */}
        <div style={{ padding: "60px 48px 40px", maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-block", fontSize: 10, fontFamily: "JetBrains Mono", color: C.green, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 14, padding: "4px 14px", borderRadius: 100, background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)" }}>What Developers Say</div>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(24px,3vw,38px)", letterSpacing: "-.025em", color: C.text }}>Developers who learned something new</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ background: "rgba(13,17,23,.7)", border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px", backdropFilter: "blur(8px)", animation: `fadeUp .5s ease ${i * 80}ms both` }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg,${t.c},${t.c}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white" }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: C.dim, fontFamily: "JetBrains Mono" }}>{t.role}</div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 1 }}>{[1, 2, 3, 4, 5].map(s => <span key={s} style={{ fontSize: 12, color: C.amber }}>★</span>)}</div>
                </div>
                <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.75, margin: 0, fontStyle: "italic" }}>"{t.body}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── TECH STACK ── */}
        <div style={{ padding: "40px 48px", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: "rgba(99,102,241,.025)" }}>
          <p style={{ textAlign: "center", fontSize: 10, color: C.muted, fontFamily: "JetBrains Mono", letterSpacing: ".15em", textTransform: "uppercase", marginBottom: 24 }}>Powered by</p>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 8, maxWidth: 1000, margin: "0 auto" }}>
            {[["Claude Haiku", C.indigo], ["Claude Sonnet", C.violet], ["Amazon Polly", C.orange], ["API Gateway WS", C.green], ["DynamoDB", C.cyan], ["OpenSearch", C.pink], ["Lambda", C.amber], ["S3", C.green], ["Vercel", C.text], ["Monaco Editor", C.indigo], ["React 18 + Vite", "#61dafb"], ["Three.js", "#049ef4"]].map(([l, c]) => (
              <span key={l} style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: c, background: `${c}0f`, border: `1px solid ${c}22`, padding: "5px 14px", borderRadius: 100 }}>{l}</span>
            ))}
          </div>
        </div>

        {/* ── FINAL CTA ── */}
        <div style={{ padding: "100px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(99,102,241,.14) 0%,transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <h2 style={{ fontWeight: 800, fontSize: "clamp(30px,4vw,52px)", letterSpacing: "-.03em", lineHeight: 1.1, color: C.text, marginBottom: 18 }}>
              Stop letting AI make you<br />
              <span style={{ background: "linear-gradient(135deg,#6366f1,#a78bfa,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>weaker.</span>
            </h2>
            <p style={{ fontSize: 16, color: C.dim, maxWidth: 420, margin: "0 auto 36px", lineHeight: 1.75 }}>Every other AI tool is your employee. Veda Learn is your professor.</p>
            <button className="veda-btn" style={{ fontSize: 16, padding: "16px 48px" }} onClick={onGetStarted}>Open the IDE →</button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "28px 48px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="11" height="11" viewBox="0 0 20 20" fill="none"><path d="M3 4L10 16L17 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="16" r="2" fill="#fbbf24" /></svg>
            </div>
            <span style={{ fontWeight: 700, color: C.dim, fontSize: 13 }}>Veda Learn</span>
            <span style={{ color: C.muted }}>·</span>
            <span style={{ fontSize: 11, color: C.muted, fontFamily: "JetBrains Mono" }}>AWS Hackathon Edition</span>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy", "Terms", "GitHub", "Contact"].map(l => (
              <span key={l} style={{ fontSize: 12, color: C.muted, cursor: "pointer", transition: "color .2s" }} onMouseEnter={e => e.target.style.color = C.sub} onMouseLeave={e => e.target.style.color = C.muted}>{l}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════════════════════════════════ */
function LoginPage({ onLogin, onBack }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("idle"); // idle | github | guest
  const [progress, setProgress] = useState(0);

  const handleGitHubLogin = () => {
    const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const APP_URL = import.meta.env.VITE_APP_URL;
    const CALLBACK = `${APP_URL}/auth/callback`;
    const OAUTH_URL = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${CALLBACK}&scope=user:email,repo`;

    window.location.href = OAUTH_URL;
  };

  const handleGuestLogin = () => {
    setStep("guest"); setLoading(true); setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(p + Math.random() * 18, 95)), 220);
    setTimeout(() => { clearInterval(interval); setProgress(100); setTimeout(() => { setLoading(false); onLogin(); }, 300); }, 2000);
  };

  const PERKS = ["⚡ Live bug detection", "📖 Voice lessons", "🎯 Adaptive quizzes", "📁 GitHub file browser", "📈 Progress tracking"];

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne" }}>
      <LoginCanvas />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 70% at 50% 50%,rgba(7,9,15,.25),rgba(7,9,15,.92) 70%)", zIndex: 1 }} />

      <button onClick={onBack} style={{ position: "absolute", top: 26, left: 36, zIndex: 20, background: "transparent", border: "none", color: C.dim, fontFamily: "Syne", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "color .2s" }} onMouseEnter={e => e.currentTarget.style.color = C.text} onMouseLeave={e => e.currentTarget.style.color = C.dim}>
        ← Back to Home
      </button>

      {/* Layout: card left, perks right */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", gap: 40, alignItems: "center", maxWidth: 840, width: "100%", padding: "0 40px" }}>

        {/* LOGIN CARD */}
        <div style={{ width: 420, flexShrink: 0, background: "rgba(13,17,23,.93)", backdropFilter: "blur(28px)", border: "1px solid rgba(99,102,241,.22)", borderRadius: 24, padding: "48px 44px", boxShadow: "0 40px 120px rgba(0,0,0,.75), 0 0 0 1px rgba(99,102,241,.08)", animation: "fadeUp .5s ease both" }}>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 0 44px rgba(99,102,241,.55)", animation: "breathe 3s ease-in-out infinite" }}>
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none"><path d="M3 4L10 16L17 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="16" r="2.2" fill="#fbbf24" /></svg>
            </div>
            <div style={{ fontWeight: 800, fontSize: 23, color: C.text, letterSpacing: "-.02em" }}>Welcome to Veda</div>
            <div style={{ fontSize: 13, color: C.dim, marginTop: 5 }}>Sign in to open the IDE</div>
          </div>

          {/* Progress bar */}
          {loading && (
            <div style={{ height: 2, borderRadius: 2, background: "rgba(99,102,241,.15)", overflow: "hidden", marginBottom: 18 }}>
              <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,${C.indigo},${C.violet})`, transition: "width .2s ease", borderRadius: 2 }} />
            </div>
          )}

          {/* GitHub button */}
          <button onClick={handleGitHubLogin} disabled={loading}
            style={{ width: "100%", padding: "15px 24px", borderRadius: 13, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: C.text, fontFamily: "Syne", fontWeight: 600, fontSize: 15, cursor: loading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, transition: "all .2s", marginBottom: 14 }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(255,255,255,.09)"; e.currentTarget.style.borderColor = "rgba(99,102,241,.4)"; } }}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = "rgba(255,255,255,.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; } }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={C.text}><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>Continue with GitHub
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.06)" }} /><span style={{ fontSize: 11, color: C.dim, fontFamily: "JetBrains Mono" }}>or</span><div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.06)" }} />
          </div>

          <button onClick={handleGuestLogin} disabled={loading}
            style={{ width: "100%", padding: "13px 24px", borderRadius: 13, background: "transparent", border: "1px solid rgba(255,255,255,.07)", color: C.dim, fontFamily: "Syne", fontSize: 14, cursor: "pointer", transition: "all .2s", marginBottom: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,.28)"; e.currentTarget.style.color = C.sub; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.07)"; e.currentTarget.style.color = C.dim; }}>
            {loading && step === "guest" ? <><div style={{ width: 14, height: 14, border: "1.5px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite" }} />Loading…</> : "👤  Continue as Guest"}
          </button>

          <p style={{ textAlign: "center", fontSize: 10.5, color: C.muted, fontFamily: "JetBrains Mono", lineHeight: 1.7 }}>
            Requests <code style={{ color: C.sub }}>user:email</code> and <code style={{ color: C.sub }}>repo</code> scope.<br />
            Your code never leaves your browser.
          </p>
        </div>

        {/* RIGHT — PERKS */}
        <div style={{ flex: 1, animation: "slideRight .5s ease both" }}>
          <div style={{ fontSize: 11, color: C.indigo, fontFamily: "JetBrains Mono", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 20 }}>Inside the IDE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PERKS.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: "rgba(13,17,23,.7)", border: `1px solid ${C.border}`, backdropFilter: "blur(8px)", animation: `fadeUp .5s ease ${i * 70}ms both` }}>
                <span style={{ fontSize: 18 }}>{p.split(" ")[0]}</span>
                <span style={{ fontSize: 13, color: C.sub, fontWeight: 500 }}>{p.split(" ").slice(1).join(" ")}</span>
                <span style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: "16px", borderRadius: 12, background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.18)" }}>
            <div style={{ fontSize: 12, color: C.indigo, fontWeight: 600, marginBottom: 6 }}>🏆 Hackathon Edition</div>
            <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.7, fontFamily: "Syne" }}>Built on AWS Lambda · API Gateway WebSocket · DynamoDB · OpenSearch · Amazon Polly · Claude Haiku + Sonnet</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LESSON PANEL
═══════════════════════════════════════════════════════════════ */
function LessonPanel({ lesson, onGotIt, onDeepDive }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { if (lesson) { setVis(false); setTimeout(() => setVis(true), 60); } }, [lesson]);

  if (!lesson) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 14, animation: "breathe 3s ease-in-out infinite" }}>👁</div>
      <div style={{ fontWeight: 600, fontSize: 14, color: C.sub, marginBottom: 7, fontFamily: "Syne" }}>Veda is watching</div>
      <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.75, maxWidth: 200, fontFamily: "Syne" }}>Write code and pause 30 seconds — or click ▶ Analyze.</div>
      <div style={{ marginTop: 18, fontSize: 11, color: C.muted, fontFamily: "JetBrains Mono", background: C.surface, padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}` }}>Ctrl+P to open command palette</div>
    </div>
  );

  const SEV = {
    bug: { bg: "rgba(239,68,68,.09)", brd: "rgba(239,68,68,.25)", c: C.red, label: "🔴 Bug" },
    antipattern: { bg: "rgba(249,115,22,.09)", brd: "rgba(249,115,22,.25)", c: C.orange, label: "🟠 Anti-pattern" },
    performance: { bg: "rgba(234,179,8,.09)", brd: "rgba(234,179,8,.25)", c: C.amber, label: "🟡 Performance" },
  };
  const s = SEV[lesson.mistakeType] || SEV.antipattern;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11, opacity: vis ? 1 : 0, transition: "opacity .4s ease", fontFamily: "Syne" }}>
      {/* Header card */}
      <div style={{ background: s.bg, border: `1px solid ${s.brd}`, borderRadius: 12, padding: "13px 15px", animation: vis ? "fadeUp .35s ease both" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: s.c, fontFamily: "JetBrains Mono", letterSpacing: ".06em", textTransform: "uppercase" }}>{s.label} · {lesson.conceptId?.replace(/-/g, " ")}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ background: "transparent", border: "none", color: C.sub, cursor: "pointer", fontSize: 13, padding: "2px 4px", borderRadius: 5, transition: "color .15s" }} title="Play audio" onMouseEnter={e => e.target.style.color = C.text} onMouseLeave={e => e.target.style.color = C.sub}>🔊</button>
            <button style={{ background: "transparent", border: "none", color: C.sub, cursor: "pointer", fontSize: 13, padding: "2px 4px", borderRadius: 5, transition: "color .15s" }} title="Mute" onMouseEnter={e => e.target.style.color = C.text} onMouseLeave={e => e.target.style.color = C.sub}>🔇</button>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.75, margin: 0 }}>{lesson.explanation}</p>
      </div>

      {/* Code fix */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", animation: vis ? "fadeUp .35s ease 110ms both" : "none" }}>
        <div style={{ padding: "8px 13px", borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, color: C.dim, fontFamily: "JetBrains Mono", letterSpacing: ".07em", textTransform: "uppercase" }}>Code Fix</div>
        <div style={{ padding: "11px 13px" }}>
          <div style={{ fontSize: 10, color: C.red, fontFamily: "JetBrains Mono", marginBottom: 4 }}>⚠ Before</div>
          <SyntaxHighlighter language="python" style={vscDarkPlus} customStyle={{ borderRadius: 7, fontSize: 11, margin: "0 0 10px", padding: "9px 11px" }}>
            {lesson.codeBefore}
          </SyntaxHighlighter>
          <div style={{ fontSize: 10, color: C.green, fontFamily: "JetBrains Mono", marginBottom: 4 }}>✓ After</div>
          <SyntaxHighlighter language="python" style={vscDarkPlus} customStyle={{ borderRadius: 7, fontSize: 11, margin: 0, padding: "9px 11px" }}>
            {lesson.codeAfter}
          </SyntaxHighlighter>
          {lesson.codeComment && <p style={{ fontSize: 11, color: "#a78bfa", fontFamily: "JetBrains Mono", margin: "7px 0 0", fontStyle: "italic" }}>{lesson.codeComment}</p>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, animation: vis ? "fadeUp .35s ease 200ms both" : "none" }}>
        <button onClick={onGotIt} style={{ flex: 1, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.28)", borderRadius: 10, padding: "10px 0", color: C.green, fontFamily: "Syne", fontWeight: 700, fontSize: 12.5, cursor: "pointer", transition: "all .2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(16,185,129,.2)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(16,185,129,.1)"}>Got it ✓</button>
        <button onClick={onDeepDive} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 0", color: C.sub, fontFamily: "Syne", fontSize: 12.5, cursor: "pointer", transition: "all .2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,.4)"; e.currentTarget.style.color = C.indigo; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.sub; }}>Deep Dive 🔍</button>
      </div>

      {/* Concept badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.14)", borderRadius: 10, animation: vis ? "fadeUp .35s ease 280ms both" : "none" }}>
        <span style={{ fontSize: 13 }}>💡</span>
        <div>
          <div style={{ fontSize: 11, color: C.indigo, fontWeight: 600 }}>Concept: {lesson.conceptId}</div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: "JetBrains Mono", marginTop: 1 }}>Line {lesson.lineNumber} · High confidence</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: C.dim, fontFamily: "JetBrains Mono" }}>+15 XP</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DEEP DIVE PANEL
═══════════════════════════════════════════════════════════════ */
function DeepDivePanel({ lesson, onBack }) {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  useEffect(() => {
    setTimeout(() => {
      setContent(`Deep Dive: ${lesson?.conceptId?.replace(/-/g, " ")}

WHY IT HAPPENS
Python's default argument evaluation is a deliberate design decision, not a bug. The default value is bound to the function object at definition time — it lives inside the function's __defaults__ attribute. This means the list object is created once and reused.

PROOF
>>> def f(x, lst=[]):
...     lst.append(x)
...     return lst
>>> f(1)
[1]
>>> f(2)   # You'd expect [2] — you get [1, 2]!
[1, 2]
>>> f.__defaults__
([1, 2],)  # The same object lives here

BROADER PATTERN
This affects any mutable type as a default:
  • Lists  []
  • Dicts  {}
  • Sets   set()
  • Custom objects with __init__ that mutates

IDIOMATIC FIX PATTERNS
1. None sentinel (most common):
   def fn(x, lst=None):
       if lst is None: lst = []

2. Type annotation with default_factory (dataclasses):
   from dataclasses import dataclass, field
   @dataclass
   class Foo:
       items: list = field(default_factory=list)

3. *args unpacking for read-only defaults:
   def fn(*args, default=(1, 2, 3)):  # tuples are safe

REAL WORLD IMPACT
Django ORM had a similar issue with ManyToMany field defaults.
SQLAlchemy column defaults must use lambda: [] not [].
Flask route registration can exhibit this if decorators aren't careful.`);
      setLoading(false);
    }, 1800);
  }, [lesson]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: "Syne" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.dim, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5, fontFamily: "Syne" }} onMouseEnter={e => e.currentTarget.style.color = C.text} onMouseLeave={e => e.currentTarget.style.color = C.dim}>← Back</button>
        <span style={{ fontSize: 12, color: C.indigo, fontWeight: 600 }}>Deep Dive · Claude Opus</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: C.amber, fontFamily: "JetBrains Mono" }}>+30 XP</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 14 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.indigo, animation: `dot${i + 1} .9s ease-in-out infinite` }} />)}
            </div>
            <div style={{ fontSize: 12, color: C.dim }}>Claude Opus is composing a deep explanation...</div>
          </div>
        ) : (
          <div style={{ fontFamily: "JetBrains Mono", fontSize: 11.5, color: C.sub, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{content}</div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   QUIZ PANEL
═══════════════════════════════════════════════════════════════ */
function QuizPanel({ questions, onDone, onConfetti }) {
  const [qi, setQi] = useState(0);
  const [sel, setSel] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const answer = (i) => {
    if (answered) return;
    setSel(i); setAnswered(true);
    const ok = i === questions[qi].ans;
    const ns = score + (ok ? 1 : 0);
    if (ok) setScore(s => s + 1);
    if (qi + 1 >= questions.length) {
      setTimeout(() => { setDone(true); if (ns >= 2) onConfetti?.(); }, 1100);
    } else {
      setTimeout(() => { setQi(q => q + 1); setSel(null); setAnswered(false); }, 1250);
    }
  };

  if (!questions || questions.length === 0) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center", fontFamily: "Syne" }}>
      <div><div style={{ fontSize: 36, marginBottom: 12, opacity: .35 }}>🎯</div><div style={{ fontSize: 13, color: C.dim }}>Quiz appears after each lesson</div><div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontFamily: "JetBrains Mono" }}>Click "Got it ✓" to trigger</div></div>
    </div>
  );

  if (done) {
    const pass = score >= 2;
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center", fontFamily: "Syne" }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>{pass ? "🏆" : score > 0 ? "⭐" : "📚"}</div>
        <div style={{ fontWeight: 800, fontSize: 32, color: C.text, marginBottom: 4 }}>{score}/{questions.length}</div>
        <div style={{ fontSize: 13, color: pass ? C.green : C.sub, marginBottom: 10 }}>{pass ? "+15 XP · Concept mastered!" : "+5 XP · Keep practicing"}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ padding: "5px 14px", borderRadius: 100, background: `${pass ? C.green : C.amber}12`, border: `1px solid ${pass ? C.green : C.amber}30`, fontSize: 11, color: pass ? C.green : C.amber, fontFamily: "JetBrains Mono" }}>
            {pass ? "✓ Mastered" : "↗ Keep going"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { setQi(0); setSel(null); setAnswered(false); setScore(0); setDone(false); }} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.sub, fontFamily: "Syne", fontSize: 13, cursor: "pointer" }}>Retry</button>
          <button onClick={onDone} style={{ padding: "10px 20px", borderRadius: 10, background: `linear-gradient(135deg,${C.indigo},${C.violet})`, border: "none", color: "white", fontFamily: "Syne", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Progress →</button>
        </div>
      </div>
    );
  }

  const q = questions[qi];
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", fontFamily: "Syne" }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.dim, fontFamily: "JetBrains Mono", marginBottom: 5 }}>
          <span>Q {qi + 1} / {questions.length}</span>
          <span style={{ color: C.indigo }}>mutable-default</span>
        </div>
        <div style={{ height: 2, background: C.surface, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", background: `linear-gradient(90deg,${C.indigo},${C.violet})`, borderRadius: 2, transition: "width .4s ease", width: `${(qi / questions.length) * 100}%` }} />
        </div>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "12px 14px", marginBottom: 10 }}>
        <p style={{ fontSize: 13, color: C.text, lineHeight: 1.72, margin: 0, fontWeight: 500 }}>{q.q}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
        {q.opts.map((opt, i) => {
          const isC = i === q.ans, isSel = sel === i;
          let bg = "rgba(13,17,23,.5)", brd = C.border, col = C.sub;
          if (answered && isC) { bg = "rgba(16,185,129,.1)"; brd = "rgba(16,185,129,.3)"; col = C.green; }
          if (answered && isSel && !isC) { bg = "rgba(239,68,68,.1)"; brd = "rgba(239,68,68,.28)"; col = C.red; }
          return (
            <button key={i} onClick={() => answer(i)} disabled={answered}
              style={{ width: "100%", textAlign: "left", padding: "10px 13px", borderRadius: 9, background: bg, border: `1px solid ${brd}`, color: col, fontFamily: "Syne", fontSize: 12.5, cursor: answered ? "default" : "pointer", transition: "all .18s", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 20, height: 20, borderRadius: 6, background: answered && isC ? "rgba(16,185,129,.18)" : answered && isSel ? "rgba(239,68,68,.18)" : C.surface, border: `1px solid ${answered && isC ? C.green : answered && isSel ? C.red : C.muted}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: answered && isC ? C.green : answered && isSel ? C.red : C.dim, flexShrink: 0 }}>
                {answered ? (isC ? "✓" : isSel ? "✗" : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
      {answered && <div style={{ background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.18)", borderRadius: 10, padding: "10px 12px", fontSize: 12, color: "#a5b4fc", lineHeight: 1.7, fontFamily: "Syne" }}>💡 {q.exp}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DOUBT PANEL
═══════════════════════════════════════════════════════════════ */
function DoubtPanel({ activeFile }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const STARTERS = ["Why is mutable default bad?", "Explain async/await", "How to fix callback hell?", "What is type safety in TS?"];
  const ANSWERS = {
    "Why is mutable default bad?": "Python evaluates default arguments once at function definition time — not per call. A mutable list `[]` as a default is shared across all invocations. The fix is `cart=None` with `if cart is None: cart = []` inside the body, creating a fresh list per call.",
    "Explain async/await": "async/await is syntactic sugar over Promises. An `async` function always returns a Promise. `await` pauses execution inside that async context until the Promise resolves — keeping the JS event loop free. It flattens nested callbacks into readable, sequential-looking code.",
    "How to fix callback hell?": "Refactor to async/await:\n\n// Instead of nested callbacks:\ngetUser(id, (err, user) => {\n  getOrders(user.id, (err, orders) => { ... })\n})\n\n// Use:\nconst user = await getUser(id);\nconst orders = await getOrders(user.id);",
    "What is type safety in TS?": "TypeScript's type system catches shape mismatches at compile time. Using `any` bypasses this — you lose autocomplete, refactoring safety, and error detection. Instead use:\n• Specific interfaces: `interface User { id: string; name: string; }`\n• Generics: `axios.get<User>('/api/user')`\n• Union types: `string | number`",
  };
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = (text) => {
    const t = text || input.trim(); if (!t || loading) return;
    setInput(""); setMsgs(m => [...m, { role: "user", content: t }]); setLoading(true);
    setTimeout(() => {
      const ans = ANSWERS[t] || `Great question about "${t}". In the context of ${activeFile}, the key principle is defensive programming — always consider what happens when state leaks between calls or types don't match expectations. The pattern Veda detected is closely related to this broader concept of hidden shared state.`;
      setMsgs(m => [...m, { role: "assistant", content: ans }]); setLoading(false);
    }, 1300);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, fontFamily: "Syne" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.length === 0 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 18, paddingTop: 6 }}>
              <div style={{ fontSize: 26, marginBottom: 7 }}>💬</div>
              <div style={{ fontSize: 12.5, color: C.sub }}>Ask anything about your code</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 3, fontFamily: "JetBrains Mono" }}>Context: {activeFile}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {STARTERS.map(s => (
                <button key={s} onClick={() => send(s)} style={{ textAlign: "left", fontSize: 11, padding: "9px 11px", borderRadius: 9, background: C.surface, border: `1px solid ${C.border}`, color: C.sub, fontFamily: "Syne", cursor: "pointer", lineHeight: 1.5, transition: "all .2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,.35)"; e.currentTarget.style.color = C.text; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.sub; }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "88%", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "9px 13px", background: m.role === "user" ? `linear-gradient(135deg,${C.indigo},${C.violet})` : C.surface, border: m.role === "user" ? "none" : `1px solid ${C.border}`, fontSize: 12.5, color: C.text, lineHeight: 1.72, whiteSpace: "pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "14px 14px 14px 4px", padding: "11px 14px", display: "flex", gap: 4, alignItems: "center" }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.indigo, animation: `dot${i + 1} .9s ease-in-out infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 7 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about your code..."
          style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: "8px 11px", fontSize: 12.5, color: C.text, fontFamily: "Syne", outline: "none", transition: "border-color .2s" }}
          onFocus={e => e.target.style.borderColor = "rgba(99,102,241,.5)"} onBlur={e => e.target.style.borderColor = C.border} />
        <button onClick={() => send()} disabled={!input.trim() || loading} style={{ width: 34, height: 34, borderRadius: 9, background: C.indigo, border: "none", color: "white", fontSize: 15, cursor: "pointer", opacity: input.trim() && !loading ? 1 : .35, transition: "opacity .2s", display: "flex", alignItems: "center", justifyContent: "center" }}>↑</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROGRESS PANEL
═══════════════════════════════════════════════════════════════ */
function ProgressPanel({ xp, streak }) {
  const CONCEPTS = [["mutable-default", 82, "python", C.red], ["callback-hell", 64, "javascript", C.orange], ["any-type", 41, "typescript", C.cyan], ["n-plus-one", 28, "python", C.violet]];
  const DAYS = ["M", "T", "W", "T", "F", "S", "S"], WEEK = [3, 5, 2, 7, 4, 6, 8], max = 8;
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, fontFamily: "Syne" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
        {[[`⚡`, xp || 847, "XP", C.amber], ["🔥", `${streak || 12}d`, "Streak", C.orange], ["🧠", 4, "Mastered", C.green]].map(([ic, v, l, c]) => (
          <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "11px 9px", textAlign: "center" }}>
            <div style={{ fontSize: 18, marginBottom: 3 }}>{ic}</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: c }}>{v}</div>
            <div style={{ fontSize: 10, color: C.dim, fontFamily: "JetBrains Mono", marginTop: 1 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "13px 14px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, fontFamily: "JetBrains Mono", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 10 }}>Weekly Activity</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 44 }}>
          {WEEK.map((v, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", borderRadius: 3, background: i === 6 ? `linear-gradient(to top,${C.indigo},${C.violet})` : "rgba(99,102,241,.2)", height: `${(v / max) * 38}px`, transition: "height .6s ease", boxShadow: i === 6 ? `0 0 10px rgba(99,102,241,.35)` : "none" }} />
              <span style={{ fontSize: 9, color: i === 6 ? C.indigo : C.muted, fontFamily: "JetBrains Mono" }}>{DAYS[i]}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, padding: "13px 14px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, fontFamily: "JetBrains Mono", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 10 }}>Concept Mastery</div>
        {CONCEPTS.map(([name, pct, lang, c]) => (
          <div key={name} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, color: C.dim, fontFamily: "JetBrains Mono", background: C.panel, padding: "1px 6px", borderRadius: 100, border: `1px solid ${C.border}` }}>{lang}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: c, fontFamily: "JetBrains Mono" }}>{pct}%</span>
              </div>
            </div>
            <div style={{ height: 3, background: "rgba(99,102,241,.1)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${c},${c}99)`, borderRadius: 3, transition: "width 1s ease" }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.18)", borderRadius: 11, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>🎯</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.indigo, fontWeight: 600, marginBottom: 2 }}>Next focus</div>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>n-plus-one pattern</div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: "JetBrains Mono" }}>28% mastered · Python</div>
        </div>
        <button style={{ padding: "6px 13px", borderRadius: 8, background: C.indigo, border: "none", color: "white", fontFamily: "Syne", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Start</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FILE TREE
═══════════════════════════════════════════════════════════════ */
function FileTree({ activeFile, onFileClick }) {
  const [open, setOpen] = useState(new Set(["veda-learn/", "src/", "handlers/"]));
  const ICONS = { python: "🐍", typescript: "💙", javascript: "🟡", json: "📋", folder: "📁" };
  const toggleFolder = (name) => setOpen(s => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });

  return (
    <div style={{ padding: "6px 0", fontFamily: "JetBrains Mono", fontSize: 11.5 }}>
      {FILES.map((f, i) => (
        <div key={i} className="file-row"
          style={{ padding: `4px ${6 + f.depth * 14}px`, display: "flex", alignItems: "center", gap: 6, borderRadius: 6, margin: "1px 6px", background: activeFile === f.name && f.type === "file" ? "rgba(99,102,241,.13)" : "transparent", color: activeFile === f.name && f.type === "file" ? C.text : C.sub }}
          onClick={() => f.type === "folder" ? toggleFolder(f.name) : onFileClick(f.name)}>
          {f.type === "folder"
            ? <><span style={{ fontSize: 9, color: C.dim, marginRight: 1, minWidth: 8 }}>{open.has(f.name) ? "▾" : "▸"}</span><span style={{ color: C.orange }}>{ICONS.folder}</span><span style={{ marginLeft: 2 }}>{f.name}</span></>
            : <><span style={{ marginLeft: 4 }}>{ICONS[f.lang] || "📄"}</span><span>{f.name}</span></>
          }
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH PANEL
═══════════════════════════════════════════════════════════════ */
function SearchPanel({ onFileClick }) {
  const [q, setQ] = useState("");
  const results = q.length > 1 ? FILES.filter(f => f.type === "file" && f.name.toLowerCase().includes(q.toLowerCase())) : [];
  const codeResults = q.length > 2 ? Object.entries(DEMO_CODE).filter(([, code]) => code.toLowerCase().includes(q.toLowerCase())).map(([file, code]) => {
    const lines = code.split("\n");
    const matchLine = lines.findIndex(l => l.toLowerCase().includes(q.toLowerCase()));
    return { file, line: matchLine + 1, text: lines[matchLine]?.trim().slice(0, 55) };
  }) : [];

  return (
    <div style={{ padding: "10px 10px", fontFamily: "Syne" }}>
      <div style={{ marginBottom: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search files..." style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 12, color: C.text, fontFamily: "JetBrains Mono", outline: "none" }} onFocus={e => e.target.style.borderColor = "rgba(99,102,241,.4)"} onBlur={e => e.target.style.borderColor = C.border} />
      </div>
      {q.length > 1 && results.length === 0 && codeResults.length === 0 && <div style={{ fontSize: 11, color: C.dim, padding: "8px 4px" }}>No results for "{q}"</div>}
      {results.length > 0 && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 9, color: C.muted, fontFamily: "JetBrains Mono", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5, padding: "0 4px" }}>Files</div>{results.map(f => <div key={f.name} className="file-row" onClick={() => onFileClick(f.name)} style={{ padding: "5px 8px", borderRadius: 6, marginBottom: 2, color: C.sub, fontSize: 11, fontFamily: "JetBrains Mono" }}>{f.name}</div>)}</div>}
      {codeResults.length > 0 && <div><div style={{ fontSize: 9, color: C.muted, fontFamily: "JetBrains Mono", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 5, padding: "0 4px" }}>In Files</div>{codeResults.map((r, i) => <div key={i} className="file-row" onClick={() => onFileClick(r.file)} style={{ padding: "6px 8px", borderRadius: 6, marginBottom: 3, cursor: "pointer" }}><div style={{ fontSize: 11, color: C.text, fontFamily: "JetBrains Mono" }}>{r.file}<span style={{ color: C.dim }}>:{r.line}</span></div><div style={{ fontSize: 10, color: C.dim, fontFamily: "JetBrains Mono", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.text}</div></div>)}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INTERACTIVE TERMINAL
═══════════════════════════════════════════════════════════════ */
function Terminal() {
  const [history, setHistory] = useState([
    { type: "info", text: "Veda Learn IDE Terminal · v2.0.0 · Type 'help' for commands" },
    { type: "prompt", text: "" },
  ]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  const runCmd = (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    setCmdHistory(h => [trimmed, ...h]); setHistIdx(-1);
    const output = TERMINAL_CMDS[trimmed] || (trimmed === "clear" ? null : `bash: ${trimmed}: command not found`);
    setHistory(h => {
      const newH = [...h.slice(0, -1), { type: "cmd", text: `veda@ide:~$ ${trimmed}` }];
      if (trimmed === "clear") return [{ type: "info", text: "Terminal cleared" }, { type: "prompt", text: "" }];
      if (output) {
        output.split("\n").forEach(line => newH.push({ type: "out", text: line }));
      }
      newH.push({ type: "prompt", text: "" });
      return newH;
    });
    setInput("");
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "8px 14px", fontFamily: "JetBrains Mono", fontSize: 11.5, cursor: "text" }} onClick={() => inputRef.current?.focus()}>
      {history.map((h, i) => (
        <div key={i} style={{ marginBottom: 1 }}>
          {h.type === "info" && <span style={{ color: "#4ade80" }}>{h.text}</span>}
          {h.type === "cmd" && <span style={{ color: C.sub }}>{h.text}</span>}
          {h.type === "out" && <span style={{ color: C.dim, whiteSpace: "pre" }}>{h.text}</span>}
          {h.type === "prompt" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#4ade80" }}>veda@ide:~$</span>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { runCmd(input); }
                  if (e.key === "ArrowUp") { e.preventDefault(); const idx = Math.min(histIdx + 1, cmdHistory.length - 1); setHistIdx(idx); setInput(cmdHistory[idx] || ""); }
                  if (e.key === "ArrowDown") { e.preventDefault(); const idx = Math.max(histIdx - 1, -1); setHistIdx(idx); setInput(idx === -1 ? "" : cmdHistory[idx] || ""); }
                }}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontFamily: "JetBrains Mono", fontSize: 11.5, padding: "0 4px" }}
                autoFocus
              />
              <span style={{ width: 6, height: 12, background: C.text, animation: "blink 1.1s step-end infinite" }} />
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MINIMAP
═══════════════════════════════════════════════════════════════ */
function Minimap({ code, activeFile }) {
  const lines = (code || "").split("\n");
  return (
    <div style={{ width: 44, background: C.bg, borderLeft: "1px solid rgba(255,255,255,.03)", padding: "14px 6px", overflow: "hidden", flexShrink: 0 }}>
      {lines.map((line, i) => {
        const len = Math.min(line.length, 28);
        const isKeyword = /def |class |import |async |return |const |function |export /.test(line);
        const isBug = activeFile === "cart.py" && (i === 2 || i === 14 || i === 18);
        return (
          <div key={i} style={{ height: 2, marginBottom: 0.6, display: "flex", alignItems: "center", gap: 1 }}>
            <div style={{ height: 1.5, width: len, background: isBug ? "rgba(239,68,68,.6)" : isKeyword ? "rgba(99,102,241,.5)" : "rgba(255,255,255,.1)", borderRadius: 1, maxWidth: 36 }} />
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   IDE PAGE
═══════════════════════════════════════════════════════════════ */
function IDEPage({ user }) {
  const [activeFile, setActiveFile] = useState("cart.py");
  const [openTabs, setOpenTabs] = useState(["cart.py", "api.ts"]);
  const [sidebarTab, setSidebarTab] = useState("explorer");
  const [rightPanel, setRightPanel] = useState("lesson");
  const [analyzing, setAnalyzing] = useState(false);
  const [lesson, setLesson] = useState(null);
  const [quizActive, setQuizActive] = useState(false);
  const [showLesson, setShowLesson] = useState(false);
  const [deepDive, setDeepDive] = useState(false);
  const [bottomPanel, setBottomPanel] = useState("terminal");
  const [bottomVis, setBottomVis] = useState(true);
  const [cmdPalette, setCmdPalette] = useState(false);
  const [settings, setSettings] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [menuOpen, setMenuOpen] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);
  const [xp, setXp] = useState(847);
  const [streak] = useState(12);
  const unreadCount = notifs.filter(n => !n.read).length;

  const addToast = useCallback((title, msg, type = "info") => {
    const id = Date.now();
    setToasts(t => [...t, { id, title, msg, type }]);
    setTimeout(() => setToasts(t => t.map(x => x.id === id ? { ...x, exiting: true } : x)), 3200);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const addNotif = useCallback((notif) => {
    setNotifs(n => [{ id: Date.now(), read: false, time: "just now", ...notif }, ...n]);
  }, []);

  const markRead = (id) => setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
  const markAllRead = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
  const clearNotifs = () => setNotifs([]);

  const openFile = (name) => {
    setActiveFile(name);
    if (!openTabs.includes(name)) setOpenTabs(t => [...t, name]);
    setSidebarTab(s => s); // keep sidebar
  };

  const closeTab = (name, e) => {
    e.stopPropagation();
    const next = openTabs.filter(t => t !== name);
    setOpenTabs(next);
    if (activeFile === name && next.length > 0) setActiveFile(next[next.length - 1]);
  };

  const triggerAnalyze = useCallback(() => {
    if (analyzing) return;
    setAnalyzing(true);
    addToast("Analyzing…", "Claude Haiku scanning " + activeFile, "info");
    setTimeout(() => {
      const lessonData = LESSONS_BY_FILE[activeFile];
      setAnalyzing(false);
      if (lessonData) {
        setLesson(lessonData);
        setShowLesson(true);
        setRightPanel("lesson");
        setDeepDive(false);
        setXp(x => x + 5);
        addToast("Mistake detected!", `${lessonData.conceptId} · Line ${lessonData.lineNumber}`, "warning");
      } else {
        addToast("No issues found", "Code looks clean!", "success");
      }
    }, 2400);
  }, [activeFile, analyzing, addToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") { e.preventDefault(); setCmdPalette(v => !v); }
      if ((e.ctrlKey || e.metaKey) && e.key === ",") { e.preventDefault(); setSettings(true); }
      if (e.key === "F5") { e.preventDefault(); triggerAnalyze(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "`") { e.preventDefault(); setBottomVis(v => !v); }
      if (e.key === "Escape") { setCmdPalette(false); setSettings(false); setMenuOpen(null); setNotifOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [triggerAnalyze]);

  const handleGotIt = () => {
    setQuizActive(true);
    setRightPanel("quiz");
    setXp(x => x + 5);
    addToast("Quiz unlocked!", "Answer 3 questions to earn +15 XP", "info");
  };

  const handleDeepDive = () => {
    setDeepDive(true);
    setRightPanel("lesson");
    addToast("Deep Dive", "Claude Opus composing full explanation…", "info");
  };

  const handleCmdAction = (item) => {
    const actions = {
      "Run Analysis": triggerAnalyze,
      "Toggle Terminal": () => setBottomVis(v => !v),
      "Open Settings": () => setSettings(true),
      "View Progress": () => setRightPanel("progress"),
      "Open Doubt Chat": () => setRightPanel("doubt"),
      "Start Quiz": () => { setQuizActive(true); setRightPanel("quiz"); },
      "Toggle Lesson Panel": () => setRightPanel("lesson"),
    };
    actions[item.label]?.();
    addToast(item.label, "", "info");
  };

  const MENUS = {
    File: [
      { label: "New File", shortcut: "Ctrl+N", action: () => { } },
      { label: "Open File", shortcut: "Ctrl+O", action: () => { } },
      { label: "Save", shortcut: "Ctrl+S", action: () => addToast("Saved", "cart.py saved", "success") },
      "---",
      { label: "Close Tab", shortcut: "Ctrl+W", action: () => { } },
    ],
    Edit: [
      { label: "Undo", shortcut: "Ctrl+Z", action: () => { } },
      { label: "Redo", shortcut: "Ctrl+Y", action: () => { } },
      "---",
      { label: "Find", shortcut: "Ctrl+F", action: () => setSidebarTab("search") },
      { label: "Format Document", shortcut: "⇧+Alt+F", action: () => { } },
    ],
    View: [
      { label: "Command Palette", shortcut: "Ctrl+P", action: () => setCmdPalette(true) },
      { label: "Toggle Terminal", shortcut: "Ctrl+`", action: () => setBottomVis(v => !v) },
      "---",
      { label: "Settings", shortcut: "Ctrl+,", action: () => setSettings(true) },
    ],
    Run: [
      { label: "Analyze Code", shortcut: "F5", action: triggerAnalyze },
      { label: "Run Tests", shortcut: "Ctrl+F5", action: () => addToast("Tests", "No test runner configured", "warning") },
    ],
    Terminal: [
      { label: "New Terminal", shortcut: "Ctrl+⇧+`", action: () => { setBottomVis(true); setBottomPanel("terminal"); } },
      { label: "Clear Terminal", shortcut: "", action: () => { } },
    ],
  };

  const ACT = [
    { id: "explorer", icon: "⊞", tip: "Explorer" },
    { id: "search", icon: "⌕", tip: "Search" },
    { id: "git", icon: "⑂", tip: "Source Control" },
    { id: "github", icon: "🐙", tip: "GitHub Repos" },
    { id: "veda", icon: "👁", tip: "Veda Insights" },
  ];

  const PANEL_TABS = [
    { id: "lesson", icon: "📖", label: "Lesson", dot: showLesson && rightPanel !== "lesson" },
    { id: "quiz", icon: "🎯", label: "Quiz", dot: quizActive && rightPanel !== "quiz" },
    { id: "doubt", icon: "💬", label: "Ask" },
    { id: "progress", icon: "📈", label: "Progress" },
  ];

  return (
    <div style={{ width: "100vw", height: "100vh", background: C.bg, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", fontFamily: "Syne" }} onClick={() => setMenuOpen(null)}>
      <IDEAmbient />
      {cmdPalette && <CommandPalette onClose={() => setCmdPalette(false)} onAction={handleCmdAction} />}
      {settings && <SettingsPanel onClose={() => setSettings(false)} />}
      <ConfettiCanvas active={confetti} />
      <ToastStack toasts={toasts} />

      {/* ── MENU BAR ── */}
      <div style={{ height: 40, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 14px", gap: 0, flexShrink: 0, position: "relative", zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M3 4L10 16L17 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="16" r="2" fill="#fbbf24" /></svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, color: "#f1f5f9", letterSpacing: "-.01em" }}>Veda</span>
          <span style={{ fontSize: 9, color: C.indigo, fontFamily: "JetBrains Mono", letterSpacing: ".16em" }}>LEARN</span>
        </div>

        {Object.keys(MENUS).map(m => (
          <div key={m} style={{ position: "relative" }}>
            <span style={{ fontSize: 12, color: menuOpen === m ? C.text : C.dim, cursor: "pointer", padding: "5px 10px", borderRadius: 5, background: menuOpen === m ? "rgba(255,255,255,.07)" : "transparent", transition: "all .15s", display: "block", fontWeight: 500 }}
              onClick={e => { e.stopPropagation(); setMenuOpen(v => v === m ? null : m); }}>
              {m}
            </span>
            {menuOpen === m && (
              <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 8000 }} onClick={e => e.stopPropagation()}>
                <MenuDropdown label={m} items={MENUS[m]} onClose={() => setMenuOpen(null)} />
              </div>
            )}
          </div>
        ))}

        <div style={{ flex: 1 }} />

        {/* Command palette shortcut hint */}
        <div onClick={() => setCmdPalette(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, cursor: "pointer", marginRight: 8 }} onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(99,102,241,.3)"} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
          <span style={{ fontSize: 12, color: C.dim, fontFamily: "JetBrains Mono" }}>⌕ Search</span>
          <kbd style={{ fontSize: 9, color: C.dim, fontFamily: "JetBrains Mono", background: C.surface, padding: "1px 5px", borderRadius: 4, border: `1px solid ${C.border}` }}>Ctrl+P</kbd>
        </div>

        {/* Analyze button */}
        <button onClick={triggerAnalyze} style={{ padding: "6px 14px", borderRadius: 9, background: analyzing ? "rgba(99,102,241,.15)" : `linear-gradient(135deg,${C.indigo},${C.violet})`, border: analyzing ? `1px solid rgba(99,102,241,.3)` : "none", color: "white", fontFamily: "Syne", fontWeight: 700, fontSize: 12, cursor: analyzing ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: analyzing ? "none" : "0 2px 14px rgba(99,102,241,.4)", transition: "all .2s", marginRight: 10 }}>
          {analyzing ? <><div style={{ width: 10, height: 10, border: "1.5px solid rgba(255,255,255,.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite" }} />Analyzing...</> : <>▶ Analyze</>}
        </button>

        {/* Notifications Bell */}
        <div style={{ position: "relative" }}>
          <button className="notif-bell" title="Notifications" onClick={e => { e.stopPropagation(); setNotifOpen(v => !v); }}
            style={{ width: 34, height: 34, borderRadius: 9, background: notifOpen ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.04)", border: `1px solid ${notifOpen ? "rgba(99,102,241,.3)" : C.border}`, color: notifOpen ? C.indigo : C.dim, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8, transition: "all .2s", position: "relative" }}>
            🔔
            {unreadCount > 0 && <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: C.indigo, boxShadow: `0 0 6px ${C.indigo}`, animation: "pulse 2s infinite" }} />}
          </button>
          {notifOpen && (
            <div onClick={e => e.stopPropagation()}>
              <NotificationsDropdown notifs={notifs} onMarkRead={markRead} onMarkAllRead={markAllRead} onClear={clearNotifs} onClose={() => setNotifOpen(false)} />
            </div>
          )}
        </div>

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 10px 4px 6px", borderRadius: 9, background: "rgba(255,255,255,.04)", border: `1px solid ${C.border}`, cursor: "pointer" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white" }}>{(user || "V").charAt(0).toUpperCase()}</div>
          <span style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>{user || "devuser"}</span>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 5 }}>

        {/* ACTIVITY BAR */}
        <div style={{ width: 44, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0", gap: 2, flexShrink: 0, zIndex: 10 }}>
          {ACT.map(a => (
            <button key={a.id} className="act-icon" title={a.tip} onClick={() => setSidebarTab(s => s === a.id ? null : a.id)}
              style={{ width: 36, height: 36, borderRadius: 10, background: sidebarTab === a.id ? "rgba(99,102,241,.15)" : "transparent", border: `1px solid ${sidebarTab === a.id ? "rgba(99,102,241,.3)" : "transparent"}`, color: sidebarTab === a.id ? C.indigo : C.dim, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s" }}>
              {a.icon}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button title="Settings" onClick={() => setSettings(true)} style={{ width: 36, height: 36, borderRadius: 10, background: "transparent", border: "none", color: C.dim, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "color .2s" }} onMouseEnter={e => e.target.style.color = C.text} onMouseLeave={e => e.target.style.color = C.dim}>⚙</button>
        </div>

        {/* SIDEBAR */}
        {sidebarTab && (
          <div style={{ width: 218, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0, animation: "slideIn .18s ease both", zIndex: 9, overflow: "hidden" }}>
            <div style={{ height: 34, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.dim, fontFamily: "JetBrains Mono", letterSpacing: ".1em", textTransform: "uppercase" }}>
                {sidebarTab === "explorer" ? "Explorer" : sidebarTab === "search" ? "Search" : sidebarTab === "git" ? "Source Control" : "Veda Insights"}
              </span>
              <span onClick={() => setSidebarTab(null)} style={{ color: C.muted, cursor: "pointer", fontSize: 14, lineHeight: 1 }} onMouseEnter={e => e.target.style.color = C.dim} onMouseLeave={e => e.target.style.color = C.muted}>×</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {sidebarTab === "explorer" && <FileTree activeFile={activeFile} onFileClick={openFile} />}
              {sidebarTab === "search" && <SearchPanel onFileClick={openFile} />}
              {sidebarTab === "git" && (
                <div style={{ padding: 12, fontFamily: "Syne" }}>
                  <div style={{ fontSize: 11, color: C.dim, fontFamily: "JetBrains Mono", marginBottom: 10 }}>Changes (2)</div>
                  {["cart.py", "api.ts"].map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, marginBottom: 4, cursor: "pointer", transition: "background .15s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.04)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ width: 16, height: 16, borderRadius: 4, background: "rgba(251,191,36,.14)", border: "1px solid rgba(251,191,36,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.amber }}>M</span>
                      <span style={{ fontSize: 12, color: C.sub, fontFamily: "JetBrains Mono" }}>{f}</span>
                    </div>
                  ))}
                  <button style={{ width: "100%", marginTop: 12, padding: "8px 0", borderRadius: 9, background: `linear-gradient(135deg,${C.indigo},${C.violet})`, border: "none", color: "white", fontFamily: "Syne", fontWeight: 600, fontSize: 12, cursor: "pointer" }} onClick={() => addToast("Committed", "Changes staged and committed", "success")}>
                    ✓ Commit
                  </button>
                </div>
              )}
              {sidebarTab === "github" && <GitHubPanel onFileClick={openFile} addToast={addToast} />}
              {sidebarTab === "veda" && (
                <div style={{ padding: 12, fontFamily: "Syne" }}>
                  <div style={{ fontSize: 10, color: C.dim, fontFamily: "JetBrains Mono", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 10 }}>Detected Issues</div>
                  {[["cart.py", "mutable-default", 3, C.red], ["api.ts", "any-type", 4, C.orange], ["fetch.js", "callback-hell", 4, C.orange]].map(([file, issue, line, c]) => (
                    <div key={file} className="notif-item" onClick={() => openFile(file)} style={{ padding: "10px 10px", borderRadius: 9, marginBottom: 7, background: C.surface, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: C.text, fontFamily: "JetBrains Mono", fontWeight: 500 }}>{file}</span>
                        <span style={{ fontSize: 9, color: c, fontFamily: "JetBrains Mono" }}>Line {line}</span>
                      </div>
                      <div style={{ fontSize: 10, color: C.dim, fontFamily: "JetBrains Mono" }}>{issue}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EDITOR REGION */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>

          {/* TABS + BREADCRUMB */}
          <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ height: 36, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
              {openTabs.map(tab => (
                <div key={tab} className="ide-tab" onClick={() => setActiveFile(tab)}
                  style={{ height: 36, padding: "0 13px", display: "flex", alignItems: "center", gap: 7, background: activeFile === tab ? C.bg : "transparent", borderTop: `2px solid ${activeFile === tab ? C.indigo : "transparent"}`, borderRight: `1px solid ${C.border}`, color: activeFile === tab ? C.text : C.dim, fontSize: 12, fontFamily: "JetBrains Mono", flexShrink: 0, userSelect: "none" }}>
                  <span>{tab}</span>
                  {showLesson && tab === activeFile && <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.amber, marginRight: -2 }} />}
                  <span onClick={e => closeTab(tab, e)} style={{ color: C.muted, fontSize: 14, lineHeight: 1, padding: "0 2px", cursor: "pointer", borderRadius: 3, transition: "color .15s" }} onMouseEnter={e => e.target.style.color = C.text} onMouseLeave={e => e.target.style.color = C.muted}>×</span>
                </div>
              ))}
            </div>
            {/* Breadcrumb */}
            <div style={{ height: 22, padding: "0 14px", display: "flex", alignItems: "center", gap: 4, borderTop: `1px solid ${C.border}`, background: "rgba(0,0,0,.2)" }}>
              <span style={{ fontSize: 10, color: C.muted, fontFamily: "JetBrains Mono" }}>veda-learn</span>
              <span style={{ fontSize: 10, color: C.muted }}>›</span>
              <span style={{ fontSize: 10, color: C.muted, fontFamily: "JetBrains Mono" }}>{activeFile.includes("analyze") || activeFile.includes("lesson") ? "handlers" : activeFile === "package.json" ? "." : "src"}</span>
              <span style={{ fontSize: 10, color: C.muted }}>›</span>
              <span style={{ fontSize: 10, color: C.sub, fontFamily: "JetBrains Mono", fontWeight: 500 }}>{activeFile}</span>
              {showLesson && activeFile === "cart.py" && <span style={{ marginLeft: "auto", fontSize: 10, color: C.amber, fontFamily: "JetBrains Mono", display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 4, height: 4, borderRadius: "50%", background: C.amber }} />Line {lesson?.lineNumber}: {lesson?.conceptId}</span>}
            </div>
          </div>

          {/* CODE + MINIMAP */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden", background: C.bg, position: "relative" }}>
            {/* Line numbers */}
            <div style={{ width: 44, background: C.bg, borderRight: "1px solid rgba(255,255,255,.025)", padding: "14px 0", textAlign: "right", flexShrink: 0, overflowY: "hidden", userSelect: "none" }}>
              {(DEMO_CODE[activeFile] || "").split("\n").map((_, i) => (
                <div key={i} style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: showLesson && activeFile === activeFile && lesson?.lineNumber === i + 1 ? C.amber : C.muted, lineHeight: "21.4px", paddingRight: 10, background: showLesson && lesson?.lineNumber === i + 1 ? "rgba(239,68,68,.06)" : "transparent", transition: "color .2s" }}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code body */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", position: "relative" }}>
              {/* Bug line highlight */}
              {showLesson && lesson && (
                <div style={{ position: "absolute", left: 0, right: 0, top: `${(lesson.lineNumber - 1) * 21.4 + 14}px`, height: 21, background: "rgba(239,68,68,.06)", borderLeft: "3px solid rgba(239,68,68,.5)", pointerEvents: "none", zIndex: 2 }} />
              )}
              <SyntaxHighlighter
                language={LANG_MAP[activeFile] || "python"} style={vscDarkPlus}
                customStyle={{ background: "transparent", margin: 0, padding: "14px 0 14px 16px", fontSize: 13, lineHeight: "21.4px", fontFamily: "JetBrains Mono", minHeight: "100%" }}
                showLineNumbers={false} wrapLines={false}>
                {DEMO_CODE[activeFile] || "// Select a file from the explorer"}
              </SyntaxHighlighter>
            </div>

            {/* Minimap */}
            <Minimap code={DEMO_CODE[activeFile]} activeFile={activeFile} />
          </div>

          {/* BOTTOM PANEL */}
          {bottomVis && (
            <div style={{ height: 170, borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0, display: "flex", flexDirection: "column", animation: "fadeIn .2s ease both" }}>
              <div style={{ height: 30, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: `1px solid ${C.border}`, gap: 2 }}>
                {["terminal", "output", "problems"].map(t => (
                  <span key={t} onClick={() => setBottomPanel(t)} style={{ fontSize: 10, fontFamily: "JetBrains Mono", padding: "3px 10px", borderRadius: 5, cursor: "pointer", color: bottomPanel === t ? C.text : C.dim, background: bottomPanel === t ? "rgba(255,255,255,.05)" : "transparent", textTransform: "uppercase", letterSpacing: ".06em", transition: "all .12s", userSelect: "none" }}>
                    {t}
                    {t === "problems" && showLesson && <span style={{ marginLeft: 5, background: C.amber, color: "#000", borderRadius: 100, fontSize: 9, padding: "0 5px", fontWeight: 700 }}>1</span>}
                  </span>
                ))}
                <div style={{ flex: 1 }} />
                <span onClick={() => setBottomVis(false)} style={{ fontSize: 14, color: C.muted, cursor: "pointer", padding: "2px 6px", lineHeight: 1, borderRadius: 4 }} onMouseEnter={e => e.target.style.color = C.dim} onMouseLeave={e => e.target.style.color = C.muted}>×</span>
              </div>
              <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {bottomPanel === "terminal" && <Terminal />}
                {bottomPanel === "output" && (
                  <div style={{ padding: "8px 14px", fontFamily: "JetBrains Mono", fontSize: 11.5, overflowY: "auto", flex: 1 }}>
                    {analyzing && <div style={{ color: C.indigo, animation: "pulse 1s infinite" }}>⟳  Veda · Claude Haiku scanning {activeFile}...</div>}
                    {showLesson && !analyzing && <><div style={{ color: C.green }}>✓  Analysis complete</div><div style={{ color: C.amber, marginTop: 3 }}>⚠  {activeFile}:{lesson?.lineNumber}  {lesson?.conceptId}  [confidence: 0.93]</div><div style={{ color: C.dim, marginTop: 3 }}>→  Lesson delivered via WebSocket · Polly audio generated</div></>}
                    {!analyzing && !showLesson && <div style={{ color: C.dim }}>Waiting for code changes... (30s debounce · F5 to force)</div>}
                  </div>
                )}
                {bottomPanel === "problems" && (
                  <div style={{ padding: "8px 14px", fontFamily: "JetBrains Mono", fontSize: 11.5, overflowY: "auto", flex: 1 }}>
                    {showLesson
                      ? <div style={{ display: "flex", gap: 10, alignItems: "flex-start", color: C.amber }}><span style={{ marginTop: 1 }}>⚠</span><div><div>{activeFile}({lesson?.lineNumber},{1}): {lesson?.conceptId?.replace(/-/g, " ")} <span style={{ color: C.dim }}>veda({lesson?.conceptId})</span></div><div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>Mutable default argument — shared state across calls</div></div></div>
                      : <div style={{ color: C.dim }}>No problems detected.</div>
                    }
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: 330, background: C.surface, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0, animation: "slideRight .25s ease both", zIndex: 8 }}>
          <div style={{ height: 40, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "stretch", flexShrink: 0 }}>
            {PANEL_TABS.map(pt => (
              <button key={pt.id} className="panel-tab" onClick={() => { setRightPanel(pt.id); setDeepDive(false); }}
                style={{ flex: 1, background: "transparent", border: "none", borderBottom: `2px solid ${rightPanel === pt.id ? C.indigo : "transparent"}`, color: rightPanel === pt.id ? C.text : C.dim, fontFamily: "Syne", fontSize: 10, fontWeight: 500, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, position: "relative", transition: "color .2s", padding: "4px 0" }}>
                <span style={{ fontSize: 14, position: "relative" }}>
                  {pt.icon}
                  {pt.dot && <span style={{ position: "absolute", top: -2, right: -3, width: 6, height: 6, borderRadius: "50%", background: C.amber, boxShadow: `0 0 6px ${C.amber}`, animation: "pulse 2s infinite" }} />}
                </span>
                <span style={{ fontSize: 9, letterSpacing: ".04em" }}>{pt.label}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {rightPanel === "lesson" && !deepDive && <LessonPanel lesson={showLesson ? lesson : null} onGotIt={handleGotIt} onDeepDive={handleDeepDive} />}
            {rightPanel === "lesson" && deepDive && <DeepDivePanel lesson={lesson} onBack={() => setDeepDive(false)} />}
            {rightPanel === "quiz" && <QuizPanel questions={quizActive ? QUIZ_QUESTIONS : []} onDone={() => setRightPanel("progress")} onConfetti={() => { setConfetti(true); setXp(x => x + 15); setTimeout(() => setConfetti(false), 3000); addToast("🏆 +15 XP", "Concept mastered!", "success"); }} />}
            {rightPanel === "doubt" && <DoubtPanel activeFile={activeFile} />}
            {rightPanel === "progress" && <ProgressPanel xp={xp} streak={streak} />}
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div style={{ height: 24, background: `linear-gradient(90deg,${C.indigo},${C.violet})`, display: "flex", alignItems: "center", padding: "0 12px", gap: 14, flexShrink: 0, position: "relative", zIndex: 20 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.9)", fontFamily: "JetBrains Mono", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "white", opacity: .9 }} />⑂ main
        </span>
        <span style={{ width: 1, height: 14, background: "rgba(255,255,255,.2)" }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.85)", fontFamily: "JetBrains Mono", cursor: "pointer" }}>{LANG_MAP[activeFile] || "plaintext"}</span>
        <span style={{ width: 1, height: 14, background: "rgba(255,255,255,.2)" }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.85)", fontFamily: "JetBrains Mono" }}>{activeFile}</span>
        <div style={{ flex: 1 }} />
        {analyzing && <span style={{ fontSize: 11, color: "rgba(255,255,255,.95)", fontFamily: "JetBrains Mono", display: "flex", alignItems: "center", gap: 5, animation: "pulse .8s infinite" }}><span style={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.5)", borderTopColor: "white", animation: "spin .7s linear infinite" }} />Analyzing...</span>}
        {showLesson && !analyzing && <span style={{ fontSize: 11, color: "rgba(255,255,255,.95)", fontFamily: "JetBrains Mono", cursor: "pointer" }} onClick={() => setRightPanel("lesson")}>⚠ 1 issue · {activeFile}</span>}
        <span style={{ width: 1, height: 14, background: "rgba(255,255,255,.2)" }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.9)", fontFamily: "JetBrains Mono" }}>⚡ {xp} XP</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.9)", fontFamily: "JetBrains Mono" }}>🔥 {streak}d</span>
        <span style={{ width: 1, height: 14, background: "rgba(255,255,255,.2)" }} />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.85)", fontFamily: "JetBrains Mono", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 5px ${C.green}` }} />WS Connected
        </span>
        {!bottomVis && <button onClick={() => setBottomVis(true)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,.22)", borderRadius: 4, color: "rgba(255,255,255,.75)", fontFamily: "JetBrains Mono", fontSize: 9, padding: "1px 7px", cursor: "pointer" }}>Terminal</button>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [user, setUser] = useState(null);
  const [fading, setFading] = useState(false);

  // Check for existing authentication on mount
  useEffect(() => {
    const jwt = localStorage.getItem('veda_jwt');
    const storedUser = localStorage.getItem('veda_user');

    if (jwt && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setScreen("ide");
      } catch (err) {
        console.error('Error parsing stored user:', err);
        // Clear invalid data
        localStorage.removeItem('veda_jwt');
        localStorage.removeItem('veda_user');
      }
    }
  }, []);

  const go = (to, u = null) => {
    setFading(true);
    setTimeout(() => { setScreen(to); if (u) setUser(u); setFading(false); }, 260);
  };

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ opacity: fading ? 0 : 1, transition: "opacity .26s ease", width: "100vw", height: "100vh" }}>
        {screen === "landing" && <LandingPage onGetStarted={() => go("login")} />}
        {screen === "login" && <LoginPage onLogin={() => go("ide", "devuser")} onBack={() => go("landing")} />}
        {screen === "ide" && <IDEPage user={user} />}
      </div>
    </>
  );
}
