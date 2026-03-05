# Veda Learn — Day 2 Detailed Roadmap
## Hours 6–10 · Intelligence Layer

> **Day 2 Goal:** Write bad Python → Veda silently detects the mistake → Claude Haiku classifies it → 3 parallel OpenRouter calls generate a lesson → Amazon Polly speaks it → all 3 panels render in the VS Code sidebar via WebSocket push.

> **Prerequisite — Day 1 must be complete before starting:**
> - ✅ All AWS resources provisioned (6 DynamoDB tables, 2 S3 buckets, OpenSearch ACTIVE)
> - ✅ `npx serverless deploy` succeeded — both REST + WebSocket URLs are in your `.env`
> - ✅ GitHub OAuth → JWT flow works end-to-end
> - ✅ JWT stored in VS Code `SecretStorage`
> - ✅ WebSocket connects from extension → API Gateway
> - ✅ One OpenRouter call returned a visible response in the sidebar

---

## What You Will Build Today

```
VS Code (TypeScript Extension)
  │
  │  [Hour 6] User types buggy Python
  │  → 30-second debounce timer resets on every keystroke
  │  → After 30s silence: POST /api/analyze  (with JWT + file content)
  │
  ▼
Lambda: analyze.js  [Hour 7]
  │
  ├── Check DynamoDB rate lock (TTL-based, 30s cooldown per user)
  │   └── If locked → return {teach:false}  ← prevents credit drain
  │
  ├── Call Claude Haiku via OpenRouter
  │   └── Returns: {isMistake:true, confidence:0.93, conceptId:"mutable-default", ...}
  │
  ├── Save mistake to veda-mistakes DynamoDB table
  │
  └── Fire generateLesson() ASYNC (no await) → return {teach:true} to VS Code instantly
        │
        ▼
  Lambda: lesson.js  [Hour 8]
        │
        ├── Promise.all([
        │     Claude Sonnet → explanation text (voice-ready, no markdown)
        │     Claude Sonnet → before/after code fix (JSON)
        │     Gemini Flash  → Mermaid.js diagram syntax
        │   ])
        │
        ├── Amazon Polly Generative TTS → MP3 audio
        ├── Upload MP3 to S3 → generate presigned URL (1hr)
        ├── Save lesson to veda-lessons DynamoDB table
        │
        └── pushToClient(userId, {type:"lesson", lesson:{...}})
              │
              ▼
        API Gateway WebSocket → VS Code Extension
              │
              ▼
        Webview sidebar [Hour 9]
              ├── Panel 1: Typewriter explanation + mistake badge
              ├── Panel 2: Syntax-highlighted before/after code diff
              ├── Panel 3: Mermaid.js diagram render
              └── Amazon Polly MP3 auto-plays from presigned S3 URL
```

---

## Hour 6 — Passive File Watcher + 30-Second Debounce
**Duration:** 60 minutes | **Priority:** ⚠️ CRITICAL | **File:** `extension.ts`

### What You Are Building

The extension must silently watch every keystroke in every file — without annoying the developer. The pattern is a **30-second debounce**: the timer resets on every keystroke, and only fires when the user stops typing for a full 30 seconds. This mimics how GitHub Copilot works — invisible until it has something to say.

### Why This Matters

Without the debounce, every keypress would trigger an API call and burn through OpenRouter credits instantly. With it, you get exactly one call per "coding session" per file — the perfect UX for a learning tool.

### Implementation

Add the following block inside `activate()` in `extension.ts`, **after** the OAuth handler and WebSocket setup from Day 1:

```typescript
// extension.ts — add inside activate(), after auth handler

const debounceMap = new Map<string, NodeJS.Timeout>();

vscode.workspace.onDidChangeTextDocument(event => {
  const uri = event.document.uri.toString();

  // Cancel any pending timer for this file
  clearTimeout(debounceMap.get(uri));

  // Start a new 30-second timer
  const timer = setTimeout(async () => {
    debounceMap.delete(uri);

    const jwt = await context.secrets.get('veda.jwt');
    if (!jwt) return;   // user not logged in — silently skip

    // Build the analysis payload
    const payload = {
      fileContent: event.document.getText(),
      language:    event.document.languageId,    // "python", "javascript", "typescript"
      fileName:    event.document.fileName,
      cursorLine:  vscode.window.activeTextEditor?.selection.active.line ?? 0,
      diagnostics: vscode.languages.getDiagnostics(event.document.uri)
        .map(d => ({
          message:  d.message,
          severity: d.severity,
          line:     d.range.start.line
        }))
    };

    // Fire-and-forget POST to /api/analyze
    // Lambda returns immediately — lesson comes back via WebSocket
    await fetch(`${REST_URL}/api/analyze`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify(payload)
    }).catch(console.error);  // never crash the extension

  }, 30_000);   // 30 second debounce — adjust to 5s via env var for demo mode

  debounceMap.set(uri, timer);
});
```

### Status Bar Indicator

Add a subtle "Veda is watching" status bar item — the only visible sign Veda is active during normal coding:

```typescript
// Status bar — creates the "$(eye) Veda watching..." bottom bar item
const statusBar = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100
);
statusBar.text    = '$(eye) Veda watching...';
statusBar.tooltip = 'Veda Learn is analyzing your code in the background';
statusBar.command = 'veda.openSidebar';
statusBar.show();
context.subscriptions.push(statusBar);

// Pulse the status bar when an analysis is in flight
function setStatusAnalyzing() {
  statusBar.text = '$(sync~spin) Veda analyzing...';
  setTimeout(() => { statusBar.text = '$(eye) Veda watching...'; }, 4000);
}
```

Call `setStatusAnalyzing()` just before the `fetch()` call so users see feedback.

### Demo Mode Override

Add this near the top of `activate()` for the demo day:

```typescript
// In demo mode, reduce debounce to 5 seconds
const DEBOUNCE_MS = process.env.VEDA_DEMO_MODE === 'true' ? 5_000 : 30_000;
// Then replace 30_000 in setTimeout with DEBOUNCE_MS
```

### Hour 6 Verification Checklist

- [ ] Open any `.py` file and start typing
- [ ] Status bar shows `$(eye) Veda watching...`
- [ ] After 30 seconds of no typing, a POST fires to `/api/analyze` (check Network tab or CloudWatch)
- [ ] If you keep typing, the timer resets — only **one** POST fires per session
- [ ] With no JWT stored, nothing fires (graceful skip)

---

## Hour 7 — Haiku Classifier Lambda + DynamoDB Rate Lock
**Duration:** 60 minutes | **Priority:** ⚠️ CRITICAL | **Files:** `lib/rateLimit.js`, `handlers/analyze.js`

### What You Are Building

This is the brain of the detection pipeline. When the watcher fires, this Lambda does three things:

1. **Checks a DynamoDB TTL rate lock** — if a lesson was already triggered in the last 30 seconds for this user, skip silently. This is the credit-drain protection.
2. **Sends the code to Claude Haiku** via OpenRouter — the cheapest, fastest model, used only for classification (not generation). Returns structured JSON.
3. **Saves the detected mistake** to DynamoDB and **fires lesson generation asynchronously** — the Lambda returns `{teach:true}` to VS Code immediately while the heavy lifting happens in the background.

### Step 1 — Create `lib/rateLimit.js`

```javascript
// lib/rateLimit.js
// DynamoDB TTL-based rate limiter — replaces Redis/Upstash entirely
// A "lesson-lock:{userId}" item is written with a 30-second TTL.
// If the item already exists when we try to write it, DynamoDB's
// ConditionExpression throws → we know a lesson is already in flight.

const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient }                     = require('@aws-sdk/client-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

async function checkRateLimit(userId) {
  const lockKey = `lesson-lock:${userId}`;
  const ttl     = Math.floor(Date.now() / 1000) + 30;  // Unix timestamp 30s from now

  try {
    // PutCommand with ConditionExpression: only succeeds if the item does NOT already exist
    await ddb.send(new PutCommand({
      TableName:           'veda-rate-limits',
      Item:                { lockKey, userId, ttl },
      ConditionExpression: 'attribute_not_exists(lockKey)'
    }));
    return false;  // Lock written successfully → no existing lock → proceed
  } catch (err) {
    // ConditionalCheckFailedException means lock exists → lesson already triggered
    return true;   // Rate-limited → skip this request
  }
}

module.exports = { checkRateLimit };
```

> **Why DynamoDB instead of Redis?** The `veda-rate-limits` table has TTL enabled (configured in Day 1 setup). DynamoDB automatically deletes items when their `ttl` Unix timestamp expires — no cron job, no Redis bill, zero maintenance.

### Step 2 — Create `handlers/analyze.js`

This is the full classifier Lambda. Read carefully — the `generateLesson` call at the bottom is intentionally **not awaited**. It fires and the Lambda returns immediately:

```javascript
// handlers/analyze.js
const { callOpenRouter } = require('../lib/openrouter');
const { checkRateLimit } = require('../lib/rateLimit');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient }                     = require('@aws-sdk/client-dynamodb');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { generateLesson } = require('./lesson');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

module.exports.handler = async (event) => {

  // ── Step 1: Verify JWT ────────────────────────────────────────────
  const token = event.headers?.Authorization?.replace('Bearer ', '');
  let userId;
  try {
    ({ userId } = jwt.verify(token, process.env.JWT_SECRET));
  } catch {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { fileContent, language, cursorLine, diagnostics } = JSON.parse(event.body);

  // ── Step 2: Check DynamoDB rate lock ──────────────────────────────
  // Returns true if a lesson is already in progress for this user
  const locked = await checkRateLimit(userId);
  if (locked) {
    return { statusCode: 200, body: JSON.stringify({ teach: false, reason: 'cooldown' }) };
  }

  // ── Step 3: Claude Haiku classification ───────────────────────────
  // Haiku is the fastest and cheapest model — perfect for classification
  // Strict JSON-only output: no markdown, no explanation, just the object
  const rawResult = await callOpenRouter({
    model:        'anthropic/claude-haiku-4-5',
    systemPrompt: 'You are a code quality analyzer. Respond ONLY with valid JSON. No other text, no markdown, no code fences.',
    userPrompt:   `Analyze this ${language} code for common mistakes.

Return ONLY this JSON structure:
{
  "isMistake": boolean,
  "confidence": number between 0.0 and 1.0,
  "mistakeType": "antipattern" | "bug" | "security" | "performance" | "style",
  "conceptId": one of: "mutable-default" | "callback-hell" | "any-type" | "null-ref" | "n-plus-one" | "sql-injection" | "memory-leak" | "dry-violation",
  "severity": "low" | "medium" | "high",
  "problematicCode": "the specific bad line or snippet",
  "lineNumber": number
}

Rules:
- Only set isMistake:true if confidence >= 0.85
- If the code looks fine, return {"isMistake":false,"confidence":0.1}
- Only flag REAL mistakes — not stylistic preferences

Code to analyze:
${fileContent.slice(0, 3000)}`,
    maxTokens: 256
  });

  // ── Step 4: Parse and validate the classification result ──────────
  let parsed;
  try {
    parsed = JSON.parse(rawResult);
  } catch {
    // If Haiku returns malformed JSON, just skip — don't crash
    console.error('Haiku returned non-JSON:', rawResult);
    return { statusCode: 200, body: JSON.stringify({ teach: false }) };
  }

  if (!parsed.isMistake || parsed.confidence < 0.85) {
    return { statusCode: 200, body: JSON.stringify({ teach: false }) };
  }

  // ── Step 5: Persist the mistake to DynamoDB ───────────────────────
  const mistakeId = uuidv4();
  await ddb.send(new PutCommand({
    TableName: 'veda-mistakes',
    Item: {
      mistakeId,
      userId,
      language,
      cursorLine:      cursorLine ?? 0,
      mistakeType:     parsed.mistakeType,
      conceptId:       parsed.conceptId,
      severity:        parsed.severity,
      confidence:      parsed.confidence,
      problematicCode: parsed.problematicCode,
      lineNumber:      parsed.lineNumber,
      createdAt:       new Date().toISOString()
    }
  }));

  // ── Step 6: Fire lesson generation ASYNC — do NOT await ───────────
  // This is the critical pattern: return fast to VS Code,
  // lesson arrives ~8-12s later via WebSocket push
  generateLesson(userId, mistakeId, parsed).catch(console.error);

  // Return immediately — lesson is on its way via WebSocket
  return { statusCode: 200, body: JSON.stringify({ teach: true, mistakeId }) };
};
```

### The Haiku Classifier System Prompt — Why It's Designed This Way

The system prompt is strict by design:

- **`confidence >= 0.85` threshold** prevents false positives. If Haiku is unsure, it returns `isMistake:false`.
- **Limiting `conceptId` to a known enum** means you control exactly which concepts Veda can teach — no hallucinated concept IDs that would break the lesson lookup.
- **`fileContent.slice(0, 3000)`** avoids sending huge files to Haiku. 3,000 characters covers ~80 lines of code — enough context to detect patterns.

### Deploy After This Hour

```bash
npx serverless deploy --function analyze
# or redeploy all
npx serverless deploy
```

### Hour 7 Verification Checklist

- [ ] Open `cart.py` and type `def add_item(item, cart=[]):` — wait 30 seconds
- [ ] CloudWatch log for `veda-learn-api-dev-analyze` shows Haiku's JSON response
- [ ] `veda-mistakes` DynamoDB table has a new item with `conceptId:"mutable-default"`
- [ ] Response from Lambda is `{"teach":true,"mistakeId":"uuid..."}` (fast, under 3s)
- [ ] Second trigger within 30s returns `{"teach":false,"reason":"cooldown"}`
- [ ] `veda-rate-limits` table shows the TTL lock item

---

## Hour 8 — Lesson Generator: 3 Parallel OpenRouter Calls + Polly TTS + S3
**Duration:** 60 minutes | **Priority:** ⚠️ CRITICAL | **Files:** `lib/polly.js`, `handlers/lesson.js`

### What You Are Building

This is the most complex Lambda in the entire system. It runs three AI calls simultaneously, then converts the explanation to natural speech, stores the audio file, and pushes everything to the VS Code sidebar via WebSocket — all within a single function invocation.

**Execution timeline inside `generateLesson()`:**
```
t=0s   → Promise.all starts: Sonnet(explanation), Sonnet(fix), Gemini(diagram)
t=5-8s → All 3 OpenRouter calls return
t=8s   → Polly TTS call starts + DynamoDB write starts (parallel)
t=10s  → MP3 audio ready → upload to S3 → get presigned URL
t=11s  → pushToClient() fires → WebSocket delivers lesson JSON to VS Code
```

### Step 1 — Create `lib/polly.js`

Amazon Polly Generative is the highest-quality TTS AWS offers. The `Ruth` voice with `Engine: 'generative'` sounds natural enough to teach from.

```javascript
// lib/polly.js
// Amazon Polly Generative TTS → S3 upload → presigned URL
// The presigned URL is valid for 1 hour — plenty for the lesson session

const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const polly = new PollyClient({ region: 'us-east-1' });
const s3    = new S3Client({ region: 'us-east-1' });

async function synthesizeAndStore(text, lessonId) {
  // ── Step 1: Call Amazon Polly ────────────────────────────────────
  const cmd = new SynthesizeSpeechCommand({
    Text:         text,
    OutputFormat: 'mp3',
    VoiceId:      'Ruth',        // Best generative voice for teaching
    Engine:       'generative',  // Amazon Polly Generative TTS (highest naturalness)
    LanguageCode: 'en-US'
  });

  const { AudioStream } = await polly.send(cmd);

  // ── Step 2: Collect audio stream into a Buffer ───────────────────
  const chunks = [];
  for await (const chunk of AudioStream) {
    chunks.push(chunk);
  }
  const audioBuffer = Buffer.concat(chunks);

  // ── Step 3: Upload MP3 to S3 ─────────────────────────────────────
  const s3Key = `lessons/${lessonId}.mp3`;
  await s3.send(new PutObjectCommand({
    Bucket:      process.env.S3_AUDIO_BUCKET,   // veda-learn-audio
    Key:         s3Key,
    Body:        audioBuffer,
    ContentType: 'audio/mpeg'
  }));

  // ── Step 4: Return a presigned URL (valid 1 hour) ─────────────────
  // The VS Code webview will play audio directly from this URL
  const presignedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: process.env.S3_AUDIO_BUCKET, Key: s3Key }),
    { expiresIn: 3600 }   // 1 hour
  );

  return presignedUrl;
}

// Safe wrapper — if Polly fails, return null
// The webview will fall back to window.speechSynthesis (Web Speech API)
async function synthesizeAndStoreSafe(text, lessonId) {
  try {
    return await synthesizeAndStore(text, lessonId);
  } catch (err) {
    console.error('Polly failed, using browser TTS fallback:', err.message);
    return null;  // webview detects null → falls back to browser TTS
  }
}

module.exports = { synthesizeAndStore, synthesizeAndStoreSafe };
```

> **Why presigned URLs?** The VS Code webview cannot directly access private S3 objects. A presigned URL is a time-limited public link that grants read access to a specific S3 object — no public bucket policy needed.

### Step 2 — Create `handlers/lesson.js`

```javascript
// handlers/lesson.js
// The lesson generator — called async from analyze.js
// Never invoked by the user directly — fired internally after a mistake is detected

const { callOpenRouter }              = require('../lib/openrouter');
const { synthesizeAndStoreSafe }      = require('../lib/polly');
const { pushToClient }                = require('../lib/websocket');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient }              = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 }                  = require('uuid');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

async function generateLesson(userId, mistakeId, mistake) {
  const { conceptId, problematicCode, language } = mistake;
  const lessonId = uuidv4();

  // ── Step 1: 3 parallel OpenRouter calls ────────────────────────────
  // Promise.all fires all 3 simultaneously — total wait = slowest call (~5-8s)
  // NOT sequential — that would be 3× slower
  const [explanation, fixRaw, diagram] = await Promise.all([

    // Call A: Claude Sonnet — conversational explanation for voice reading
    // Strict: no markdown, no bullet points, written to be spoken aloud
    callOpenRouter({
      model:        'anthropic/claude-sonnet-4-5',
      systemPrompt: 'Write for voice reading. No markdown, no bullet points, no code in explanation. Conversational tone. Under 120 words. Complete sentences.',
      userPrompt:   `Explain why the "${conceptId}" pattern is problematic in ${language}.
Start with exactly: "Here is what is happening in your code:"
Then explain the problem and consequence in plain English.
End with one sentence about how to think about it differently.`,
      maxTokens: 200
    }),

    // Call B: Claude Sonnet — before/after code fix as JSON
    callOpenRouter({
      model:        'anthropic/claude-sonnet-4-5',
      systemPrompt: 'Return ONLY valid JSON. No other text, no markdown, no code fences.',
      userPrompt:   `Fix this ${language} code snippet.
Return exactly this JSON:
{"before":"original code here","after":"fixed code here","comment":"one sentence explanation of the fix"}

Code to fix:
${problematicCode}`,
      maxTokens: 400
    }),

    // Call C: Gemini Flash — Mermaid.js diagram
    // Gemini is used here because it handles structured syntax output cheaply
    callOpenRouter({
      model:        'google/gemini-2.0-flash-001',
      systemPrompt: 'Return ONLY valid Mermaid.js syntax. No explanation. No code fences. No markdown.',
      userPrompt:   `Create a simple "flowchart TD" Mermaid diagram for this programming concept: "${conceptId}".
Show:
1. The wrong approach and what goes wrong
2. The correct approach and why it works
Use short labels. No subgraphs. Only basic nodes and arrows.
Maximum 8 nodes.`,
      maxTokens: 300
    })

  ]);

  // ── Step 2: Parse the code fix JSON ──────────────────────────────
  let fixParsed = { before: problematicCode, after: '', comment: '' };
  try {
    fixParsed = JSON.parse(fixRaw);
  } catch (_) {
    // If Sonnet returns malformed JSON, keep the original code
    console.error('Failed to parse code fix JSON:', fixRaw);
  }

  // ── Step 3: Polly TTS + DynamoDB write in parallel ────────────────
  // Both operations are independent — run simultaneously to save ~2s
  const [audioUrl] = await Promise.all([

    // Polly: synthesize explanation text → MP3 → S3 → presigned URL
    synthesizeAndStoreSafe(explanation, lessonId),

    // DynamoDB: persist the full lesson (status: pending until user confirms)
    ddb.send(new PutCommand({
      TableName: 'veda-lessons',
      Item: {
        lessonId,
        userId,
        mistakeId,
        conceptId,
        language,
        explanation,
        codeBefore:    fixParsed.before,
        codeAfter:     fixParsed.after,
        codeComment:   fixParsed.comment,
        diagramSyntax: diagram,
        status:        'pending',           // becomes 'acknowledged' when user clicks "Got it ✓"
        createdAt:     new Date().toISOString()
      }
    }))

  ]);

  // ── Step 4: Push full lesson to VS Code via WebSocket ─────────────
  // This is the moment the lesson appears in the sidebar
  await pushToClient(userId, {
    type:   'lesson',
    lesson: {
      lessonId,
      conceptId,
      explanation,
      codeBefore:    fixParsed.before,
      codeAfter:     fixParsed.after,
      codeComment:   fixParsed.comment,
      diagramSyntax: diagram,
      audioUrl       // presigned S3 URL — null if Polly failed (webview handles fallback)
    }
  });

  console.log(`Lesson delivered to userId:${userId} conceptId:${conceptId} lessonId:${lessonId}`);
}

module.exports = { generateLesson };

// REST fallback handler — direct HTTP trigger if WebSocket is not available
module.exports.handler = async (event) => {
  try {
    const { userId, mistakeId, mistake } = JSON.parse(event.body);
    await generateLesson(userId, mistakeId, mistake);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('lesson.handler error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
```

### The 3-Model Strategy Explained

| Call | Model | Why This Model |
|------|-------|---------------|
| Explanation | `claude-sonnet-4-5` | Best prose quality — lesson must be clear and natural-sounding |
| Code fix | `claude-sonnet-4-5` | Reliable JSON output + accurate code generation |
| Diagram | `gemini-2.0-flash-001` | Cheapest model for structured syntax — Mermaid needs no creative reasoning |

Total cost per lesson: ~$0.003 (Haiku classify) + ~$0.012 (Sonnet × 2) + ~$0.0003 (Gemini) = **~$0.016 per lesson triggered**

### Deploy After This Hour

```bash
npx serverless deploy --function lesson
npx serverless deploy --function analyze
```

### Hour 8 Verification Checklist

- [ ] CloudWatch log for `lesson` Lambda shows all 3 OpenRouter calls completing
- [ ] `veda-lessons` DynamoDB table has a new item with `explanation`, `codeBefore`, `codeAfter`, `diagramSyntax`
- [ ] `veda-learn-audio` S3 bucket has a new `lessons/{lessonId}.mp3` file
- [ ] `audioUrl` in the lesson item is a valid `https://veda-learn-audio.s3.amazonaws.com/...` presigned URL
- [ ] Opening the presigned URL in a browser plays Polly audio (test in Chrome)
- [ ] Lesson JSON is pushed to the WebSocket connection (check via `wscat` in terminal)
- [ ] If Polly throws an error, Lambda still completes — `audioUrl` is `null`, not a crash

---

## Hour 9 — 3-Panel Sidebar UI + Amazon Polly Audio Playback
**Duration:** 60 minutes | **Priority:** ⚠️ CRITICAL | **File:** `media/sidebar.html` (or inline webview HTML)

### What You Are Building

The VS Code webview sidebar that renders the lesson when it arrives via WebSocket. Three visually distinct panels slide in with staggered CSS animations. Polly audio auto-plays from the presigned S3 URL. A Mermaid.js diagram renders in Panel 3.

### CDN Imports

These must be in the `<head>` of your webview HTML. No bundler needed:

```html
<!-- Mermaid.js — renders diagram syntax into SVG -->
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>

<!-- highlight.js — syntax coloring for before/after code blocks -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

<!-- canvas-confetti — fires on quiz correct answer (Day 3, but load it now) -->
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>
```

### 3-Panel CSS Layout

Each panel slides up with a staggered delay — the visual cue that Veda is "delivering" the lesson piece by piece:

```css
.panel {
  background:    #1e1e2e;
  border:        1px solid #333;
  border-radius: 8px;
  padding:       16px;
  margin-bottom: 12px;
  opacity:       0;
  transform:     translateY(16px);
  animation:     slideIn 0.4s ease forwards;
}

.panel:nth-child(1) { animation-delay: 0ms;   }   /* Panel 1 — instant */
.panel:nth-child(2) { animation-delay: 150ms; }   /* Panel 2 — slight delay */
.panel:nth-child(3) { animation-delay: 300ms; }   /* Panel 3 — last */

@keyframes slideIn {
  to { opacity: 1; transform: translateY(0); }
}

/* Mistake severity badge colors */
.badge-security    { background: #dc2626; color: white; }  /* 🔴 Security */
.badge-performance { background: #ca8a04; color: white; }  /* 🟡 Performance */
.badge-antipattern { background: #ea580c; color: white; }  /* 🟠 Anti-pattern */
.badge-style       { background: #2563eb; color: white; }  /* 🔵 Style */
```

### HTML Panel Structure

```html
<div id="lesson-container" style="display:none;">

  <!-- Panel 1: Explanation + Mistake Badge + Audio Controls -->
  <div class="panel" id="panel-explanation">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <span id="concept-badge" class="badge"></span>
      <div style="display:flex; gap:6px;">
        <button id="btn-replay" title="Replay audio">🔊</button>
        <button id="btn-mute"   title="Stop audio">🔇</button>
      </div>
    </div>
    <p id="explanation-text" style="font-size:13px; line-height:1.6; color:#cdd6f4;"></p>
  </div>

  <!-- Panel 2: Before / After Code Diff -->
  <div class="panel" id="panel-code">
    <div style="font-size:11px; color:#a6adc8; margin-bottom:8px; font-weight:600;">CODE FIX</div>
    <div style="margin-bottom:8px;">
      <div style="font-size:10px; color:#f38ba8; margin-bottom:4px;">⚠ BEFORE</div>
      <pre><code id="code-before" class="language-python"></code></pre>
    </div>
    <div>
      <div style="font-size:10px; color:#a6e3a1; margin-bottom:4px;">✓ AFTER</div>
      <pre><code id="code-after"  class="language-python"></code></pre>
    </div>
    <p id="code-comment" style="font-size:12px; color:#cba6f7; margin-top:8px;"></p>
  </div>

  <!-- Panel 3: Mermaid Diagram -->
  <div class="panel" id="panel-diagram">
    <div style="font-size:11px; color:#a6adc8; margin-bottom:8px; font-weight:600;">CONCEPT DIAGRAM</div>
    <div id="diagram-output"></div>
  </div>

  <!-- Action Buttons -->
  <div style="display:flex; gap:8px; margin-top:4px;">
    <button id="btn-gotit"  style="flex:1; background:#a6e3a1; color:#1e1e2e; border:none; padding:10px; border-radius:6px; font-weight:700; cursor:pointer;">
      Got it ✓
    </button>
    <button id="btn-deepdive" style="flex:1; background:#313244; color:#cdd6f4; border:none; padding:10px; border-radius:6px; cursor:pointer;">
      Deep Dive 🔍
    </button>
  </div>

</div>

<!-- Idle state (shown when no lesson is active) -->
<div id="idle-container">
  <div style="text-align:center; padding:40px 20px; color:#6c7086;">
    <div style="font-size:32px; margin-bottom:12px;">👁</div>
    <div style="font-size:13px;">Veda is watching your code...</div>
    <div style="font-size:11px; margin-top:6px; color:#45475a;">Write some code to get started</div>
  </div>
</div>
```

### JavaScript — Lesson Rendering + Polly Playback

```javascript
// sidebar.js (or inline <script> in webview HTML)

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

let currentLesson = null;
let currentAudio  = null;

// ── Polly audio playback ──────────────────────────────────────────
function playPollyAudio(audioUrl) {
  if (!audioUrl) {
    // Polly failed — fall back to browser Web Speech API
    const synth = window.speechSynthesis;
    const utt   = new SpeechSynthesisUtterance(currentLesson?.explanation || '');
    utt.rate  = 0.95;
    utt.pitch = 1.0;
    synth.speak(utt);
    return;
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  currentAudio              = new Audio(audioUrl);
  currentAudio.playbackRate = 0.95;   // slightly slower = clearer teaching voice
  currentAudio.play().catch(err => {
    console.error('Audio play failed:', err);
    // Autoplay policy blocked it — show a "Click to play" button
    document.getElementById('btn-replay').style.animation = 'pulse 1s infinite';
  });
}

// ── Render lesson to all 3 panels ────────────────────────────────
async function renderLesson(lesson) {
  currentLesson = lesson;

  document.getElementById('idle-container').style.display   = 'none';
  document.getElementById('lesson-container').style.display = 'block';

  // Panel 1: Explanation + badge
  const badgeEl     = document.getElementById('concept-badge');
  badgeEl.textContent = lesson.conceptId.replace(/-/g, ' ').toUpperCase();
  badgeEl.className   = 'badge badge-antipattern';  // adjust per mistakeType if available

  document.getElementById('explanation-text').textContent = lesson.explanation;

  // Panel 2: Code diff with syntax highlighting
  const beforeEl = document.getElementById('code-before');
  const afterEl  = document.getElementById('code-after');
  beforeEl.textContent = lesson.codeBefore;
  afterEl.textContent  = lesson.codeAfter;
  hljs.highlightElement(beforeEl);
  hljs.highlightElement(afterEl);
  document.getElementById('code-comment').textContent = lesson.codeComment;

  // Panel 3: Mermaid diagram
  try {
    const { svg } = await mermaid.render('veda-diagram-svg', lesson.diagramSyntax);
    document.getElementById('diagram-output').innerHTML = svg;
  } catch (err) {
    console.error('Mermaid render failed:', err);
    document.getElementById('diagram-output').innerHTML =
      '<p style="color:#f38ba8;font-size:12px;">Diagram unavailable</p>';
  }
}

// ── Audio control buttons ─────────────────────────────────────────
document.getElementById('btn-replay').onclick = () => {
  if (currentLesson?.audioUrl) playPollyAudio(currentLesson.audioUrl);
};

document.getElementById('btn-mute').onclick = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  window.speechSynthesis?.cancel();
};

// ── "Got it ✓" button — marks lesson acknowledged, triggers quiz (Day 3) ─
document.getElementById('btn-gotit').onclick = () => {
  document.getElementById('lesson-container').style.display = 'none';
  document.getElementById('idle-container').style.display   = 'block';
  // Day 3: fire quiz after 30s delay here
};

// ── Receive lesson message from extension.ts ──────────────────────
// extension.ts calls webviewPanel.webview.postMessage({type:'lesson', lesson:{...}})
window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'lesson') {
    renderLesson(msg.lesson);
    playPollyAudio(msg.lesson.audioUrl);  // auto-play Polly audio
  }
});
```

### Connecting the Extension to the Webview

In `extension.ts`, inside the `openWebSocket()` message handler (from Day 1 Hour 4), add the webview forward:

```typescript
ws.on('message', (data: Buffer) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'lesson') {
    // Forward lesson from WebSocket to the webview panel
    VedaSidebar.currentPanel?.webview.postMessage(msg);
  }
});
```

### Hour 9 Verification Checklist

- [ ] After a lesson arrives via WebSocket, all 3 panels render in the sidebar
- [ ] Panel 1: explanation text is visible, concept badge shows correct color
- [ ] Panel 2: before/after code has syntax highlighting (colored keywords)
- [ ] Panel 3: Mermaid diagram renders as SVG — not raw text
- [ ] Polly audio auto-plays when lesson arrives (check browser console for errors)
- [ ] 🔊 Replay button re-plays the audio
- [ ] 🔇 Mute button stops it
- [ ] If Polly URL is `null`, Web Speech API fallback speaks the text
- [ ] "Got it ✓" button hides the lesson and returns to idle state
- [ ] Panels slide in with visible stagger — not all at once

---

## Hour 10 — End-to-End Integration Test
**Duration:** 60 minutes | **Priority:** ⚠️ CRITICAL

### What You Are Verifying

All 5 components working in sequence, without any manual intervention:

```
Type bug in VS Code → wait 30s → analyze Lambda fires → Haiku classifies →
DynamoDB write → lesson Lambda fires → 3 OpenRouter calls → Polly TTS →
S3 upload → WebSocket push → VS Code sidebar renders → audio plays
```

### Test Suite — Run in This Order

Run these 3 bugs sequentially. Each one should trigger a full lesson without you doing anything after typing:

#### Test 1: Python Mutable Default Argument
```python
# Create: /tmp/test_veda/cart.py
def add_item(item, cart=[]):
    cart.append(item)
    return cart

# Expected conceptId: "mutable-default"
# Expected severity:  "high"
# Expected: Lesson panel slides in ~10-12s after you stop typing
```

#### Test 2: JavaScript Callback Hell
```javascript
// Create: /tmp/test_veda/fetch.js
getUserData(userId, function(user) {
    getOrders(user.id, function(orders) {
        getProducts(orders[0].id, function(product) {
            console.log(product);
        });
    });
});

// Expected conceptId: "callback-hell"
# Expected: Lesson panel slides in with async/Promise explanation
```

#### Test 3: TypeScript `any` Type Abuse
```typescript
// Create: /tmp/test_veda/api.ts
async function fetchUser(id: any): Promise<any> {
    const data: any = await fetch(`/users/${id}`);
    return data;
}

// Expected conceptId: "any-type"
# Expected: Lesson explaining TypeScript generics as the fix
```

### CloudWatch Log Monitoring

Open two separate terminal tabs and tail the most critical Lambdas while running each test:

```bash
# Terminal 1 — watch the classifier
aws logs tail /aws/lambda/veda-learn-api-dev-analyze \
  --follow \
  --region us-east-1

# Terminal 2 — watch the lesson generator
aws logs tail /aws/lambda/veda-learn-api-dev-lesson \
  --follow \
  --region us-east-1
```

**What to look for in the analyze log:**
```
Haiku response: {"isMistake":true,"confidence":0.93,"conceptId":"mutable-default",...}
Mistake saved: mistakeId abc123
Triggering lesson generation async...
```

**What to look for in the lesson log:**
```
Promise.all started for userId:gh_XXXX conceptId:mutable-default
All 3 OpenRouter calls completed in 6.2s
Polly synthesized 847 chars → lessons/abc123.mp3
Lesson delivered to userId:gh_XXXX
```

### DynamoDB Verification

After each test, confirm data persisted correctly:

```bash
# Check mistake was saved
aws dynamodb scan \
  --table-name veda-mistakes \
  --region us-east-1 \
  --query "Items[-1]"

# Check lesson was saved with audioUrl
aws dynamodb scan \
  --table-name veda-lessons \
  --region us-east-1 \
  --query "Items[-1]"

# Check S3 audio file exists
aws s3 ls s3://veda-learn-audio/lessons/
```

### Common Failures and Fixes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Analyze Lambda returns `{"teach":false}` with no reason | Haiku confidence < 0.85 — code too clean | Use the exact bug snippets from the test suite above |
| Lesson Lambda times out (60s) | OpenRouter rate limit or slow model response | Check OpenRouter dashboard for errors; ensure `OPENROUTER_API_KEY` is set |
| WebSocket push succeeds but sidebar doesn't update | `postMessage` not forwarded from ws handler to webview | Check extension.ts ws `onMessage` is calling `webview.postMessage()` |
| Polly audio presigned URL returns 403 | CORS or S3 bucket policy issue | Run `aws s3api get-bucket-cors --bucket veda-learn-audio` and verify config from Day 1 |
| Mermaid renders raw text instead of diagram | Gemini returned extra text before/after syntax | Add a cleanup step: `diagram.replace(/```mermaid\n?/g,'').replace(/```/g,'').trim()` |
| Rate lock not releasing | TTL not enabled on `veda-rate-limits` table | Run `aws dynamodb update-time-to-live --table-name veda-rate-limits --time-to-live-specification "Enabled=true,AttributeName=ttl"` |
| `veda.jwt` is empty | VS Code SecretStorage lost token (extension reload) | Re-run GitHub OAuth flow |

---

## Day 2 Final Checkpoint

Before ending Day 2, verify every item below is checked. Do not start Day 3 with open items:

```
Core Pipeline
  [ ] Passive watcher fires exactly once after 30 seconds of no typing
  [ ] Status bar shows "Veda watching..." when idle, "Veda analyzing..." during call
  [ ] Haiku classifier returns valid JSON with confidence >= 0.85 for known bugs
  [ ] DynamoDB rate lock prevents duplicate lessons within 30s window
  [ ] Mistake written to veda-mistakes table with all fields populated

Lesson Generation
  [ ] All 3 OpenRouter calls (Sonnet × 2, Gemini × 1) complete successfully
  [ ] Explanation is plain English, no markdown, under 120 words (voice-ready)
  [ ] Code fix JSON parsed correctly — before/after fields populated
  [ ] Mermaid syntax is valid — renders without error
  [ ] Amazon Polly generates MP3 and stores it in veda-learn-audio bucket
  [ ] Presigned S3 URL is returned and valid (open it in browser — audio plays)
  [ ] Lesson written to veda-lessons DynamoDB table

Delivery
  [ ] WebSocket pushes lesson JSON to VS Code within ~12 seconds of analyze call
  [ ] All 3 sidebar panels render with staggered slide-in animation
  [ ] Panel 1: Explanation text visible, concept badge colored correctly
  [ ] Panel 2: Before/After code syntax-highlighted
  [ ] Panel 3: Mermaid diagram renders as SVG (not raw text)
  [ ] Polly audio auto-plays on lesson arrival
  [ ] Replay + Mute buttons work
  [ ] Fallback to Web Speech API if audioUrl is null

Integration Tests
  [ ] Python mutable default bug → full lesson delivered ✅
  [ ] JavaScript callback hell → full lesson delivered ✅
  [ ] TypeScript any-type abuse → full lesson delivered ✅
```

---

## What Day 3 Builds Next

With Day 2 complete, you have a fully working detection-and-teaching pipeline. Day 3 (Hours 11–15) adds:

- **Hour 11** — OpenSearch RAG: seed 10 concept documents with Titan Embeddings, retrieve relevant context to improve lesson quality
- **Hour 12** — Quiz Lambda: Claude Haiku generates 3-question MCQ after "Got it ✓", fires 30 seconds later
- **Hour 13** — Progress tracking: skill score system, streak counter, DynamoDB profile updates
- **Hour 14** — Deep Dive mode: Claude Opus triggered by manual button, fresh Polly audio generated
- **Hour 15** — Rate limit hardening + error boundaries + Polly fallback verification

---

*Veda Learn — Day 2 Detailed Roadmap · Hours 6–10 · Intelligence Layer*
*Generated from veda-learn-aws-roadmap.md — AWS Edition*
