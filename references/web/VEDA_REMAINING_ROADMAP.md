# 🚀 Veda Learn — Complete Implementation Roadmap
### From 35% → 100% · Every File · Every Line of Code

> **Author**: Senior Full-Stack Architect  
> **Date**: March 8, 2026  
> **Stack**: React 18 + Vite · AWS Lambda · DynamoDB · WebSocket · Claude AI · Amazon Polly  
> **Current State**: 35% complete · Infrastructure ✅ · Auth ✅ · Stubs need real logic  
> **Goal**: Hackathon-ready MVP in 8–10 hours · Full product in 18–22 hours

---

## 📊 Executive Summary

You have strong foundations — all infrastructure is deployed, auth works end-to-end, Monaco editor is live, and the analyze Lambda correctly detects patterns. What's missing is the **brain** (lesson/quiz generation), the **nervous system** (WebSocket real-time delivery), and the **display** (wiring panels to live data). This roadmap gives you every single file, command, and decision in exact execution order.

```
CURRENT STATE                    TARGET STATE
─────────────────────────────    ─────────────────────────────
Backend Infrastructure  ✅ 55%  →  Backend Infrastructure  ✅ 100%
Frontend Foundation     ✅ 25%  →  Frontend Foundation     ✅ 100%
Integration / WS         ⚠️  5%  →  Integration / WS        ✅ 100%
Overall                 35%     →  Overall                 100%
```

---

## 🗺️ Master File Map

Every file you will touch, in order of creation:

```
PHASE 1 — CORE (8–10 hours) 🔴 MUST SHIP
├── veda-learn-api/lib/websocket.js            ← NEW  WebSocket push utility
├── veda-learn-api/handlers/wsConnect.js       ← REWRITE  Store connectionId
├── veda-learn-api/handlers/wsDisconnect.js    ← REWRITE  Remove connectionId
├── veda-learn-api/lib/openrouter.js           ← NEW  AI API client
├── veda-learn-api/lib/polly.js                ← NEW  TTS + S3 upload
├── veda-learn-api/handlers/lesson.js          ← REWRITE  Full lesson gen
├── veda-learn-api/handlers/quiz.js            ← REWRITE  MCQ generation
├── veda-learn-api/handlers/progress.js        ← REWRITE  GET progress
├── veda-learn-api/handlers/progressUpdate.js  ← REWRITE  POST progress
└── veda-learn-web/src/hooks/useWebSocket.js   ← NEW  React WS hook

PHASE 2 — INTEGRATION (6–8 hours) 🟡 HIGH VALUE
├── veda-learn-web/src/pages/IDEPage.jsx       ← UPDATE  Wire all panels
├── veda-learn-web/src/components/panels/LessonPanel.jsx   ← NEW
├── veda-learn-web/src/components/panels/QuizPanel.jsx     ← NEW
├── veda-learn-web/src/components/panels/ProgressPanel.jsx ← NEW
├── veda-learn-web/src/components/panels/DoubtPanel.jsx    ← NEW
├── veda-learn-web/src/components/ide/GitHubPanel.jsx      ← UPDATE
└── veda-learn-web/src/pages/Landing.jsx       ← NEW

PHASE 3 — ENHANCEMENTS (4–6 hours) 🟢 DIFFERENTIATORS
├── veda-learn-api/lib/opensearch.js           ← NEW  RAG utility
├── veda-learn-api/scripts/seed_concepts.js    ← NEW  Knowledge base
├── veda-learn-api/handlers/doubt.js           ← NEW  AI chat
└── serverless.yml                             ← UPDATE  New routes
```

---

## ⚡ Phase 1: Core Functionality — The Engine

> **Time**: 8–10 hours | **Outcome**: analyze → lesson → quiz → progress pipeline fully functional

---

### Step 1.1 — WebSocket Push Utility
**File**: `veda-learn-api/lib/websocket.js`  
**Time**: 20 minutes  
**Why First**: Every downstream Lambda (lesson, quiz) depends on this to push messages to the browser.

```javascript
// veda-learn-api/lib/websocket.js
'use strict';

const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { DynamoDBClient, QueryCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Get all active WebSocket connectionIds for a given userId.
 * A user might have multiple open tabs — we push to all of them.
 */
async function getConnectionIds(userId) {
  const result = await dynamo.send(new QueryCommand({
    TableName: 'veda-ws-connections',
    IndexName: 'userId-index',          // GSI: userId → connectionId
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': { S: userId } },
  }));
  return (result.Items || []).map(item => item.connectionId.S);
}

/**
 * Push a JSON payload to a specific WebSocket connection.
 * Automatically removes stale connections (410 Gone).
 */
async function pushToConnection(connectionId, payload) {
  const endpoint = process.env.WEBSOCKET_ENDPOINT; // e.g. https://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
  const client = new ApiGatewayManagementApiClient({ endpoint });

  try {
    await client.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(payload)),
    }));
    return true;
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 410) {
      // Connection is stale — clean it up
      console.log(`[WS] Stale connection ${connectionId} — removing from DynamoDB`);
      await dynamo.send(new DeleteItemCommand({
        TableName: 'veda-ws-connections',
        Key: { connectionId: { S: connectionId } },
      }));
      return false;
    }
    console.error(`[WS] Failed to push to ${connectionId}:`, err.message);
    throw err;
  }
}

/**
 * Push a message to ALL active connections for a user.
 * Used by lesson.js, quiz.js, progressUpdate.js.
 *
 * @param {string} userId - DynamoDB userId
 * @param {object} message - { type: 'lesson'|'quiz'|'progress'|'error', data: {...} }
 */
async function pushToUser(userId, message) {
  const connectionIds = await getConnectionIds(userId);

  if (connectionIds.length === 0) {
    console.warn(`[WS] No active connections for userId=${userId}`);
    return { pushed: 0, skipped: 0 };
  }

  const results = await Promise.allSettled(
    connectionIds.map(id => pushToConnection(id, message))
  );

  const pushed  = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const skipped = results.length - pushed;

  console.log(`[WS] Pushed to ${pushed}/${connectionIds.length} connections for userId=${userId}`);
  return { pushed, skipped };
}

module.exports = { pushToUser, pushToConnection, getConnectionIds };
```

**Required DynamoDB GSI**: You need a Global Secondary Index on `veda-ws-connections`. Run this once:

```bash
aws dynamodb update-table \
  --table-name veda-ws-connections \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{\"IndexName\":\"userId-index\",\"KeySchema\":[{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"BillingMode\":\"PAY_PER_REQUEST\"}}]" \
  --region us-east-1
```

---

### Step 1.2 — WebSocket Connect Handler
**File**: `veda-learn-api/handlers/wsConnect.js`  
**Time**: 20 minutes

```javascript
// veda-learn-api/handlers/wsConnect.js
'use strict';

const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const jwt = require('jsonwebtoken');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

module.exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const domainName   = event.requestContext.domainName;
  const stage        = event.requestContext.stage;

  // Extract JWT from query string: wss://...?token=JWT
  const token = event.queryStringParameters?.token;

  if (!token) {
    console.warn(`[wsConnect] Missing token for connectionId=${connectionId}`);
    return { statusCode: 401, body: 'Unauthorized: missing token' };
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch (err) {
    console.warn(`[wsConnect] Invalid JWT: ${err.message}`);
    return { statusCode: 403, body: 'Forbidden: invalid token' };
  }

  // TTL: connections expire after 2 hours (API Gateway max is 2h anyway)
  const ttl = Math.floor(Date.now() / 1000) + 7200;

  try {
    await dynamo.send(new PutItemCommand({
      TableName: 'veda-ws-connections',
      Item: {
        connectionId: { S: connectionId },
        userId:       { S: userId },
        endpoint:     { S: `https://${domainName}/${stage}` },
        connectedAt:  { S: new Date().toISOString() },
        ttl:          { N: ttl.toString() },
      },
    }));

    console.log(`[wsConnect] userId=${userId} connected via connectionId=${connectionId}`);
    return { statusCode: 200, body: 'Connected' };
  } catch (err) {
    console.error('[wsConnect] DynamoDB error:', err);
    return { statusCode: 500, body: 'Internal error' };
  }
};
```

---

### Step 1.3 — WebSocket Disconnect Handler
**File**: `veda-learn-api/handlers/wsDisconnect.js`  
**Time**: 10 minutes

```javascript
// veda-learn-api/handlers/wsDisconnect.js
'use strict';

const { DynamoDBClient, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

module.exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    await dynamo.send(new DeleteItemCommand({
      TableName: 'veda-ws-connections',
      Key: { connectionId: { S: connectionId } },
    }));

    console.log(`[wsDisconnect] connectionId=${connectionId} removed`);
    return { statusCode: 200, body: 'Disconnected' };
  } catch (err) {
    // Non-fatal — log and move on
    console.error('[wsDisconnect] DynamoDB error:', err.message);
    return { statusCode: 200, body: 'Disconnected (cleanup failed)' };
  }
};
```

---

### Step 1.4 — React WebSocket Hook
**File**: `veda-learn-web/src/hooks/useWebSocket.js`  
**Time**: 45 minutes  
**Why This Matters**: This is the real-time nerve center of the entire app. Get this right and lessons, quizzes, and progress updates all flow automatically.

```javascript
// veda-learn-web/src/hooks/useWebSocket.js
import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../store/useStore';

const WS_URL       = import.meta.env.VITE_WS_URL;       // wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
const PING_INTERVAL = 25_000;   // 25s — keep-alive below 29s API Gateway timeout
const MAX_RETRIES   = 5;
const BASE_BACKOFF  = 1_000;    // 1s · doubles each retry → max ~16s

export function useWebSocket() {
  const wsRef           = useRef(null);
  const pingRef         = useRef(null);
  const retryRef        = useRef(0);
  const retryTimerRef   = useRef(null);
  const mountedRef      = useRef(true);

  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | connected | error

  // Zustand actions — pulled outside to avoid stale closures
  const setLesson       = useStore(s => s.setLesson);
  const setQuiz         = useStore(s => s.setQuiz);
  const updateProgress  = useStore(s => s.updateProgress);
  const addNotification = useStore(s => s.addNotification);
  const setWsStatus     = useStore(s => s.setWsStatus);

  /** Route incoming WS message to the correct store action */
  const handleMessage = useCallback((raw) => {
    let msg;
    try { msg = JSON.parse(raw); }
    catch { console.warn('[WS] Unparseable message:', raw); return; }

    console.log(`[WS] ← ${msg.type}`, msg.data);

    switch (msg.type) {
      case 'lesson':
        setLesson(msg.data);
        addNotification({ type: 'lesson', title: 'New lesson ready', body: msg.data.concept });
        break;

      case 'quiz':
        setQuiz(msg.data);
        addNotification({ type: 'quiz', title: 'Quiz unlocked', body: `${msg.data.questions?.length} questions` });
        break;

      case 'progress':
        updateProgress(msg.data);
        break;

      case 'analysis_complete':
        // analyze Lambda finished — lesson Lambda will be invoked automatically
        addNotification({ type: 'analyze', title: 'Analysis complete', body: `${msg.data.concept} detected` });
        break;

      case 'error':
        console.error('[WS] Server error:', msg.data);
        addNotification({ type: 'error', title: 'Error', body: msg.data.message });
        break;

      case 'pong':
        // Keep-alive response — no action needed
        break;

      default:
        console.warn('[WS] Unknown message type:', msg.type);
    }
  }, [setLesson, setQuiz, updateProgress, addNotification]);

  /** Start the 25s ping to prevent API Gateway timeout */
  const startPing = useCallback(() => {
    stopPing();
    pingRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, PING_INTERVAL);
  }, []);

  const stopPing = useCallback(() => {
    if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
  }, []);

  /** Connect (or reconnect) to the WebSocket */
  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const token = localStorage.getItem('veda_token');
    if (!token) {
      console.warn('[WS] No JWT found — skipping connection');
      return;
    }

    // Clean up any existing socket
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnect loop
      wsRef.current.close();
    }

    const url = `${WS_URL}?token=${encodeURIComponent(token)}`;
    console.log(`[WS] Connecting (attempt ${retryRef.current + 1})…`);
    setStatus('connecting');
    setWsStatus('connecting');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      console.log('[WS] ✅ Connected');
      retryRef.current = 0;
      setStatus('connected');
      setWsStatus('connected');
      startPing();
    };

    ws.onmessage = (event) => {
      if (mountedRef.current) handleMessage(event.data);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      setStatus('error');
      setWsStatus('error');
    };

    ws.onclose = (event) => {
      stopPing();
      if (!mountedRef.current) return;

      console.warn(`[WS] Closed (code=${event.code}, reason=${event.reason})`);
      setStatus('disconnected');
      setWsStatus('disconnected');

      // Don't retry on auth failure
      if (event.code === 4001 || event.code === 4003) {
        console.error('[WS] Auth failure — not retrying');
        return;
      }

      // Exponential back-off retry
      if (retryRef.current < MAX_RETRIES) {
        const delay = BASE_BACKOFF * Math.pow(2, retryRef.current);
        retryRef.current += 1;
        console.log(`[WS] Retrying in ${delay}ms (attempt ${retryRef.current}/${MAX_RETRIES})`);
        retryTimerRef.current = setTimeout(connect, delay);
      } else {
        console.error('[WS] Max retries reached');
        setStatus('error');
        setWsStatus('error');
      }
    };
  }, [handleMessage, startPing, stopPing, setWsStatus]);

  /** Send a message — queue-safe (waits for OPEN state) */
  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    console.warn('[WS] Cannot send — not connected');
    return false;
  }, []);

  /** Manual reconnect (exposed to UI) */
  const reconnect = useCallback(() => {
    retryRef.current = 0;
    clearTimeout(retryTimerRef.current);
    connect();
  }, [connect]);

  // Mount / Unmount lifecycle
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      stopPing();
      clearTimeout(retryTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, []);  // eslint-disable-line — intentionally runs once

  return { status, send, reconnect };
}
```

**Add to Zustand store** (`useStore.js`) — these slices are required by the hook:

```javascript
// Add these slices inside your createStore call in useStore.js

// WebSocket status
wsStatus: 'disconnected',
setWsStatus: (status) => set({ wsStatus: status }),

// Lesson
currentLesson: null,
setLesson: (lesson) => set({ currentLesson: lesson, showLesson: true }),

// Quiz
currentQuiz: null,
quizActive: false,
setQuiz: (quiz) => set({ currentQuiz: quiz, quizActive: true }),

// Progress
progress: { xp: 0, streak: 0, concepts: {}, badges: [] },
updateProgress: (data) => set((s) => ({ progress: { ...s.progress, ...data } })),

// Notifications
notifications: [],
addNotification: (notif) => set((s) => ({
  notifications: [
    { id: Date.now(), read: false, time: new Date().toISOString(), ...notif },
    ...s.notifications.slice(0, 49),  // Keep last 50
  ],
})),
markNotificationRead: (id) => set((s) => ({
  notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
})),
```

---

### Step 1.5 — OpenRouter API Client
**File**: `veda-learn-api/lib/openrouter.js`  
**Time**: 25 minutes

```javascript
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
          'HTTP-Referer':  'https://vedalea.rn',
          'X-Title':       'Veda Learn',
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
  HAIKU:  'anthropic/claude-haiku-4-5',
  SONNET: 'anthropic/claude-sonnet-4-6',
  FLASH:  'google/gemini-flash-1.5',     // Cheap fallback
};

module.exports = { chatCompletion, parallelCompletion, MODELS };
```

---

### Step 1.6 — Amazon Polly TTS + S3 Upload
**File**: `veda-learn-api/lib/polly.js`  
**Time**: 30 minutes

```javascript
// veda-learn-api/lib/polly.js
'use strict';

const {
  PollyClient,
  SynthesizeSpeechCommand,
} = require('@aws-sdk/client-polly');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Readable } = require('stream');

const polly  = new PollyClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3     = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.AUDIO_BUCKET || 'veda-audio-lessons';

/**
 * Synthesize speech using Amazon Polly (Ruth Neural voice — generative quality).
 * Uploads the audio to S3 and returns a 24-hour presigned URL.
 *
 * @param {string} text   - Plain text to synthesize (max ~3000 chars)
 * @param {string} lessonId
 * @param {string} userId
 * @returns {Promise<string>} presigned S3 URL
 */
async function synthesizeLesson(text, lessonId, userId) {
  // Truncate to Polly's 3000 char limit
  const trimmed = text.slice(0, 2900);

  // 1. Generate audio stream from Polly
  const pollyRes = await polly.send(new SynthesizeSpeechCommand({
    Engine:       'generative',    // Best quality — requires us-east-1
    VoiceId:      'Ruth',
    OutputFormat: 'mp3',
    Text:         trimmed,
    TextType:     'text',
  }));

  // 2. Convert stream → Buffer
  const audioBuffer = await streamToBuffer(pollyRes.AudioStream);

  // 3. Upload to S3
  const s3Key = `audio/${userId}/${lessonId}.mp3`;
  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         s3Key,
    Body:        audioBuffer,
    ContentType: 'audio/mpeg',
    Metadata: {
      userId,
      lessonId,
      generatedAt: new Date().toISOString(),
    },
  }));

  // 4. Generate presigned URL valid for 24 hours
  const presignedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }),
    { expiresIn: 86400 }
  );

  console.log(`[Polly] Synthesized ${audioBuffer.length} bytes → s3://${BUCKET}/${s3Key}`);
  return presignedUrl;
}

/** Convert a Readable stream to a Buffer */
async function streamToBuffer(stream) {
  if (Buffer.isBuffer(stream)) return stream;

  return new Promise((resolve, reject) => {
    const chunks = [];
    const readable = stream instanceof Readable ? stream : Readable.from(stream);
    readable.on('data', chunk => chunks.push(chunk));
    readable.on('end',  () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

/**
 * Graceful fallback: if Polly fails (quota, region, etc.),
 * return null and the frontend will use the Web Speech API instead.
 */
async function synthesizeLessonSafe(text, lessonId, userId) {
  try {
    return await synthesizeLesson(text, lessonId, userId);
  } catch (err) {
    console.error('[Polly] Synthesis failed (will use browser TTS fallback):', err.message);
    return null;
  }
}

module.exports = { synthesizeLesson, synthesizeLessonSafe };
```

---

### Step 1.7 — Lesson Generation Handler ⭐ Core Feature
**File**: `veda-learn-api/handlers/lesson.js`  
**Time**: 60 minutes  
**This is the heart of Veda.** It takes a detected mistake, fires 3 parallel AI calls, synthesizes audio, stores everything, and pushes to the browser via WebSocket.

```javascript
// veda-learn-api/handlers/lesson.js
'use strict';

const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { chatCompletion, parallelCompletion, MODELS } = require('../lib/openrouter');
const { synthesizeLessonSafe } = require('../lib/polly');
const { pushToUser } = require('../lib/websocket');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

// ─── System prompt shared across all 3 lesson calls ───────────────────────────
const SYSTEM = `You are Veda, an expert programming tutor. Your lessons are:
- Concise (200-300 words max for explanation)
- Actionable (always show before AND after code)  
- Memorable (use an analogy or mental model)
- Friendly but precise — like a senior dev doing a code review
Always respond in the exact JSON format requested. No markdown wrapping.`;

// ─── Prompt builders ───────────────────────────────────────────────────────────

function buildExplanationPrompt(concept, code, language) {
  return {
    model:    MODELS.SONNET,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `
Generate a lesson for the concept: "${concept}"
Language: ${language}
Student's code that triggered this:
\`\`\`${language}
${code}
\`\`\`

Respond with ONLY this JSON (no markdown):
{
  "title": "Short lesson title (5-7 words)",
  "severity": "bug|antipattern|performance|style",
  "explanation": "2-3 paragraph explanation with an analogy. Plain text, no markdown.",
  "whyItMatters": "One sentence on real-world impact.",
  "audioText": "What Polly should speak aloud (same as explanation but optimized for listening — no code, no symbols)."
}`,
      },
    ],
    maxTokens: 800,
  };
}

function buildCodeFixPrompt(concept, code, language) {
  return {
    model:    MODELS.SONNET,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `
Show a before/after code fix for the concept: "${concept}"
Language: ${language}
Student's code:
\`\`\`${language}
${code}
\`\`\`

Respond with ONLY this JSON (no markdown):
{
  "codeBefore": "The problematic code snippet (max 15 lines)",
  "codeAfter": "The fixed code snippet (max 15 lines)",
  "diffHighlights": ["line 3: changed X to Y", "added null check on line 5"],
  "keyChange": "One sentence describing the most important change."
}`,
      },
    ],
    maxTokens: 600,
  };
}

function buildQuizPrompt(concept, language) {
  return {
    model:    MODELS.HAIKU,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `
Generate exactly 3 multiple-choice quiz questions to test understanding of: "${concept}" in ${language}.

Rules:
- Question 1: conceptual understanding
- Question 2: identify the bug in code
- Question 3: best practice / real-world scenario
- Each question: 1 correct answer, 3 distractors
- Distractors must be plausible — not obviously wrong

Respond with ONLY this JSON (no markdown):
{
  "questions": [
    {
      "question": "Question text",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answerIndex": 0,
      "explanation": "Why this answer is correct (1-2 sentences)."
    }
  ]
}`,
      },
    ],
    maxTokens: 700,
  };
}

// ─── Main handler ──────────────────────────────────────────────────────────────

module.exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
  };

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { mistakeId, userId, concept, code, language = 'python', confidence } = body;

  if (!userId || !concept || !code) {
    return {
      statusCode: 400, headers,
      body: JSON.stringify({ error: 'Required: userId, concept, code' }),
    };
  }

  console.log(`[lesson] Generating for userId=${userId} concept=${concept}`);
  const lessonId = uuidv4();
  const startTime = Date.now();

  try {
    // ── STEP 1: Run 3 parallel AI calls ──────────────────────────────────────
    console.log('[lesson] Firing 3 parallel AI calls…');
    const [explanationRaw, codeFixRaw, quizRaw] = await parallelCompletion([
      buildExplanationPrompt(concept, code, language),
      buildCodeFixPrompt(concept, code, language),
      buildQuizPrompt(concept, language),
    ]);

    // ── STEP 2: Parse responses ───────────────────────────────────────────────
    let explanation, codeFix, quiz;
    try {
      explanation = JSON.parse(explanationRaw);
      codeFix     = JSON.parse(codeFixRaw);
      quiz        = JSON.parse(quizRaw);
    } catch (parseErr) {
      console.error('[lesson] JSON parse error:', parseErr.message);
      console.error('explanationRaw:', explanationRaw);
      console.error('codeFixRaw:', codeFixRaw);
      console.error('quizRaw:', quizRaw);
      throw new Error('AI response was not valid JSON');
    }

    // ── STEP 3: Synthesize audio ──────────────────────────────────────────────
    console.log('[lesson] Synthesizing audio with Polly…');
    const audioUrl = await synthesizeLessonSafe(
      explanation.audioText || explanation.explanation,
      lessonId,
      userId
    );

    // ── STEP 4: Build lesson payload ──────────────────────────────────────────
    const lesson = {
      lessonId,
      mistakeId:    mistakeId || null,
      concept,
      language,
      confidence:   confidence || 0,
      title:        explanation.title,
      severity:     explanation.severity || 'antipattern',
      explanation:  explanation.explanation,
      whyItMatters: explanation.whyItMatters,
      codeBefore:   codeFix.codeBefore,
      codeAfter:    codeFix.codeAfter,
      diffHighlights: codeFix.diffHighlights || [],
      keyChange:    codeFix.keyChange,
      audioUrl:     audioUrl || null,   // null → frontend uses Web Speech API
      generatedAt:  new Date().toISOString(),
      generationMs: Date.now() - startTime,
    };

    // ── STEP 5: Store lesson + quiz in DynamoDB ───────────────────────────────
    console.log('[lesson] Saving to DynamoDB…');
    await Promise.all([
      dynamo.send(new PutItemCommand({
        TableName: 'veda-lessons',
        Item: {
          lessonId:     { S: lesson.lessonId },
          userId:       { S: userId },
          mistakeId:    { S: lesson.mistakeId || '' },
          concept:      { S: concept },
          language:     { S: language },
          title:        { S: lesson.title },
          explanation:  { S: lesson.explanation },
          audioUrl:     { S: lesson.audioUrl || '' },
          deliveredAt:  { S: lesson.generatedAt },
          gotIt:        { BOOL: false },
          deepDive:     { BOOL: false },
        },
      })),
      dynamo.send(new PutItemCommand({
        TableName: 'veda-quizzes',   // You may need to create this table
        Item: {
          quizId:    { S: uuidv4() },
          lessonId:  { S: lessonId },
          userId:    { S: userId },
          concept:   { S: concept },
          questions: { S: JSON.stringify(quiz.questions) },
          createdAt: { S: new Date().toISOString() },
          completed: { BOOL: false },
        },
      })),
    ]);

    // ── STEP 6: Push lesson + quiz to browser via WebSocket ───────────────────
    console.log('[lesson] Pushing to WebSocket…');
    await pushToUser(userId, {
      type: 'lesson',
      data: lesson,
    });

    // Push quiz 3s after lesson so the UI can animate the lesson in first
    setTimeout(async () => {
      try {
        await pushToUser(userId, {
          type: 'quiz',
          data: { lessonId, concept, questions: quiz.questions },
        });
      } catch (e) {
        console.error('[lesson] Delayed quiz push failed:', e.message);
      }
    }, 3000);

    console.log(`[lesson] ✅ Complete in ${Date.now() - startTime}ms`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, lessonId, lesson }),
    };

  } catch (err) {
    console.error('[lesson] Fatal error:', err);

    // Push error to user so they see feedback in the UI
    await pushToUser(userId, {
      type: 'error',
      data: { message: 'Lesson generation failed. Try again in a moment.' },
    }).catch(() => {});

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
```

---

### Step 1.8 — Quiz Handler
**File**: `veda-learn-api/handlers/quiz.js`  
**Time**: 30 minutes

```javascript
// veda-learn-api/handlers/quiz.js
'use strict';

const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { chatCompletion, MODELS } = require('../lib/openrouter');
const { pushToUser } = require('../lib/websocket');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

module.exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
  };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { action, userId, lessonId, concept, language, answers } = body;

  // ── GET quiz for a lesson ────────────────────────────────────────────────────
  if (action === 'get' || !action) {
    if (!lessonId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'lessonId required' }) };
    }

    try {
      // On-demand generation if not cached (fallback path)
      if (concept && language) {
        const raw = await chatCompletion({
          model:   MODELS.HAIKU,
          messages: [
            {
              role: 'system',
              content: 'You are a quiz generator. Respond only in JSON.',
            },
            {
              role: 'user',
              content: `Generate 3 MCQ questions for the concept "${concept}" in ${language}.
Return ONLY: {"questions":[{"question":"","options":["A.","B.","C.","D."],"answerIndex":0,"explanation":""}]}`,
            },
          ],
          maxTokens: 600,
        });
        const quiz = JSON.parse(raw);
        return { statusCode: 200, headers, body: JSON.stringify({ quiz }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Quiz was delivered via WebSocket' }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── SUBMIT quiz answers ──────────────────────────────────────────────────────
  if (action === 'submit') {
    if (!userId || !lessonId || !Array.isArray(answers)) {
      return {
        statusCode: 400, headers,
        body: JSON.stringify({ error: 'userId, lessonId, and answers[] required' }),
      };
    }

    try {
      // Score answers
      const score = answers.reduce((acc, a) => acc + (a.correct ? 1 : 0), 0);
      const total = answers.length;
      const passed = score >= Math.ceil(total * 0.6); // 60% to pass
      const xpEarned = passed ? 15 * score : 5;

      // Update quiz record
      await dynamo.send(new UpdateItemCommand({
        TableName:                 'veda-quizzes',
        Key:                       { lessonId: { S: lessonId }, userId: { S: userId } },
        UpdateExpression:          'SET completed = :t, score = :s, xpEarned = :x, completedAt = :d',
        ExpressionAttributeValues: {
          ':t': { BOOL: true },
          ':s': { N: score.toString() },
          ':x': { N: xpEarned.toString() },
          ':d': { S: new Date().toISOString() },
        },
      }));

      // Push XP update via WebSocket
      if (passed) {
        await pushToUser(userId, {
          type: 'progress',
          data: { xpDelta: xpEarned, quizPassed: true, concept },
        }).catch(() => {});
      }

      return {
        statusCode: 200, headers,
        body: JSON.stringify({ score, total, passed, xpEarned }),
      };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
};
```

---

### Step 1.9 — Progress Handlers
**File**: `veda-learn-api/handlers/progress.js` (GET)  
**Time**: 25 minutes

```javascript
// veda-learn-api/handlers/progress.js
'use strict';

const { DynamoDBClient, GetItemCommand, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

module.exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
  };

  const userId = event.pathParameters?.userId
    || event.queryStringParameters?.userId
    || JSON.parse(event.body || '{}').userId;

  if (!userId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) };
  }

  try {
    // ── 1. Fetch learning profile ─────────────────────────────────────────────
    const profileRes = await dynamo.send(new GetItemCommand({
      TableName: 'veda-learning-profiles',
      Key: { userId: { S: userId } },
    }));

    // Default profile for new users
    const profile = profileRes.Item
      ? unmarshall(profileRes.Item)
      : {
          userId,
          xp:             0,
          streak:         0,
          lastActiveDate: null,
          concepts:       {},
          quizzesTaken:   0,
          quizzesPassed:  0,
          totalLessons:   0,
          badges:         [],
        };

    // ── 2. Recalculate streak based on today's date ────────────────────────────
    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastDate  = profile.lastActiveDate;

    if (lastDate && lastDate !== today && lastDate !== yesterday) {
      // Streak broken — reset
      profile.streak = 0;
    }

    // ── 3. Fetch recent mistakes for activity feed ─────────────────────────────
    const mistakesRes = await dynamo.send(new QueryCommand({
      TableName:              'veda-mistakes',
      IndexName:              'userId-index',
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': { S: userId } },
      ScanIndexForward:       false,
      Limit:                  10,
    }));

    const recentMistakes = (mistakesRes.Items || []).map(i => unmarshall(i));

    // ── 4. Compute weekly XP chart (last 7 days) ───────────────────────────────
    const weeklyXP = computeWeeklyXP(recentMistakes, profile.xp);

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        ...profile,
        weeklyXP,
        recentMistakes: recentMistakes.slice(0, 5),
        level: Math.floor(profile.xp / 100) + 1,   // Level up every 100 XP
        nextLevelXP: ((Math.floor(profile.xp / 100) + 1) * 100),
      }),
    };
  } catch (err) {
    console.error('[progress] Error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

/** Generate a 7-day XP breakdown for the progress chart */
function computeWeeklyXP(mistakes, totalXP) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const dayMistakes = mistakes.filter(m =>
      m.detectedAt && m.detectedAt.startsWith(date)
    ).length;
    days.push({
      date,
      label: new Date(Date.now() - i * 86400000).toLocaleDateString('en', { weekday: 'short' }),
      xp: dayMistakes * 15,   // 15 XP per lesson/day approximation
    });
  }
  return days;
}
```

**File**: `veda-learn-api/handlers/progressUpdate.js` (POST)

```javascript
// veda-learn-api/handlers/progressUpdate.js
'use strict';

const {
  DynamoDBClient,
  UpdateItemCommand,
  GetItemCommand,
  PutItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { unmarshall, marshall } = require('@aws-sdk/util-dynamodb');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

// XP thresholds for badges
const BADGES = [
  { id: 'first_lesson',   label: '🎓 First Lesson',  xp: 0,    check: (p) => p.totalLessons >= 1 },
  { id: 'streak_3',       label: '🔥 3-Day Streak',  xp: 0,    check: (p) => p.streak >= 3 },
  { id: 'streak_7',       label: '⚡ 7-Day Streak',  xp: 0,    check: (p) => p.streak >= 7 },
  { id: 'xp_100',         label: '💯 100 XP',        xp: 100,  check: (p) => p.xp >= 100 },
  { id: 'xp_500',         label: '🚀 500 XP',        xp: 500,  check: (p) => p.xp >= 500 },
  { id: 'concept_master', label: '🧠 Concept Master', xp: 0,   check: (p) => Object.values(p.concepts || {}).some(v => v >= 90) },
];

module.exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
  };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { userId, xpDelta = 0, quizPassed, concept, mistakeType } = body;

  if (!userId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) };
  }

  try {
    // ── 1. Fetch current profile ───────────────────────────────────────────────
    const res = await dynamo.send(new GetItemCommand({
      TableName: 'veda-learning-profiles',
      Key: { userId: { S: userId } },
    }));

    const now   = new Date().toISOString();
    const today = now.split('T')[0];

    let profile = res.Item
      ? unmarshall(res.Item)
      : { userId, xp: 0, streak: 0, lastActiveDate: null, concepts: {}, quizzesTaken: 0, quizzesPassed: 0, totalLessons: 0, badges: [] };

    // ── 2. Update XP ───────────────────────────────────────────────────────────
    profile.xp += xpDelta;

    // ── 3. Update streak ───────────────────────────────────────────────────────
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (profile.lastActiveDate === yesterday) {
      profile.streak += 1;
    } else if (profile.lastActiveDate !== today) {
      profile.streak = 1;
    }
    profile.lastActiveDate = today;

    // ── 4. Update concept mastery (0-100 scale) ────────────────────────────────
    if (concept) {
      const current = profile.concepts[concept] || 0;
      const delta   = quizPassed ? 15 : 5;
      profile.concepts[concept] = Math.min(100, current + delta);
    }

    // ── 5. Update lesson/quiz counters ─────────────────────────────────────────
    if (concept) profile.totalLessons += 1;
    if (quizPassed !== undefined) {
      profile.quizzesTaken  += 1;
      if (quizPassed) profile.quizzesPassed += 1;
    }

    // ── 6. Check and award badges ──────────────────────────────────────────────
    const existingBadges = new Set(profile.badges || []);
    const newBadges = [];

    for (const badge of BADGES) {
      if (!existingBadges.has(badge.id) && badge.check(profile)) {
        existingBadges.add(badge.id);
        newBadges.push(badge);
      }
    }
    profile.badges = [...existingBadges];

    // ── 7. Save updated profile ────────────────────────────────────────────────
    await dynamo.send(new PutItemCommand({
      TableName: 'veda-learning-profiles',
      Item: marshall(profile),
    }));

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        ...profile,
        newBadges,
        level: Math.floor(profile.xp / 100) + 1,
      }),
    };
  } catch (err) {
    console.error('[progressUpdate] Error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

## ⚡ Phase 2: Frontend Panel Components

> **Time**: 6–8 hours | **Outcome**: All UI panels wired to live data — no more mock state

---

### Step 2.1 — Lesson Panel Component
**File**: `veda-learn-web/src/components/panels/LessonPanel.jsx`  
**Time**: 60 minutes

```jsx
// veda-learn-web/src/components/panels/LessonPanel.jsx
import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';

// Severity badge config
const SEVERITY = {
  bug:         { color: '#ef4444', bg: 'rgba(239,68,68,.1)',   border: 'rgba(239,68,68,.25)',  label: '🔴 Bug' },
  antipattern: { color: '#f97316', bg: 'rgba(249,115,22,.1)',  border: 'rgba(249,115,22,.25)', label: '🟠 Anti-pattern' },
  performance: { color: '#eab308', bg: 'rgba(234,179,8,.1)',   border: 'rgba(234,179,8,.25)',  label: '🟡 Performance' },
  style:       { color: '#6366f1', bg: 'rgba(99,102,241,.1)', border: 'rgba(99,102,241,.25)', label: '🔵 Style' },
};

export function LessonPanel() {
  const lesson     = useStore(s => s.currentLesson);
  const setLesson  = useStore(s => s.setLesson);
  const updateProgress = useStore(s => s.updateProgress);

  const [tab,       setTab]       = useState('explanation'); // explanation | code | audio
  const [gotIt,     setGotIt]     = useState(false);
  const [playing,   setPlaying]   = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDur,  setAudioDur]  = useState(0);

  const audioRef = useRef(null);
  const progressRef = useRef(null);

  // Auto-play audio when lesson arrives
  useEffect(() => {
    if (lesson?.audioUrl && audioRef.current) {
      audioRef.current.load();
      // Don't autoplay — browser policy blocks it. Let user click.
    }
  }, [lesson?.audioUrl]);

  // Web Speech API fallback for when Polly URL is null
  const speakFallback = () => {
    if (!lesson?.explanation) return;
    const utterance = new SpeechSynthesisUtterance(lesson.explanation);
    utterance.rate  = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setPlaying(true);
    utterance.onend   = () => setPlaying(false);
    speechSynthesis.speak(utterance);
    setPlaying(true);
  };

  const toggleAudio = () => {
    if (!lesson) return;

    if (lesson.audioUrl) {
      if (playing) { audioRef.current.pause(); setPlaying(false); }
      else         { audioRef.current.play().then(() => setPlaying(true)).catch(speakFallback); }
    } else {
      if (playing) { speechSynthesis.cancel(); setPlaying(false); }
      else         speakFallback();
    }
  };

  const handleGotIt = async () => {
    if (!lesson || gotIt) return;
    setGotIt(true);

    try {
      await api.post('/progress/update', {
        userId: localStorage.getItem('veda_userId'),
        xpDelta: 10,
        concept: lesson.concept,
      });
    } catch (e) {
      console.error('[LessonPanel] Progress update failed:', e.message);
    }
  };

  // Empty state
  if (!lesson) {
    return (
      <div className="lesson-empty">
        <div className="lesson-empty__icon">👁️</div>
        <h3>Veda is watching</h3>
        <p>Write code and pause 30 seconds — or press <kbd>F5</kbd> to analyze now.</p>
        <div className="lesson-empty__hint">Analysis fires automatically · Lessons arrive via WebSocket</div>
      </div>
    );
  }

  const sev = SEVERITY[lesson.severity] || SEVERITY.antipattern;

  return (
    <div className="lesson-panel">
      {/* ── Header ── */}
      <div className="lesson-panel__header">
        <div className="lesson-panel__meta">
          <span className="lesson-panel__badge"
            style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.border}` }}>
            {sev.label}
          </span>
          <span className="lesson-panel__concept">{lesson.concept}</span>
          {lesson.confidence > 0 && (
            <span className="lesson-panel__confidence">
              {Math.round(lesson.confidence * 100)}% confidence
            </span>
          )}
        </div>
        <h2 className="lesson-panel__title">{lesson.title}</h2>
        <p className="lesson-panel__why">{lesson.whyItMatters}</p>
      </div>

      {/* ── Audio bar ── */}
      <div className="lesson-panel__audio">
        <button className={`audio-btn ${playing ? 'audio-btn--playing' : ''}`} onClick={toggleAudio}>
          {playing
            ? <svg width="16" height="16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1"/><rect x="9" y="2" width="4" height="12" rx="1"/></svg>
            : <svg width="16" height="16" fill="currentColor"><polygon points="5,2 15,8 5,14"/></svg>
          }
        </button>
        <div className="audio-progress" ref={progressRef}>
          <div className="audio-progress__track">
            <div className="audio-progress__fill"
              style={{ width: audioDur > 0 ? `${(audioTime / audioDur) * 100}%` : '0%' }}
            />
          </div>
        </div>
        <span className="audio-duration">
          {lesson.audioUrl ? 'Polly TTS' : 'Browser TTS'}
        </span>
        {lesson.audioUrl && (
          <audio ref={audioRef} src={lesson.audioUrl} style={{ display: 'none' }}
            onTimeUpdate={(e) => setAudioTime(e.target.currentTime)}
            onLoadedMetadata={(e) => setAudioDur(e.target.duration)}
            onEnded={() => setPlaying(false)}
          />
        )}
      </div>

      {/* ── Tab nav ── */}
      <div className="lesson-panel__tabs">
        {[
          { id: 'explanation', label: '📖 Explanation' },
          { id: 'code',        label: '🔧 Code Fix' },
        ].map(t => (
          <button key={t.id}
            className={`lesson-tab ${tab === t.id ? 'lesson-tab--active' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="lesson-panel__body">
        {tab === 'explanation' && (
          <div className="lesson-explanation">
            {lesson.explanation.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        {tab === 'code' && (
          <div className="lesson-code">
            <div className="code-block code-block--before">
              <div className="code-block__label">Before</div>
              <pre><code>{lesson.codeBefore}</code></pre>
            </div>
            <div className="code-diff-arrow">↓ Fix</div>
            <div className="code-block code-block--after">
              <div className="code-block__label">After</div>
              <pre><code>{lesson.codeAfter}</code></pre>
            </div>
            {lesson.keyChange && (
              <div className="code-key-change">
                💡 {lesson.keyChange}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="lesson-panel__actions">
        <button
          className={`lesson-action-btn lesson-action-btn--primary ${gotIt ? 'lesson-action-btn--done' : ''}`}
          onClick={handleGotIt}
          disabled={gotIt}>
          {gotIt ? '✅ Got it! (+10 XP)' : '✓ Got it'}
        </button>
      </div>
    </div>
  );
}
```

---

### Step 2.2 — Quiz Panel Component
**File**: `veda-learn-web/src/components/panels/QuizPanel.jsx`  
**Time**: 50 minutes

```jsx
// veda-learn-web/src/components/panels/QuizPanel.jsx
import { useState, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import confetti from 'canvas-confetti';

function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.5 },
    colors: ['#6366f1', '#8b5cf6', '#fbbf24', '#10b981'],
  });
}

export function QuizPanel() {
  const quiz       = useStore(s => s.currentQuiz);
  const setQuiz    = useStore(s => s.setQuiz);
  const updateProgress = useStore(s => s.updateProgress);

  const [selected,   setSelected]   = useState({});   // { questionIndex: selectedOptionIndex }
  const [submitted,  setSubmitted]  = useState(false);
  const [result,     setResult]     = useState(null);  // { score, total, passed, xpEarned }
  const [loading,    setLoading]    = useState(false);

  const handleSelect = useCallback((qIdx, oIdx) => {
    if (submitted) return;
    setSelected(prev => ({ ...prev, [qIdx]: oIdx }));
  }, [submitted]);

  const handleSubmit = async () => {
    if (!quiz || loading) return;
    const allAnswered = quiz.questions.every((_, i) => selected[i] !== undefined);
    if (!allAnswered) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setLoading(true);
    try {
      const answers = quiz.questions.map((q, i) => ({
        questionIndex: i,
        selectedIndex: selected[i],
        correct: selected[i] === q.answerIndex,
      }));

      const res = await api.post('/quiz', {
        action: 'submit',
        userId: localStorage.getItem('veda_userId'),
        lessonId: quiz.lessonId,
        answers,
      });

      const data = res.data;
      setResult(data);
      setSubmitted(true);

      if (data.passed) {
        fireConfetti();
        updateProgress({ xpDelta: data.xpEarned });
      }
    } catch (err) {
      console.error('[QuizPanel] Submit error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Empty state
  if (!quiz) {
    return (
      <div className="quiz-empty">
        <div className="quiz-empty__icon">🎯</div>
        <h3>Quiz will appear here</h3>
        <p>A quiz unlocks automatically 3 seconds after your lesson arrives.</p>
      </div>
    );
  }

  // Results screen
  if (submitted && result) {
    return (
      <div className="quiz-result">
        <div className={`quiz-result__header ${result.passed ? 'quiz-result__header--pass' : 'quiz-result__header--fail'}`}>
          <div className="quiz-result__icon">{result.passed ? '🏆' : '📚'}</div>
          <h2>{result.passed ? 'Excellent work!' : 'Keep studying!'}</h2>
          <div className="quiz-result__score">
            {result.score} / {result.total} correct
          </div>
          {result.passed && (
            <div className="quiz-result__xp">+{result.xpEarned} XP earned</div>
          )}
        </div>

        {/* Review answers */}
        <div className="quiz-review">
          {quiz.questions.map((q, qIdx) => {
            const userAnswer    = selected[qIdx];
            const correct       = userAnswer === q.answerIndex;
            return (
              <div key={qIdx} className={`quiz-review__question ${correct ? 'correct' : 'incorrect'}`}>
                <div className="quiz-review__q">
                  {correct ? '✅' : '❌'} Q{qIdx + 1}: {q.question}
                </div>
                <div className="quiz-review__answer">
                  {q.options[q.answerIndex]}
                </div>
                <div className="quiz-review__explanation">{q.explanation}</div>
              </div>
            );
          })}
        </div>

        <button className="quiz-retry-btn" onClick={() => { setSubmitted(false); setSelected({}); setResult(null); }}>
          Try Again
        </button>
      </div>
    );
  }

  // Quiz questions
  return (
    <div className="quiz-panel">
      <div className="quiz-panel__header">
        <span className="quiz-panel__label">🎯 Quick Quiz</span>
        <span className="quiz-panel__concept">{quiz.concept}</span>
        <span className="quiz-panel__count">{quiz.questions.length} questions</span>
      </div>

      <div className="quiz-panel__questions">
        {quiz.questions.map((q, qIdx) => (
          <div key={qIdx} className="quiz-question">
            <div className="quiz-question__text">
              <span className="quiz-question__num">Q{qIdx + 1}</span>
              {q.question}
            </div>
            <div className="quiz-question__options">
              {q.options.map((opt, oIdx) => (
                <button
                  key={oIdx}
                  className={`quiz-option ${selected[qIdx] === oIdx ? 'quiz-option--selected' : ''}`}
                  onClick={() => handleSelect(qIdx, oIdx)}>
                  <span className="quiz-option__letter">
                    {['A', 'B', 'C', 'D'][oIdx]}
                  </span>
                  <span className="quiz-option__text">{opt.replace(/^[A-D]\.\s*/, '')}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        className="quiz-submit-btn"
        onClick={handleSubmit}
        disabled={loading || Object.keys(selected).length < quiz.questions.length}>
        {loading ? 'Checking…' : 'Submit Answers →'}
      </button>
    </div>
  );
}
```

---

### Step 2.3 — Progress Panel Component
**File**: `veda-learn-web/src/components/panels/ProgressPanel.jsx`  
**Time**: 45 minutes

```jsx
// veda-learn-web/src/components/panels/ProgressPanel.jsx
import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';

const CONCEPT_LABELS = {
  'mutable-default': 'Mutable Default',
  'any-type':        'TypeScript any',
  'callback-hell':   'Callback Hell',
  'sql-injection':   'SQL Injection',
  'n-plus-one':      'N+1 Queries',
  'promise-chain':   'Promise Chains',
};

export function ProgressPanel() {
  const userId   = useStore(s => s.user?.userId);
  const progress = useStore(s => s.progress);
  const updateProgress = useStore(s => s.updateProgress);

  const [loading, setLoading] = useState(false);

  // Load progress on mount
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.get(`/progress?userId=${userId}`)
      .then(res => updateProgress(res.data))
      .catch(err => console.error('[ProgressPanel] Load error:', err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="progress-loading">
        <div className="spinner" />
        <span>Loading progress…</span>
      </div>
    );
  }

  const { xp = 0, streak = 0, concepts = {}, quizzesPassed = 0, totalLessons = 0,
          weeklyXP = [], level = 1, nextLevelXP = 100, badges = [] } = progress;

  const xpToNextLevel = nextLevelXP - xp;
  const levelPct = ((xp % 100) / 100) * 100;

  return (
    <div className="progress-panel">

      {/* ── Hero stats ── */}
      <div className="progress-panel__hero">
        <div className="progress-stat">
          <div className="progress-stat__value progress-stat__value--xp">{xp}</div>
          <div className="progress-stat__label">Total XP</div>
        </div>
        <div className="progress-stat">
          <div className="progress-stat__value progress-stat__value--streak">
            {streak > 0 ? `🔥 ${streak}` : '—'}
          </div>
          <div className="progress-stat__label">Day Streak</div>
        </div>
        <div className="progress-stat">
          <div className="progress-stat__value">{level}</div>
          <div className="progress-stat__label">Level</div>
        </div>
      </div>

      {/* ── Level progress bar ── */}
      <div className="progress-level">
        <div className="progress-level__header">
          <span>Level {level}</span>
          <span>{xpToNextLevel} XP to Level {level + 1}</span>
        </div>
        <div className="progress-level__bar">
          <div className="progress-level__fill" style={{ width: `${levelPct}%` }} />
        </div>
      </div>

      {/* ── Weekly XP chart ── */}
      {weeklyXP.length > 0 && (
        <div className="progress-chart">
          <div className="progress-chart__title">Weekly Activity</div>
          <div className="progress-chart__bars">
            {weeklyXP.map((day, i) => {
              const maxXP = Math.max(...weeklyXP.map(d => d.xp), 1);
              const pct   = (day.xp / maxXP) * 100;
              return (
                <div key={i} className="progress-chart__bar-wrap">
                  <div className="progress-chart__bar" style={{ height: `${Math.max(pct, 4)}%` }}>
                    {day.xp > 0 && <span className="progress-chart__bar-val">{day.xp}</span>}
                  </div>
                  <span className="progress-chart__bar-label">{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Concept mastery ── */}
      {Object.keys(concepts).length > 0 && (
        <div className="progress-concepts">
          <div className="progress-concepts__title">Concept Mastery</div>
          {Object.entries(concepts).map(([key, pct]) => (
            <div key={key} className="progress-concept">
              <div className="progress-concept__header">
                <span>{CONCEPT_LABELS[key] || key}</span>
                <span className="progress-concept__pct">{pct}%</span>
              </div>
              <div className="progress-concept__bar">
                <div className="progress-concept__fill"
                  style={{
                    width: `${pct}%`,
                    background: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#6366f1',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Stats strip ── */}
      <div className="progress-stats-strip">
        <div className="progress-stats-item">
          <span className="progress-stats-item__val">{totalLessons}</span>
          <span className="progress-stats-item__label">Lessons</span>
        </div>
        <div className="progress-stats-item">
          <span className="progress-stats-item__val">{quizzesPassed}</span>
          <span className="progress-stats-item__label">Quizzes Passed</span>
        </div>
        <div className="progress-stats-item">
          <span className="progress-stats-item__val">{Object.keys(concepts).length}</span>
          <span className="progress-stats-item__label">Concepts</span>
        </div>
      </div>

      {/* ── Badges ── */}
      {badges.length > 0 && (
        <div className="progress-badges">
          <div className="progress-badges__title">Badges</div>
          <div className="progress-badges__grid">
            {badges.map((b, i) => (
              <div key={i} className="progress-badge" title={b}>{b.split(' ')[0]}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Step 2.4 — Doubt / AI Chat Panel
**File**: `veda-learn-api/handlers/doubt.js` (backend)  
**Time**: 30 minutes

```javascript
// veda-learn-api/handlers/doubt.js
'use strict';

const { chatCompletion, MODELS } = require('../lib/openrouter');

module.exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
  };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { question, context, history = [] } = body;

  if (!question) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'question required' }) };
  }

  // Build message history for multi-turn conversation
  const messages = [
    {
      role: 'system',
      content: `You are Veda, an AI coding tutor.
Current editor context:
- File: ${context?.fileName || 'unknown'}
- Active concept: ${context?.concept || 'none'}
- Language: ${context?.language || 'unknown'}

Code currently open:
\`\`\`
${(context?.code || '').slice(0, 1500)}
\`\`\`

Answer questions concisely (2-4 sentences). Reference the actual code when relevant.
Never give just generic advice — be specific to what you see in the code.`,
    },
    // Inject conversation history (last 6 turns)
    ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ];

  try {
    const answer = await chatCompletion({
      model:       MODELS.HAIKU,
      messages,
      maxTokens:   400,
      temperature: 0.5,
    });

    return { statusCode: 200, headers, body: JSON.stringify({ answer }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
```

**File**: `veda-learn-web/src/components/panels/DoubtPanel.jsx` (frontend)

```jsx
// veda-learn-web/src/components/panels/DoubtPanel.jsx
import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';

export function DoubtPanel() {
  const activeFile    = useStore(s => s.activeFile);
  const currentLesson = useStore(s => s.currentLesson);
  const editors       = useStore(s => s.editors); // map of fileName → code

  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Ask me anything about your code. I can see what\'s in your editor.' }
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickQuestions = [
    'Why is this a bug?',
    'Show me a real-world example',
    'What\'s the idiomatic fix?',
    'Explain like I\'m 5',
  ];

  const send = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    const userMsg = { role: 'user', content: question };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const context = {
        fileName: activeFile,
        code:     editors?.[activeFile] || '',
        concept:  currentLesson?.concept,
        language: activeFile?.split('.').pop() || 'unknown',
      };

      const res = await api.post('/doubt', {
        question,
        context,
        history: messages.slice(-6),
      });

      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble with that. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="doubt-panel">
      {/* ── Message list ── */}
      <div className="doubt-messages">
        {messages.map((m, i) => (
          <div key={i} className={`doubt-message doubt-message--${m.role}`}>
            <div className="doubt-message__avatar">
              {m.role === 'assistant' ? '👁️' : '👤'}
            </div>
            <div className="doubt-message__body">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="doubt-message doubt-message--assistant">
            <div className="doubt-message__avatar">👁️</div>
            <div className="doubt-message__typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick questions ── */}
      <div className="doubt-quick">
        {quickQuestions.map((q, i) => (
          <button key={i} className="doubt-quick__btn" onClick={() => send(q)}>{q}</button>
        ))}
      </div>

      {/* ── Input ── */}
      <div className="doubt-input-row">
        <textarea
          className="doubt-input"
          rows={2}
          placeholder="Ask anything about your code…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
          }}
        />
        <button className="doubt-send-btn" onClick={() => send()} disabled={!input.trim() || loading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
```

---

### Step 2.5 — GitHub Panel (wire to live API)
**File**: `veda-learn-web/src/components/ide/GitHubPanel.jsx`  
**Time**: 45 minutes — replace mock data with real Octokit calls

```jsx
// veda-learn-web/src/components/ide/GitHubPanel.jsx
import { useState, useEffect, useCallback } from 'react';
import { Octokit } from '@octokit/rest';
import { useStore } from '../../store/useStore';

const LANG_COLORS = {
  JavaScript: '#f7df1e', TypeScript: '#3178c6',
  Python: '#3776ab',     Go: '#00add8',
  Rust: '#ce412b',       default: '#94a3b8',
};

export function GitHubPanel({ onFileLoad }) {
  const token = useStore(s => s.user?.githubToken);

  const [repos,      setRepos]      = useState([]);
  const [selectedRepo, setSelected] = useState(null);
  const [files,      setFiles]      = useState([]);
  const [path,       setPath]       = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  const octokit = token ? new Octokit({ auth: token }) : null;

  // Load repositories on mount
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    octokit.rest.repos.listForAuthenticatedUser({ sort: 'pushed', per_page: 20 })
      .then(res => setRepos(res.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  // Load file tree for selected repo
  const loadTree = useCallback(async (owner, repo, treePath = '') => {
    if (!octokit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await octokit.rest.repos.getContent({ owner, repo, path: treePath });
      setFiles(Array.isArray(res.data) ? res.data : [res.data]);
      setPath(treePath);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [octokit]);

  const selectRepo = (repo) => {
    setSelected(repo);
    setPath('');
    loadTree(repo.owner.login, repo.name, '');
  };

  // Load file content into editor
  const openFile = async (file) => {
    if (file.type === 'dir') {
      return loadTree(selectedRepo.owner.login, selectedRepo.name, file.path);
    }
    if (!onFileLoad) return;
    setLoading(true);
    try {
      const res = await octokit.rest.repos.getContent({
        owner: selectedRepo.owner.login,
        repo:  selectedRepo.name,
        path:  file.path,
      });
      // Content is base64 encoded
      const content = atob(res.data.content.replace(/\n/g, ''));
      onFileLoad({ name: file.name, path: file.path, content });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goUp = () => {
    const parent = path.split('/').slice(0, -1).join('/');
    loadTree(selectedRepo.owner.login, selectedRepo.name, parent);
  };

  // No GitHub token
  if (!token) {
    return (
      <div className="github-panel__no-token">
        <div className="github-panel__icon">🐙</div>
        <h3>Connect GitHub</h3>
        <p>Sign in with GitHub to browse your repositories and load files directly into the editor.</p>
      </div>
    );
  }

  // Repository list view
  if (!selectedRepo) {
    return (
      <div className="github-panel">
        <div className="github-panel__header">
          <span className="github-panel__title">Repositories</span>
          {loading && <div className="spinner spinner--sm" />}
        </div>
        {error && <div className="github-panel__error">{error}</div>}
        <div className="github-panel__list">
          {repos.map(repo => (
            <div key={repo.id} className="github-repo" onClick={() => selectRepo(repo)}>
              <div className="github-repo__top">
                <span className={`github-repo__vis ${repo.private ? 'private' : 'public'}`}>
                  {repo.private ? 'private' : 'public'}
                </span>
                <span className="github-repo__name">{repo.name}</span>
                {repo.stargazers_count > 0 && (
                  <span className="github-repo__stars">⭐ {repo.stargazers_count}</span>
                )}
              </div>
              {repo.description && (
                <div className="github-repo__desc">{repo.description}</div>
              )}
              <div className="github-repo__meta">
                {repo.language && (
                  <span className="github-repo__lang">
                    <span className="github-repo__lang-dot"
                      style={{ background: LANG_COLORS[repo.language] || LANG_COLORS.default }} />
                    {repo.language}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // File tree view
  return (
    <div className="github-panel">
      <div className="github-panel__header">
        <button className="github-back-btn" onClick={() => setSelected(null)}>← Repos</button>
        <span className="github-panel__title">{selectedRepo.name}</span>
        {loading && <div className="spinner spinner--sm" />}
      </div>
      {path && (
        <div className="github-breadcrumb">
          <button className="github-breadcrumb__up" onClick={goUp}>↑ Up</button>
          <span className="github-breadcrumb__path">{path}</span>
        </div>
      )}
      {error && <div className="github-panel__error">{error}</div>}
      <div className="github-panel__list">
        {files.map((file, i) => (
          <div key={i} className="github-file" onClick={() => openFile(file)}>
            <span className="github-file__icon">
              {file.type === 'dir' ? '📁' : '📄'}
            </span>
            <span className="github-file__name">{file.name}</span>
            {file.size && file.type === 'file' && (
              <span className="github-file__size">
                {file.size > 1024 ? `${Math.round(file.size / 1024)}kb` : `${file.size}b`}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### Step 2.6 — Wire IDEPage to All Live Data
**File**: `veda-learn-web/src/pages/IDEPage.jsx` — Key additions only  
**Time**: 60 minutes  
Add these hooks and connections to your existing IDEPage:

```jsx
// Add at the top of IDEPage component (after existing imports):

import { useWebSocket } from '../hooks/useWebSocket';
import { LessonPanel }   from '../components/panels/LessonPanel';
import { QuizPanel }     from '../components/panels/QuizPanel';
import { ProgressPanel } from '../components/panels/ProgressPanel';
import { DoubtPanel }    from '../components/panels/DoubtPanel';
import { GitHubPanel }   from '../components/ide/GitHubPanel';

// ─── Inside the IDEPage component ────────────────────────────────────────────

// 1. Connect WebSocket (replaces mock ws connection)
const { status: wsStatus, reconnect } = useWebSocket();

// 2. Get live state from store (replaces hardcoded mock data)
const currentLesson = useStore(s => s.currentLesson);
const currentQuiz   = useStore(s => s.currentQuiz);
const progress      = useStore(s => s.progress);
const notifications = useStore(s => s.notifications);

// 3. Wire analyze to trigger lesson
const runAnalysis = useCallback(async () => {
  const code = editorRef.current?.getValue?.() || '';
  if (!code.trim()) return;

  try {
    setAnalyzing(true);
    const res = await api.post('/analyze', {
      code,
      language: activeFile?.split('.').pop() || 'python',
      userId:   user?.userId,
      fileKey:  activeFile,
    });

    const { mistake } = res.data;
    if (!mistake) { addToast('Clean code!', 'No issues detected.', 'success'); return; }

    // Automatically trigger lesson generation
    await api.post('/lesson', {
      mistakeId:  mistake.mistakeId,
      userId:     user?.userId,
      concept:    mistake.concept,
      code:       mistake.codeSnippet || code,
      language:   mistake.language,
      confidence: mistake.confidence,
    });
    // Lesson will arrive via WebSocket — no need to handle response here

  } catch (err) {
    addToast('Analysis failed', err.message, 'error');
  } finally {
    setAnalyzing(false);
  }
}, [activeFile, user]);

// 4. Load file from GitHub into Monaco
const loadGitHubFile = useCallback(({ name, path, content }) => {
  openFile(name);  // your existing openFile logic
  if (editorRef.current) {
    editorRef.current.setValue(content);
  }
  addToast('File loaded', `${path} opened from GitHub`, 'info');
}, [openFile, addToast]);

// 5. In your right panel renderer — replace hardcoded components:
// RIGHT PANEL CONTENT — replaces any existing mock panel rendering
const renderRightPanel = () => {
  switch (rightPanel) {
    case 'lesson':   return <LessonPanel />;
    case 'quiz':     return <QuizPanel />;
    case 'progress': return <ProgressPanel />;
    case 'doubt':    return <DoubtPanel />;
    default:         return <LessonPanel />;
  }
};

// 6. GitHub panel in sidebar — inside your sidebar tab content:
// {sidebarTab === 'github' && <GitHubPanel onFileLoad={loadGitHubFile} />}

// 7. WS status indicator in status bar — replace existing hardcoded status:
// wsStatus === 'connected' ? '🟢 WS Connected' : wsStatus === 'connecting' ? '🟡 Connecting…' : '🔴 WS Offline'
```

---

## 🟢 Phase 3: Enhancements

> **Time**: 4–6 hours | **Outcome**: RAG-powered lessons, landing page, production polish

---

### Step 3.1 — OpenSearch RAG System
**File**: `veda-learn-api/lib/opensearch.js`  
**Time**: 45 minutes

```javascript
// veda-learn-api/lib/opensearch.js
'use strict';

const https = require('https');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { SignatureV4 } = require('@smithy/signature-v4');
const { Sha256 } = require('@aws-crypto/sha256-js');

const ENDPOINT = process.env.OPENSEARCH_ENDPOINT; // https://xxx.us-east-1.aoss.amazonaws.com
const INDEX    = 'concept-patterns';
const REGION   = process.env.AWS_REGION || 'us-east-1';

/**
 * Sign and execute an OpenSearch request using AWS Signature V4.
 */
async function opensearchRequest(method, path, body = null) {
  const url       = new URL(`${ENDPOINT}${path}`);
  const signer    = new SignatureV4({ credentials: defaultProvider(), region: REGION, service: 'aoss', sha256: Sha256 });

  const request = {
    method,
    hostname: url.hostname,
    path:     url.pathname + (url.search || ''),
    headers:  { host: url.hostname, 'content-type': 'application/json' },
    body:     body ? JSON.stringify(body) : undefined,
  };

  const signed = await signer.sign(request);

  return new Promise((resolve, reject) => {
    const req = https.request(
      { ...signed, port: 443 },
      (res) => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Search for concept context to enrich lesson generation (RAG).
 * Returns relevant examples and patterns for the detected concept.
 */
async function getConceptContext(concept, language) {
  try {
    const result = await opensearchRequest('POST', `/${INDEX}/_search`, {
      query: {
        bool: {
          must: [
            { match: { concept } },
            { match: { language } },
          ],
        },
      },
      size: 3,
      _source: ['concept', 'explanation', 'exampleCode', 'badPattern', 'goodPattern', 'tags'],
    });

    const hits = result.hits?.hits || [];
    if (hits.length === 0) return null;

    return hits.map(h => h._source);
  } catch (err) {
    console.warn('[OpenSearch] RAG query failed (non-fatal):', err.message);
    return null;  // Gracefully degrade — lessons still work without RAG
  }
}

/**
 * Index a new concept (run via seed script or when new patterns are detected).
 */
async function indexConcept(concept) {
  return opensearchRequest('POST', `/${INDEX}/_doc`, concept);
}

module.exports = { getConceptContext, indexConcept };
```

**File**: `veda-learn-api/scripts/seed_concepts.js`

```javascript
// veda-learn-api/scripts/seed_concepts.js
// Run once: node scripts/seed_concepts.js
'use strict';

require('dotenv').config({ path: '../.env' });
const { indexConcept } = require('../lib/opensearch');

const CONCEPTS = [
  {
    concept: 'mutable-default',
    language: 'python',
    explanation: "Python evaluates default arguments once at function definition time. A mutable list [] as default is shared across all calls — it accumulates state silently.",
    exampleCode: "def add_item(item, cart=[]):\n    cart.append(item)\n    return cart",
    badPattern: "def fn(x, data=[]):  # Mutable default",
    goodPattern: "def fn(x, data=None):\n    if data is None: data = []",
    tags: ['python', 'functions', 'defaults', 'gotcha'],
  },
  {
    concept: 'any-type',
    language: 'typescript',
    explanation: "The `any` type disables TypeScript's type checking entirely. It's a type escape hatch that defeats the entire purpose of TypeScript.",
    exampleCode: "async function fetchUser(id: any): Promise<any> {}",
    badPattern: "const data: any = await fetch(...)",
    goodPattern: "interface User { id: string; name: string; }\nasync function fetchUser(id: string): Promise<User> {}",
    tags: ['typescript', 'types', 'any', 'type-safety'],
  },
  {
    concept: 'callback-hell',
    language: 'javascript',
    explanation: "Deeply nested callbacks make code hard to read, debug, and maintain. Each level of nesting adds cognitive overhead and error-handling complexity.",
    exampleCode: "getUserData(id, function(err, user) {\n  getOrders(user.id, function(err, orders) {\n    getProducts(orders[0].id, function(err, product) {});\n  });\n});",
    badPattern: "fn(cb(fn2(cb2(fn3(cb3(result))))))  // Pyramid of doom",
    goodPattern: "const user = await getUserData(id);\nconst orders = await getOrders(user.id);",
    tags: ['javascript', 'async', 'callbacks', 'promises'],
  },
  {
    concept: 'sql-injection',
    language: 'python',
    explanation: "String interpolation in SQL queries allows attackers to inject malicious SQL. Always use parameterized queries or an ORM.",
    exampleCode: "query = f\"SELECT * FROM users WHERE id = {user_id}\"",
    badPattern: "cursor.execute(f'SELECT * FROM {table} WHERE id={id}')",
    goodPattern: "cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))",
    tags: ['security', 'sql', 'injection', 'databases'],
  },
  {
    concept: 'n-plus-one',
    language: 'javascript',
    explanation: "The N+1 query problem occurs when you execute one query to get a list, then N more queries for each item. This scales catastrophically.",
    exampleCode: "const users = await db.users.findAll();\nfor (const user of users) {\n  user.orders = await db.orders.findAll({ where: { userId: user.id } });\n}",
    badPattern: "for (const user of users) { await db.query('SELECT...') }",
    goodPattern: "const users = await db.users.findAll({ include: [{ model: Order }] })",
    tags: ['performance', 'database', 'queries', 'orm'],
  },
];

async function seed() {
  console.log(`Seeding ${CONCEPTS.length} concepts into OpenSearch…`);
  for (const concept of CONCEPTS) {
    try {
      await indexConcept(concept);
      console.log(`✅ Indexed: ${concept.concept}`);
    } catch (err) {
      console.error(`❌ Failed: ${concept.concept}:`, err.message);
    }
  }
  console.log('Done!');
}

seed().catch(console.error);
```

---

### Step 3.2 — Landing Page
**File**: `veda-learn-web/src/pages/Landing.jsx`  
**Time**: 45 minutes

```jsx
// veda-learn-web/src/pages/Landing.jsx
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

const FEATURES = [
  { icon: '⚡', title: 'Live Detection', desc: 'Claude Haiku scans your code every 30 seconds. < 3s latency.', color: '#6366f1' },
  { icon: '🎙️', title: 'Voice Lessons', desc: 'Amazon Polly Ruth explains every mistake out loud.', color: '#8b5cf6' },
  { icon: '🎯', title: 'Adaptive Quiz', desc: 'Three targeted questions after every lesson. XP for correct answers.', color: '#fbbf24' },
  { icon: '📁', title: 'GitHub Browser', desc: 'Load any file from any repo directly into the IDE.', color: '#10b981' },
  { icon: '📊', title: 'Skill Tracking', desc: 'Concept mastery percentages, XP, streaks — all in DynamoDB.', color: '#f472b6' },
  { icon: '💬', title: 'AI Doubt Chat', desc: 'Ask anything with full editor context. Haiku answers instantly.', color: '#06b6d4' },
];

export function Landing() {
  const navigate  = useNavigate();
  const canvasRef = useRef(null);

  // Three.js neural network particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.clientWidth, H = canvas.clientHeight;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    camera.position.z = 6;

    // Particles
    const count    = 200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x6366f1, size: 0.06, transparent: true, opacity: 0.7 });
    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      particles.rotation.y += 0.0015;
      particles.rotation.x += 0.0005;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="landing">
      {/* Background canvas */}
      <canvas ref={canvasRef} className="landing__canvas" />
      <div className="landing__overlay" />

      {/* Nav */}
      <nav className="landing__nav">
        <div className="landing__logo">
          <div className="landing__logo-icon">▽</div>
          <span>Veda</span>
          <span className="landing__logo-tag">LEARN</span>
        </div>
        <div className="landing__nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
        </div>
        <button className="landing__cta-btn" onClick={() => navigate('/login')}>
          Get Started →
        </button>
      </nav>

      {/* Hero */}
      <section className="landing__hero">
        <div className="landing__hero-badge">
          <span>v2.0 · AWS Hackathon Edition</span>
        </div>
        <h1 className="landing__h1">
          AI that teaches you,<br/>
          <span className="landing__h1-gradient">not just fixes you.</span>
        </h1>
        <p className="landing__subtitle">
          Write code in the browser. Veda detects mistakes in real time,
          explains them with voice, quizzes your understanding, and
          tracks your growth — powered by Claude and AWS.
        </p>
        <div className="landing__hero-actions">
          <button className="landing__primary-btn" onClick={() => navigate('/login')}>
            Open the IDE →
          </button>
          <button className="landing__ghost-btn" onClick={() => navigate('/login')}>
            ▶ Watch Demo
          </button>
        </div>

        {/* Stats */}
        <div className="landing__stats">
          {[['&lt;3s', 'Detection speed'], ['0.85', 'Min confidence'], ['6', 'Bug patterns'], ['$0', 'Free tier']].map(([v, l]) => (
            <div key={l} className="landing__stat">
              <div className="landing__stat-val" dangerouslySetInnerHTML={{ __html: v }} />
              <div className="landing__stat-label">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="landing__features" id="features">
        <div className="landing__section-header">
          <span className="landing__eyebrow">Everything You Need</span>
          <h2>One tool. Every lesson.</h2>
        </div>
        <div className="landing__features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="landing__feature-card" style={{ '--card-color': f.color }}>
              <div className="landing__feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="landing__how" id="how">
        <div className="landing__section-header">
          <span className="landing__eyebrow">How It Works</span>
          <h2>Three steps to mastery</h2>
        </div>
        <div className="landing__steps">
          {[
            { n: '01', icon: '✍️', title: 'Write code naturally', desc: 'Open the IDE and write code as you normally would. Veda stays silent until it has something genuinely useful to teach.' },
            { n: '02', icon: '⚡', title: 'Veda detects the mistake', desc: 'After 30 seconds, Claude Haiku scans your code. A confidence-gated classifier finds the most impactful concept to teach you right now.' },
            { n: '03', icon: '🧠', title: 'Learn, quiz, and grow', desc: 'A voice lesson explains the concept. A quiz tests your understanding. Your XP, streak, and concept mastery update live.' },
          ].map((s, i) => (
            <div key={i} className="landing__step">
              <div className="landing__step-num">{s.n}</div>
              <div className="landing__step-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing__final-cta">
        <h2>Stop letting AI make you weaker.</h2>
        <p>Every other tool is your employee. Veda is your professor.</p>
        <button className="landing__primary-btn" onClick={() => navigate('/login')}>
          Open the IDE →
        </button>
      </section>

      {/* Footer */}
      <footer className="landing__footer">
        <span>© 2026 Veda Learn · AWS Hackathon Edition</span>
        <div>
          <a href="https://github.com">GitHub</a>
          <a href="/login">Login</a>
        </div>
      </footer>
    </div>
  );
}
```

---

## 🚀 Phase 4: Deployment

> **Time**: 30 minutes | Run once after all code is written

---

### Step 4.1 — Update serverless.yml

Add missing table, GSI, and new routes:

```yaml
# Add to serverless.yml resources section:
resources:
  Resources:
    VedaQuizzesTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: veda-quizzes
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: lessonId
            AttributeType: S
          - AttributeName: userId
            AttributeType: S
        KeySchema:
          - AttributeName: lessonId
            KeyType: HASH
          - AttributeName: userId
            KeyType: RANGE

    # Add GSI to veda-ws-connections for userId lookup
    # (Done via CLI command in Step 1.1 above)

# Add to functions section:
  doubt:
    handler: handlers/doubt.handler
    events:
      - http:
          path: doubt
          method: post
          cors: true

  progressUpdate:
    handler: handlers/progressUpdate.handler
    events:
      - http:
          path: progress/update
          method: post
          cors: true
```

### Step 4.2 — Environment Variables Checklist

```bash
# veda-learn-api/.env (backend)
AWS_REGION=us-east-1
WEBSOCKET_ENDPOINT=https://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
JWT_SECRET=<your_jwt_secret>
OPENROUTER_API_KEY=<your_openrouter_key>
AUDIO_BUCKET=veda-audio-lessons
OPENSEARCH_ENDPOINT=<your_opensearch_endpoint>

# veda-learn-web/.env (frontend)
VITE_API_URL=https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
VITE_WS_URL=wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
VITE_GH_CLIENT_ID=Ov23liUfaTgayCi8bO5n
VITE_DEMO_MODE=false
```

### Step 4.3 — Deploy Commands

```bash
# ── Backend ──────────────────────────────────────────────────────────────────
cd veda-learn-api

# Install new dependencies
npm install @aws-sdk/client-apigatewaymanagementapi \
            @aws-sdk/s3-request-presigner \
            @aws-sdk/client-polly \
            @aws-sdk/credential-provider-node \
            @smithy/signature-v4 \
            @aws-crypto/sha256-js \
            uuid canvas-confetti

# Deploy all Lambda functions
npx serverless deploy --verbose

# Create DynamoDB GSI for WebSocket userId lookup
aws dynamodb update-table \
  --table-name veda-ws-connections \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{\"IndexName\":\"userId-index\",\"KeySchema\":[{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}}]" \
  --region us-east-1

# Create S3 bucket for audio
aws s3 mb s3://veda-audio-lessons --region us-east-1
aws s3api put-bucket-cors --bucket veda-audio-lessons --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'

# Seed OpenSearch (optional but recommended)
node scripts/seed_concepts.js

# ── Frontend ─────────────────────────────────────────────────────────────────
cd ../veda-learn-web

npm install canvas-confetti @octokit/rest three

# Test build
npm run build

# Deploy to Vercel
vercel --prod
```

---

## 🧪 End-to-End Testing Checklist

Run through each scenario in order. Each must work before moving to the next.

### Scenario A — WebSocket Health Check
```
1. Open IDE → DevTools Network → WS tab
2. Verify: wss://...?token=JWT shows "101 Switching Protocols"
3. Verify: Status bar shows "🟢 WS Connected"
4. Wait 25s → verify PING sent in WS frames
5. ✅ Pass: Green indicator stays on for 5+ minutes
```

### Scenario B — Python Mutable Default (Core Flow)
```python
# Paste in Monaco editor:
def add_item(item, cart=[]):
    cart.append(item)
    return cart
```
```
Expected flow:
1. Wait 30s (or press F5) → analyze fires
2. "Analysis complete" notification appears
3. 2-3s later: Lesson panel slides in with "Mutable Default Argument" title
4. Audio bar appears — click play → Polly TTS plays
5. Code tab shows before/after diff
6. 3s after lesson: Quiz panel activates with 3 questions
7. Answer all questions → Submit → Confetti if passed
8. Progress panel: XP increases, concept mastery shows "mutable-default"
9. ✅ Full pipeline works
```

### Scenario C — TypeScript any-type
```typescript
// Paste in Monaco editor (set language to TypeScript):
async function fetchUser(id: any): Promise<any> {
  const res: any = await axios.get(`/users/${id}`);
  return res.data;
}
```
```
Expected: Same flow as Scenario B but lesson is about TypeScript's any type.
✅ Pass: Lesson title includes "any" or "TypeScript"
```

### Scenario D — GitHub File Browser
```
1. Click GitHub icon in sidebar
2. Repos load from GitHub API (not mock)
3. Click a repo → file tree loads
4. Click a .py or .ts file → content loads into Monaco
5. Trigger analysis on loaded file
✅ Pass: Real repo files load and analyze correctly
```

### Scenario E — Progress Persistence
```
1. Complete a quiz in Scenario B
2. Refresh the page (or close + reopen tab)
3. Navigate to Progress panel
4. ✅ Pass: XP and concept mastery persist from DynamoDB
```

---

## 📊 Timeline Summary

| Phase | Tasks | Time | Outcome |
|-------|-------|------|---------|
| **1.1–1.4** | WebSocket system | 1.5h | Real-time connection live |
| **1.5–1.6** | AI + Polly clients | 1h | Foundation for all AI calls |
| **1.7** | Lesson handler | 1h | Core AI pipeline working |
| **1.8–1.9** | Quiz + Progress handlers | 1h | Full backend complete |
| **2.1–2.3** | Panel components | 2.5h | UI wired to live data |
| **2.4–2.5** | Doubt + GitHub panels | 1.5h | All features functional |
| **2.6** | IDEPage wiring | 1h | App is fully integrated |
| **3.1–3.2** | RAG + Landing page | 1.5h | Differentiators live |
| **4.1–4.3** | Deploy + test | 0.5h | Production ready |
| **TOTAL** | | **~12h** | **100% complete** |

---

## 🎯 Career Advisor Note

You're building something that demonstrates 8 senior-engineer competencies in one project:

1. **Serverless Architecture** — Lambda + API Gateway, event-driven design, cold-start awareness
2. **Real-Time Systems** — WebSocket connection management, keepalive, reconnect logic, stale connection cleanup
3. **AI Orchestration** — Multi-model routing (Haiku for speed, Sonnet for quality), parallel calls, graceful fallbacks
4. **Cloud-Native Services** — DynamoDB design (GSI, TTL), S3 pre-signed URLs, Polly generative TTS, OpenSearch RAG
5. **Frontend Architecture** — Zustand state machine, Monaco editor integration, React hook design
6. **Security** — JWT with GitHub OAuth, rate limiting, parameterized queries, CORS hardening
7. **Observability** — CloudWatch logs, structured error propagation, WebSocket health monitoring
8. **Product Sense** — Confidence thresholds (0.85 gate), debounced analysis (30s idle), 3s quiz delay for UX

Every one of these is a talking point in a senior eng interview.

**Ship order for maximum demo impact**: WebSocket → Lesson → Quiz → Progress → GitHub → Landing.  
If you only have 4 hours, stop after Quiz. The analyze→lesson→quiz pipeline alone makes a compelling demo.

---

> **Last updated**: March 8, 2026 · Veda Learn · AWS Hackathon Edition  
> Total files created/modified: **22** · Total estimated lines added: **~2,400**
