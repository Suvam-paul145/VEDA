# 🚀 Veda Learn — Complete Implementation Roadmap
> **Version**: 2.0 · AWS Hackathon Edition  
> **Stack**: React 18 + Vite · Monaco Editor · Zustand · AWS Lambda · API Gateway WebSocket · DynamoDB · Amazon Polly · Claude Haiku/Sonnet  
> **Backend status**: ✅ Complete and deployed  
> **Frontend status**: ~30% complete — this document covers the remaining 70%

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Setup & Environment](#project-setup--environment)
3. [Phase 1 — Core Functionality](#phase-1--core-functionality)
   - [1.1 Monaco Editor Integration](#11-monaco-editor-integration)
   - [1.2 WebSocket Connection & Lesson System](#12-websocket-connection--lesson-system)
   - [1.3 API Integration Layer](#13-api-integration-layer)
4. [Phase 2 — Interactive Features](#phase-2--interactive-features)
   - [2.1 Quiz System & Progress Tracking](#21-quiz-system--progress-tracking)
   - [2.2 GitHub File Browser](#22-github-file-browser)
   - [2.3 Doubt / Chat System](#23-doubt--chat-system)
5. [Phase 3 — Polish & Deployment](#phase-3--polish--deployment)
   - [3.1 Landing Page Integration](#31-landing-page-integration)
   - [3.2 Audio & Visual Enhancements](#32-audio--visual-enhancements)
   - [3.3 Production Deployment (Vercel)](#33-production-deployment-vercel)
6. [Phase 4 — Testing & Demo Prep](#phase-4--testing--demo-prep)
7. [Complete File Structure](#complete-file-structure)
8. [Environment Variables Reference](#environment-variables-reference)
9. [API Endpoint Reference](#api-endpoint-reference)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (React + Vite)                  │
│                                                             │
│  ┌──────────┐  ┌─────────────┐  ┌───────────────────────┐ │
│  │ Landing  │→ │  Login Page │→ │       IDE Page        │ │
│  │ Three.js │  │ GitHub OAuth│  │ Monaco + Panels       │ │
│  └──────────┘  └─────────────┘  └───────────────────────┘ │
│                                          │                  │
│                          ┌───────────────┴──────────────┐  │
│                          │       Zustand Store          │  │
│                          │ code · lesson · quiz · xp    │  │
│                          └──────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────┘
                                 │  REST + WebSocket
                    ┌────────────▼────────────────────┐
                    │        AWS API Gateway          │
                    │  REST: /analyze /lesson /quiz   │
                    │  WS:   $connect $disconnect     │
                    └────────────┬────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
    │ Lambda:analyze │  │Lambda:lesson │  │ Lambda:quiz  │
    │ Claude Haiku   │  │ Claude Sonnet│  │  + progress  │
    │ Classifier     │  │ + Polly TTS  │  │              │
    └─────────┬──────┘  └───────┬──────┘  └───────┬──────┘
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │
                    ┌────────────▼────────────────────┐
                    │            DynamoDB             │
                    │ veda-users · veda-mistakes      │
                    │ veda-lessons · veda-profiles    │
                    │ veda-ws-connections             │
                    └─────────────────────────────────┘
```

---

## Project Setup & Environment

### Prerequisites

```bash
node --version   # >= 20.x required
npm --version    # >= 10.x required
```

### Install all dependencies in one shot

```bash
npm install \
  @monaco-editor/react \
  @octokit/rest \
  axios \
  canvas-confetti \
  mermaid \
  react \
  react-dom \
  react-router-dom \
  react-syntax-highlighter \
  three \
  zustand

npm install -D \
  @vitejs/plugin-react \
  autoprefixer \
  postcss \
  tailwindcss \
  vite
```

### `.env.local` (development)

```bash
# REST API
VITE_API_URL=https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev

# WebSocket
VITE_WS_URL=wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev

# GitHub OAuth
VITE_GITHUB_CLIENT_ID=Ov23liUfaTgayCi8bO5n
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback

# Feature flags
VITE_DEMO_MODE=true         # 5s debounce instead of 30s
VITE_ENABLE_AUDIO=true      # Amazon Polly TTS
VITE_ENABLE_CONFETTI=true   # Quiz completion animation
```

### `vite.config.js`

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy avoids CORS during development
    proxy: {
      '/api': {
        target: 'https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
  optimizeDeps: {
    // Monaco Editor needs these pre-bundled
    include: ['@monaco-editor/react', 'monaco-editor'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco:  ['@monaco-editor/react', 'monaco-editor'],
          three:   ['three'],
          vendor:  ['react', 'react-dom', 'react-router-dom', 'zustand', 'axios'],
        },
      },
    },
  },
});
```

---

## Phase 1 — Core Functionality

### 1.1 Monaco Editor Integration

**Duration estimate**: ~60 minutes  
**Dependencies**: `@monaco-editor/react`, `useDebounce` hook

#### Step 1 — Create the debounce hook

```js
// src/hooks/useDebounce.js
import { useEffect, useRef } from 'react';

/**
 * Fires `callback` once `delay` ms have passed since the last call.
 * In VITE_DEMO_MODE the delay is capped at 5 000 ms for faster demos.
 */
export function useDebounce(callback, value, delay = 30_000) {
  const timerRef = useRef(null);
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const effectiveDelay = isDemoMode ? Math.min(delay, 5_000) : delay;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (value.trim().length > 0) callback(value);
    }, effectiveDelay);

    return () => clearTimeout(timerRef.current);
  }, [value, effectiveDelay]); // eslint-disable-line react-hooks/exhaustive-deps
}
```

#### Step 2 — Create `VedaEditor.jsx`

```jsx
// src/components/editor/VedaEditor.jsx
import { useRef, useState, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useVedaStore } from '../../store/vedaStore';
import { useDebounce } from '../../hooks/useDebounce';
import { api } from '../../lib/api';

// ─── Language detection by filename ──────────────────────────
const detectLanguage = (fileName) => {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  const MAP = {
    py: 'python', ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript', json: 'json',
    md: 'markdown', sh: 'shell', yaml: 'yaml', yml: 'yaml',
  };
  return MAP[ext] || 'plaintext';
};

// ─── Veda dark theme definition ──────────────────────────────
const VEDA_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment',     foreground: '4a5568', fontStyle: 'italic' },
    { token: 'keyword',     foreground: '8b5cf6', fontStyle: 'bold'   },
    { token: 'string',      foreground: '10b981'                      },
    { token: 'number',      foreground: 'fbbf24'                      },
    { token: 'type',        foreground: '06b6d4'                      },
    { token: 'function',    foreground: '6366f1'                      },
    { token: 'identifier',  foreground: 'e2e8f0'                      },
  ],
  colors: {
    'editor.background':           '#07090f',
    'editor.foreground':           '#e2e8f0',
    'editor.lineHighlightBackground': '#0d1117',
    'editorLineNumber.foreground': '#334155',
    'editorLineNumber.activeForeground': '#6366f1',
    'editor.selectionBackground':  '#6366f130',
    'editor.findMatchBackground':  '#fbbf2430',
    'editorCursor.foreground':     '#6366f1',
    'editorGutter.background':     '#07090f',
    'scrollbarSlider.background':  '#6366f120',
  },
};

// ─── Options object (extracted to avoid re-creation) ─────────
const EDITOR_OPTIONS = {
  fontFamily:          'JetBrains Mono, Fira Code, Consolas, monospace',
  fontSize:            13,
  lineHeight:          21,
  minimap:             { enabled: false },        // we render our own minimap
  scrollBeyondLastLine: false,
  wordWrap:            'off',
  renderWhitespace:    'selection',
  smoothScrolling:     true,
  cursorBlinking:      'smooth',
  cursorSmoothCaretAnimation: 'on',
  renderLineHighlight: 'gutter',
  contextmenu:         true,
  quickSuggestions:    false,                     // disable autocomplete noise
  formatOnPaste:       false,
  tabSize:             4,
  padding:             { top: 14, bottom: 14 },
};

// ─── Main component ───────────────────────────────────────────
export default function VedaEditor({ style }) {
  const editorRef  = useRef(null);
  const monacoRef  = useRef(null);
  const decorRef   = useRef([]);

  const { activeFile, openFiles, updateFileContent, setAnalyzing } = useVedaStore();
  const currentFile = openFiles[activeFile] || { content: '', language: 'python' };

  const [code, setCode] = useState(currentFile.content);

  // ── Debounced analysis trigger ────────────────────────────
  const runAnalysis = useCallback(async (content) => {
    setAnalyzing(true);
    try {
      const { data } = await api.post('/analyze', {
        fileContent: content,
        language:    currentFile.language,
        fileName:    activeFile,
        cursorLine:  editorRef.current?.getPosition()?.lineNumber ?? 1,
      });
      if (data.teach) {
        useVedaStore.getState().setAnalysisResult(data);
      }
    } catch (err) {
      console.error('[VedaEditor] Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  }, [activeFile, currentFile.language, setAnalyzing]);

  useDebounce(runAnalysis, code, 30_000);

  // ── Error marker decoration ───────────────────────────────
  const addErrorMarker = useCallback((lineNumber) => {
    if (!editorRef.current || !monacoRef.current) return;
    const monaco = monacoRef.current;

    // Remove old decorations
    decorRef.current = editorRef.current.deltaDecorations(decorRef.current, [
      {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine:         true,
          className:           'veda-error-line',
          glyphMarginClassName: 'veda-error-glyph',
          overviewRuler: {
            color:    '#ef4444',
            position: monaco.editor.OverviewRulerLane.Left,
          },
          minimap: { color: '#ef4444', position: 1 },
        },
      },
    ]);

    // Monaco model markers (shows in Problems tab)
    monaco.editor.setModelMarkers(editorRef.current.getModel(), 'veda', [
      {
        startLineNumber: lineNumber,
        startColumn:     1,
        endLineNumber:   lineNumber,
        endColumn:       999,
        message:         'Veda detected a learning opportunity here',
        severity:        monaco.MarkerSeverity.Warning,
        source:          'Veda',
      },
    ]);
  }, []);

  // ── Mount handler ─────────────────────────────────────────
  const handleMount = (editor, monaco) => {
    editorRef.current  = editor;
    monacoRef.current  = monaco;

    // Register custom theme
    monaco.editor.defineTheme('veda-dark', VEDA_THEME);
    monaco.editor.setTheme('veda-dark');

    // Subscribe to lesson events from store
    useVedaStore.subscribe(
      (state) => state.lesson,
      (lesson) => { if (lesson?.lineNumber) addErrorMarker(lesson.lineNumber); }
    );

    // Cmd/Ctrl+Enter shortcut → force immediate analysis
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => runAnalysis(editor.getValue())
    );
  };

  // ── Change handler ────────────────────────────────────────
  const handleChange = (value = '') => {
    setCode(value);
    updateFileContent(activeFile, value);
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative', ...style }}>
      <MonacoEditor
        height="100%"
        language={detectLanguage(activeFile)}
        value={code}
        theme="veda-dark"
        options={EDITOR_OPTIONS}
        onMount={handleMount}
        onChange={handleChange}
        loading={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#6366f1', fontFamily: 'JetBrains Mono', fontSize: 13 }}>
            Loading Monaco…
          </div>
        }
      />

      {/* Error line CSS injected once */}
      <style>{`
        .veda-error-line   { background: rgba(239,68,68,.06) !important; }
        .veda-error-glyph  { background: #ef4444; width: 4px !important; margin-left: 3px; border-radius: 2px; }
      `}</style>
    </div>
  );
}
```

#### Step 3 — Zustand store additions needed

```js
// src/store/vedaStore.js  — add these fields/actions to your existing store

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useVedaStore = create(subscribeWithSelector((set, get) => ({
  // ── Editor ───────────────────────────────────────────────
  activeFile:  'cart.py',
  openFiles: {
    'cart.py': { content: DEMO_CODE['cart.py'], language: 'python' },
    'api.ts':  { content: DEMO_CODE['api.ts'],  language: 'typescript' },
  },
  updateFileContent: (fileName, content) =>
    set(s => ({ openFiles: { ...s.openFiles, [fileName]: { ...s.openFiles[fileName], content } } })),
  setActiveFile: (name) => set({ activeFile: name }),

  // ── Analysis ─────────────────────────────────────────────
  analyzing:       false,
  analysisResult:  null,
  setAnalyzing:    (v) => set({ analyzing: v }),
  setAnalysisResult: (r) => set({ analysisResult: r }),

  // ── Lesson ───────────────────────────────────────────────
  lesson:          null,
  lessonVisible:   false,
  setLesson:       (l) => set({ lesson: l, lessonVisible: true }),
  clearLesson:     ()  => set({ lesson: null, lessonVisible: false }),

  // ── Quiz ─────────────────────────────────────────────────
  quiz:            null,
  quizActive:      false,
  setQuiz:         (q) => set({ quiz: q, quizActive: true }),

  // ── Progress ─────────────────────────────────────────────
  xp:              0,
  streak:          0,
  masteredConcepts: [],
  addXP:           (n) => set(s => ({ xp: s.xp + n })),
  setStreak:       (n) => set({ streak: n }),
  masterConcept:   (c) => set(s => ({ masteredConcepts: [...new Set([...s.masteredConcepts, c])] })),

  // ── WebSocket ────────────────────────────────────────────
  wsStatus:        'disconnected', // connecting | connected | disconnected | error
  setWsStatus:     (v) => set({ wsStatus: v }),

  // ── UI ───────────────────────────────────────────────────
  rightPanel:      'lesson',   // lesson | quiz | doubt | progress
  sidebarTab:      'explorer', // explorer | search | git | github | veda
  bottomVisible:   true,
  bottomTab:       'terminal',
  setRightPanel:   (v) => set({ rightPanel: v }),
  setSidebarTab:   (v) => set({ sidebarTab: v }),
  toggleBottom:    ()  => set(s => ({ bottomVisible: !s.bottomVisible })),
  setBottomTab:    (v) => set({ bottomTab: v }),
})));
```

#### Step 4 — Wire VedaEditor into IDEPage

```jsx
// In src/pages/IDEPage.jsx — replace the static SyntaxHighlighter block with:
import VedaEditor from '../components/editor/VedaEditor';

// Inside the editor region JSX:
<VedaEditor style={{ flex: 1 }} />
```

---

### 1.2 WebSocket Connection & Lesson System

**Duration estimate**: ~90 minutes  
**Dependencies**: Native browser WebSocket API (no library needed)

#### Step 1 — Create `useWebSocket.js` hook

```js
// src/hooks/useWebSocket.js
import { useEffect, useRef, useCallback } from 'react';
import { useVedaStore } from '../store/vedaStore';

const WS_URL    = import.meta.env.VITE_WS_URL;
const RECONNECT_BASE_MS = 1_500;
const RECONNECT_MAX_MS  = 30_000;
const PING_INTERVAL_MS  = 25_000; // keep API GW alive (29s timeout)

export function useWebSocket() {
  const wsRef         = useRef(null);
  const reconnectRef  = useRef(0);
  const pingRef       = useRef(null);
  const mountedRef    = useRef(true);

  const { setWsStatus, setLesson, setQuiz, addXP, setStreak } = useVedaStore.getState();

  // ── Message dispatcher ────────────────────────────────────
  const handleMessage = useCallback((raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      case 'lesson':
        setLesson(msg.lesson);
        // Auto-switch right panel to lesson
        useVedaStore.getState().setRightPanel('lesson');
        break;

      case 'quiz':
        setQuiz(msg.quiz);
        // Slight delay so user finishes reading lesson first
        setTimeout(() => {
          useVedaStore.getState().setRightPanel('quiz');
        }, 3_000);
        break;

      case 'progress':
        addXP(msg.xpEarned ?? 0);
        if (msg.streak) setStreak(msg.streak);
        break;

      case 'doubt_response':
        // Forwarded to DoubtPanel via store
        useVedaStore.getState().appendDoubtMessage({
          role: 'assistant',
          content: msg.response,
          timestamp: Date.now(),
        });
        break;

      case 'pong':
        // Keepalive acknowledged
        break;

      default:
        console.debug('[WS] Unknown message type:', msg.type);
    }
  }, [setLesson, setQuiz, addXP, setStreak]);

  // ── Connect ───────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const token = localStorage.getItem('veda_token');
    if (!token) return; // not authenticated

    setWsStatus('connecting');
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      reconnectRef.current = 0;
      setWsStatus('connected');

      // Start keepalive pings
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: 'ping' }));
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (e) => handleMessage(e.data);

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      setWsStatus('error');
    };

    ws.onclose = (e) => {
      clearInterval(pingRef.current);
      if (!mountedRef.current) return;

      setWsStatus('disconnected');
      // Exponential back-off with cap
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectRef.current, RECONNECT_MAX_MS);
      reconnectRef.current += 1;
      console.debug(`[WS] Closed (${e.code}). Reconnecting in ${delay}ms…`);
      setTimeout(connect, delay);
    };
  }, [handleMessage, setWsStatus]);

  // ── Send helper (exposed for other hooks/components) ──────
  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  // ── Lifecycle ─────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearInterval(pingRef.current);
      wsRef.current?.close(1000, 'Component unmounted');
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { send };
}
```

#### Step 2 — WebSocket status indicator in IDE status bar

```jsx
// Add to IDEPage status bar JSX:
import { useVedaStore } from '../store/vedaStore';

const WS_STATUS_CONFIG = {
  connected:    { color: '#10b981', label: 'WS Connected', glow: true  },
  connecting:   { color: '#fbbf24', label: 'Connecting…',  glow: false },
  disconnected: { color: '#ef4444', label: 'WS Offline',   glow: false },
  error:        { color: '#ef4444', label: 'WS Error',      glow: false },
};

function WsIndicator() {
  const status = useVedaStore(s => s.wsStatus);
  const cfg    = WS_STATUS_CONFIG[status];
  return (
    <span style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'JetBrains Mono', fontSize:11, color:'rgba(255,255,255,.85)' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color,
        boxShadow: cfg.glow ? `0 0 6px ${cfg.color}` : 'none' }}/>
      {cfg.label}
    </span>
  );
}
```

#### Step 3 — Mount the hook in IDEPage

```jsx
// src/pages/IDEPage.jsx  — add at top of component
import { useWebSocket } from '../hooks/useWebSocket';

export default function IDEPage() {
  const { send } = useWebSocket(); // ← this single call manages the entire WS lifecycle
  // ... rest of your IDE
}
```

---

### 1.3 API Integration Layer

**Duration estimate**: ~45 minutes

#### Create the full API client

```js
// src/lib/api.js
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;

// ── Axios instance ────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach JWT ──────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('veda_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// ── Response interceptor — handle auth errors ─────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('veda_token');
      window.location.href = '/login'; // force re-auth
    }
    if (err.response?.status === 429) {
      console.warn('[API] Rate limited — backing off');
    }
    return Promise.reject(err);
  }
);

// ── Typed endpoint wrappers ───────────────────────────────────

/**
 * Sends code to the classifier Lambda.
 * @returns {{ teach: boolean, conceptId?: string, lineNumber?: number, confidence?: number }}
 */
export const analyzeCode = (payload) =>
  api.post('/analyze', payload).then(r => r.data);

/**
 * Fetches the lesson for a given conceptId.
 * @returns {{ explanation, codeBefore, codeAfter, codeComment, audioUrl, diagramSyntax }}
 */
export const getLesson = (conceptId, language, fileContent) =>
  api.post('/lesson', { conceptId, language, fileContent }).then(r => r.data);

/**
 * Fetches quiz questions for a concept.
 * @returns {{ questions: Array<{ q, opts, ans, exp }> }}
 */
export const getQuiz = (conceptId, language) =>
  api.post('/quiz', { conceptId, language }).then(r => r.data);

/**
 * Submits a quiz attempt and gets updated progress.
 * @returns {{ xpEarned, streak, masteryPct, totalXP }}
 */
export const submitQuiz = (conceptId, score, total) =>
  api.post('/progress', { conceptId, score, total }).then(r => r.data);

/**
 * Sends a message to the doubt/chat Lambda with editor context.
 * @returns {{ response: string }}
 */
export const sendDoubt = (question, context) =>
  api.post('/doubt', { question, ...context }).then(r => r.data);

/**
 * Fetches current user's learning profile from DynamoDB.
 * @returns {{ xp, streak, masteredConcepts, weeklyActivity }}
 */
export const getProgress = () =>
  api.get('/progress').then(r => r.data);

/**
 * Exchange GitHub OAuth code for Veda JWT.
 * @returns {{ token: string, user: { login, avatar_url, name } }}
 */
export const exchangeGitHubCode = (code) =>
  api.post('/auth/github', { code }).then(r => r.data);
```

---

## Phase 2 — Interactive Features

### 2.1 Quiz System & Progress Tracking

**Duration estimate**: ~75 minutes  
**Dependencies**: `canvas-confetti`

#### Step 1 — Confetti utility

```js
// src/lib/confetti.js
import confetti from 'canvas-confetti';

export function fireConfetti() {
  const colors = ['#6366f1', '#8b5cf6', '#fbbf24', '#10b981', '#f472b6', '#06b6d4'];

  // Two-burst effect
  confetti({
    particleCount: 80,
    spread:        90,
    origin:        { y: 0.55 },
    colors,
    zIndex:        9999,
  });
  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread:        120,
      origin:        { x: 0.2, y: 0.6 },
      colors,
      zIndex:        9999,
    });
    confetti({
      particleCount: 40,
      spread:        120,
      origin:        { x: 0.8, y: 0.6 },
      colors,
      zIndex:        9999,
    });
  }, 200);
}
```

#### Step 2 — Wire quiz to real API

```jsx
// src/components/panels/QuizPanel.jsx  — key section showing API wiring

import { useState, useEffect } from 'react';
import { getQuiz, submitQuiz } from '../../lib/api';
import { useVedaStore }        from '../../store/vedaStore';
import { fireConfetti }        from '../../lib/confetti';

export default function QuizPanel() {
  const { quiz, lesson, setRightPanel, addXP, masterConcept } = useVedaStore();
  const [questions, setQuestions] = useState(quiz?.questions ?? []);
  const [loading,   setLoading]   = useState(!quiz?.questions?.length);
  const [qi,        setQi]        = useState(0);
  const [sel,       setSel]       = useState(null);
  const [answered,  setAnswered]  = useState(false);
  const [score,     setScore]     = useState(0);
  const [done,      setDone]      = useState(false);

  // ── Fetch questions if not pre-loaded ──────────────────────
  useEffect(() => {
    if (questions.length || !lesson) return;
    setLoading(true);
    getQuiz(lesson.conceptId, lesson.language ?? 'python')
      .then(data  => setQuestions(data.questions))
      .catch(()   => setQuestions(FALLBACK_QUESTIONS)) // graceful fallback
      .finally(() => setLoading(false));
  }, [lesson]); // eslint-disable-line

  // ── Answer handler ─────────────────────────────────────────
  const answer = async (i) => {
    if (answered) return;
    setSel(i);
    setAnswered(true);
    const correct  = i === questions[qi].ans;
    const newScore = score + (correct ? 1 : 0);
    if (correct) setScore(newScore);

    const isLast = qi + 1 >= questions.length;
    if (isLast) {
      setTimeout(async () => {
        setDone(true);
        if (newScore >= Math.ceil(questions.length * 0.6)) {
          fireConfetti();
          masterConcept(lesson?.conceptId);
          try {
            const result = await submitQuiz(lesson?.conceptId, newScore, questions.length);
            addXP(result.xpEarned ?? 15);
          } catch { addXP(15); }
        } else {
          addXP(5);
        }
      }, 1_200);
    } else {
      setTimeout(() => { setQi(q => q + 1); setSel(null); setAnswered(false); }, 1_300);
    }
  };

  // (render logic — same UI as existing component)
}

// Fallback questions used when API is unreachable
const FALLBACK_QUESTIONS = [
  {
    q:    'What is the risk with mutable default arguments in Python?',
    opts: ['Slower execution','Shared state across calls','Memory leak','Syntax error'],
    ans:  1,
    exp:  'Python evaluates defaults once. A mutable list persists between calls.',
  },
];
```

#### Step 3 — Progress panel real data wiring

```jsx
// src/components/panels/ProgressPanel.jsx  — real API wiring

import { useEffect, useState } from 'react';
import { useVedaStore }        from '../../store/vedaStore';
import { getProgress }         from '../../lib/api';

export default function ProgressPanel() {
  const { xp, streak, masteredConcepts, addXP, setStreak } = useVedaStore();
  const [remoteData, setRemoteData] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    getProgress()
      .then(data => {
        setRemoteData(data);
        // Sync remote values into local store
        if (data.xp)     addXP(data.xp - xp);   // delta only
        if (data.streak) setStreak(data.streak);
      })
      .catch(() => {}) // silently fail — show local state
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const displayXP     = remoteData?.xp     ?? xp;
  const displayStreak = remoteData?.streak ?? streak;
  const displayConcepts = remoteData?.masteredConcepts ?? masteredConcepts;

  // (render with displayXP, displayStreak, displayConcepts)
}
```

---

### 2.2 GitHub File Browser

**Duration estimate**: ~90 minutes  
**Dependencies**: `@octokit/rest`

#### Step 1 — GitHub API client

```js
// src/lib/github.js
import { Octokit } from '@octokit/rest';

let _octokit = null;

/** Call once after login to initialise the Octokit client. */
export function initGitHub(token) {
  _octokit = new Octokit({ auth: token });
}

/** Returns the authenticated Octokit instance. */
export function getOctokit() {
  if (!_octokit) throw new Error('GitHub not initialised — call initGitHub(token) first');
  return _octokit;
}

// ── High-level helpers ────────────────────────────────────────

/** Fetch all repos for the authenticated user (max 100). */
export async function listRepos() {
  const { data } = await getOctokit().rest.repos.listForAuthenticatedUser({
    sort:      'updated',
    per_page:  100,
    type:      'all',
  });
  return data;
}

/**
 * List the contents of a directory inside a repo.
 * Returns an array of { name, path, type ('file'|'dir'), size }.
 */
export async function listRepoContents(owner, repo, path = '') {
  const { data } = await getOctokit().rest.repos.getContent({
    owner,
    repo,
    path,
  });
  return Array.isArray(data) ? data : [data];
}

/**
 * Fetch a single file's content from GitHub.
 * Returns the decoded UTF-8 string.
 */
export async function fetchFileContent(owner, repo, path) {
  const { data } = await getOctokit().rest.repos.getContent({ owner, repo, path });
  if (data.type !== 'file') throw new Error(`${path} is not a file`);
  // GitHub returns base64-encoded content
  return atob(data.content.replace(/\n/g, ''));
}
```

#### Step 2 — `useGitHubFiles` hook

```js
// src/hooks/useGitHubFiles.js
import { useState, useCallback } from 'react';
import { listRepos, listRepoContents, fetchFileContent } from '../lib/github';

export function useGitHubFiles() {
  const [repos,    setRepos]    = useState([]);
  const [tree,     setTree]     = useState({});   // { 'owner/repo/path': [items] }
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const loadRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listRepos();
      setRepos(data.map(r => ({
        id:       r.id,
        name:     r.name,
        full:     r.full_name,               // 'owner/repo'
        desc:     r.description ?? '',
        lang:     r.language    ?? 'Unknown',
        stars:    r.stargazers_count,
        updated:  r.updated_at,
        private:  r.private,
        owner:    r.owner.login,
      })));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDirectory = useCallback(async (owner, repo, path = '') => {
    const key = `${owner}/${repo}/${path}`;
    if (tree[key]) return; // already cached
    setLoading(true);
    try {
      const items = await listRepoContents(owner, repo, path);
      // Sort: folders first, then files, alphabetically within each group
      const sorted = items.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setTree(t => ({ ...t, [key]: sorted }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tree]);

  const loadFile = useCallback(async (owner, repo, path) => {
    setLoading(true);
    try {
      return await fetchFileContent(owner, repo, path);
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { repos, tree, loading, error, loadRepos, loadDirectory, loadFile };
}
```

#### Step 3 — `GitHubPanel.jsx` with real Octokit

```jsx
// src/components/sidebar/GitHubPanel.jsx  — key sections

import { useEffect, useState } from 'react';
import { useGitHubFiles }      from '../../hooks/useGitHubFiles';
import { initGitHub }          from '../../lib/github';
import { useVedaStore }        from '../../store/vedaStore';

export default function GitHubPanel({ addToast }) {
  const { setActiveFile, openFiles, updateFileContent } = useVedaStore();
  const { repos, tree, loading, error, loadRepos, loadDirectory, loadFile } = useGitHubFiles();

  const [token,    setToken]    = useState('');
  const [connected,setConnected]= useState(false);
  const [openRepo, setOpenRepo] = useState(null);
  const [openPath, setOpenPath] = useState({});

  const connect = () => {
    initGitHub(token);
    setConnected(true);
    loadRepos().then(() => addToast('GitHub connected', `${repos.length} repos loaded`, 'success'));
  };

  const handleFileClick = async (owner, repo, path, name) => {
    addToast('Loading…', `${name}`, 'info');
    const content = await loadFile(owner, repo, path);
    if (content !== null) {
      // Push file into Zustand store → VedaEditor picks it up
      updateFileContent(name, content);
      setActiveFile(name);
      addToast('File opened', `${name} loaded into editor`, 'success');
    }
  };

  // (render JSX — reuse existing panel UI, wire loadDirectory on folder click,
  //  handleFileClick on file click)
}
```

---

### 2.3 Doubt / Chat System

**Duration estimate**: ~60 minutes

#### `DoubtPanel.jsx` with streaming API

```jsx
// src/components/panels/DoubtPanel.jsx
import { useState, useRef, useEffect } from 'react';
import { sendDoubt } from '../../lib/api';
import { useVedaStore } from '../../store/vedaStore';

export default function DoubtPanel() {
  const { activeFile, openFiles, lesson } = useVedaStore();
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Build rich context for the API ────────────────────────
  const buildContext = () => ({
    fileName:    activeFile,
    fileContent: openFiles[activeFile]?.content?.slice(0, 1_200) ?? '', // first 1.2K chars
    conceptId:   lesson?.conceptId ?? null,
    language:    openFiles[activeFile]?.language ?? 'python',
    lineNumber:  lesson?.lineNumber ?? null,
  });

  const send = async (text) => {
    const t = text ?? input.trim();
    if (!t || loading) return;

    setInput('');
    setMessages(m => [...m, { role: 'user', content: t, id: Date.now() }]);
    setLoading(true);

    try {
      const { response } = await sendDoubt(t, buildContext());
      setMessages(m => [...m, { role: 'assistant', content: response, id: Date.now() }]);
    } catch {
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'Sorry, I couldn\'t reach the server. Please try again.',
        id: Date.now(),
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  // (render chat bubbles, loading dots, starter prompts — reuse existing UI)
}
```

---

## Phase 3 — Polish & Deployment

### 3.1 Landing Page Integration

**Duration estimate**: ~45 minutes

#### Step 1 — Route setup in `main.jsx`

```jsx
// src/main.jsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Landing    from './pages/Landing';
import Login      from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import IDEPage    from './pages/IDEPage';
import ProtectedRoute from './components/ProtectedRoute';

const router = createBrowserRouter([
  { path: '/',              element: <Landing/> },
  { path: '/login',         element: <Login/> },
  { path: '/auth/callback', element: <AuthCallback/> },
  {
    path: '/ide',
    element: (
      <ProtectedRoute>
        <IDEPage/>
      </ProtectedRoute>
    ),
  },
]);

export default function App() {
  return <RouterProvider router={router}/>;
}
```

#### Step 2 — Protected route guard

```jsx
// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('veda_token');
  if (!token) return <Navigate to="/login" replace/>;
  return children;
}
```

#### Step 3 — GitHub OAuth callback page

```jsx
// src/pages/AuthCallback.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeGitHubCode } from '../lib/api';
import { initGitHub } from '../lib/github';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) { navigate('/login'); return; }

    exchangeGitHubCode(code)
      .then(({ token, ghToken, user }) => {
        localStorage.setItem('veda_token',    token);
        localStorage.setItem('veda_gh_token', ghToken);
        localStorage.setItem('veda_user',     JSON.stringify(user));
        initGitHub(ghToken);
        navigate('/ide');
      })
      .catch(() => navigate('/login'));
  }, []); // eslint-disable-line

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', background:'#07090f', color:'#6366f1',
      fontFamily:'JetBrains Mono', fontSize:14 }}>
      Authenticating with GitHub…
    </div>
  );
}
```

---

### 3.2 Audio & Visual Enhancements

**Duration estimate**: ~60 minutes

#### Amazon Polly audio player

```jsx
// src/components/AudioPlayer.jsx
import { useState, useRef } from 'react';

/**
 * Plays a pre-signed S3 URL returned by the lesson Lambda.
 * Falls back gracefully if the URL is missing.
 */
export default function AudioPlayer({ audioUrl, autoPlay = false }) {
  const audioRef   = useRef(null);
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);

  if (!audioUrl) return null;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else         { el.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const handleTimeUpdate = () => {
    const el = audioRef.current;
    if (el) setProgress((el.currentTime / el.duration) * 100 || 0);
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10,
      padding:'8px 12px', borderRadius:10,
      background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.2)' }}>
      <button onClick={toggle}
        style={{ width:32, height:32, borderRadius:9,
          background:playing?'rgba(99,102,241,.2)':'rgba(99,102,241,.15)',
          border:'1px solid rgba(99,102,241,.3)',
          color:'#6366f1', fontSize:14, cursor:'pointer', display:'flex',
          alignItems:'center', justifyContent:'center' }}>
        {playing ? '⏸' : '▶'}
      </button>
      {/* Progress bar */}
      <div style={{ flex:1, height:3, background:'rgba(99,102,241,.15)',
        borderRadius:2, overflow:'hidden', cursor:'pointer' }}>
        <div style={{ height:'100%', width:`${progress}%`,
          background:'linear-gradient(90deg,#6366f1,#8b5cf6)',
          borderRadius:2, transition:'width .1s linear' }}/>
      </div>
      <span style={{ fontSize:10, color:'#64748b', fontFamily:'JetBrains Mono' }}>
        Polly
      </span>
      <audio
        ref={audioRef}
        src={audioUrl}
        autoPlay={autoPlay}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={handleTimeUpdate}
        style={{ display:'none' }}
      />
    </div>
  );
}
```

#### Mermaid diagram renderer

```jsx
// src/components/MermaidDiagram.jsx
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme:       'dark',
  themeVariables: {
    background:     '#07090f',
    primaryColor:   '#6366f1',
    primaryTextColor: '#e2e8f0',
    lineColor:      '#334155',
    edgeLabelBackground: '#0d1117',
  },
});

let _id = 0;

export default function MermaidDiagram({ syntax }) {
  const ref = useRef(null);
  const id  = useRef(`veda-mermaid-${_id++}`);

  useEffect(() => {
    if (!syntax || !ref.current) return;
    ref.current.innerHTML = '';
    mermaid.render(id.current, syntax)
      .then(({ svg }) => { if (ref.current) ref.current.innerHTML = svg; })
      .catch(e => console.warn('[Mermaid] Render failed:', e));
  }, [syntax]);

  return (
    <div ref={ref}
      style={{ padding:'12px', borderRadius:10, background:'rgba(13,17,23,.7)',
        border:'1px solid rgba(99,102,241,.15)', overflow:'auto', maxHeight:240 }}/>
  );
}
```

#### Wire audio and diagram into LessonPanel

```jsx
// In LessonPanel.jsx — add below the explanation card:
import AudioPlayer    from '../AudioPlayer';
import MermaidDiagram from '../MermaidDiagram';

// Inside the render:
{lesson.audioUrl      && <AudioPlayer audioUrl={lesson.audioUrl} autoPlay />}
{lesson.diagramSyntax && <MermaidDiagram syntax={lesson.diagramSyntax}/>}
```

---

### 3.3 Production Deployment (Vercel)

**Duration estimate**: ~90 minutes

#### Step 1 — `vercel.json`

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options",        "value": "DENY"    },
        { "key": "Referrer-Policy",        "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

#### Step 2 — Vercel environment variables

Set these in **Vercel Dashboard → Project → Settings → Environment Variables**:

| Variable | Value | Environment |
|---|---|---|
| `VITE_API_URL` | `https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev` | Production, Preview |
| `VITE_WS_URL` | `wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev` | Production, Preview |
| `VITE_GITHUB_CLIENT_ID` | `Ov23liUfaTgayCi8bO5n` | Production, Preview |
| `VITE_GITHUB_REDIRECT_URI` | `https://your-app.vercel.app/auth/callback` | Production only |
| `VITE_DEMO_MODE` | `false` | Production only |
| `VITE_ENABLE_AUDIO` | `true` | Production, Preview |

#### Step 3 — GitHub OAuth app configuration

In your GitHub OAuth App settings (`github.com → Settings → Developer settings → OAuth Apps → Veda Learn`):

```
Homepage URL:        https://your-app.vercel.app
Callback URL:        https://your-app.vercel.app/auth/callback
```

> ⚠️  **Add the Vercel URL to your Lambda's CORS allowed origins.** Open `serverless.yml` and update:
> ```yaml
> cors:
>   origins:
>     - http://localhost:5173
>     - https://your-app.vercel.app
> ```
> Then redeploy: `npx serverless deploy`

#### Step 4 — Deploy commands

```bash
# Install Vercel CLI
npm install -g vercel

# First deploy (follow interactive prompts)
vercel

# Production deploy
vercel --prod

# Inspect logs if something breaks
vercel logs your-app.vercel.app
```

---

## Phase 4 — Testing & Demo Prep

### Test Scenario Matrix

| Scenario | File | Expected behaviour | Pass criteria |
|---|---|---|---|
| Mutable default detection | `cart.py` | Analysis fires after debounce → lesson for `mutable-default` arrives via WS | Lesson panel shows with `lineNumber: 3` marker |
| TypeScript `any` detection | `api.ts` | Lesson for `any-type` fires | Lesson panel shows with code fix |
| Callback hell detection | `fetch.js` | Lesson for `callback-hell` fires | Lesson panel shows async/await fix |
| Quiz completion — pass | Any | Score ≥ 60% | Confetti fires, +15 XP, concept mastered |
| Quiz completion — fail | Any | Score < 60% | +5 XP, retry prompt shown |
| WebSocket reconnect | Any | Kill devtools → re-enable network | WS reconnects within ~3s |
| JWT expiry | Any | 401 from API | User redirected to `/login` |
| GitHub file load | Any repo | Click file in GitHub panel | File appears in editor with syntax highlighting |
| Rate limit (30s debounce) | `cart.py` | Type code → wait < 30s → type again | Only ONE analysis fires per 30s idle window |

### Demo flow script (5-minute demo)

```
0:00  Open https://your-app.vercel.app
      → Landing page with Three.js neural network

0:30  Click "Get Started" → Login page
      → Click "Continue with GitHub" (or Guest for demo)

0:45  IDE loads with cart.py pre-opened
      → Point out: Monaco editor, file tree, 5 activity bar icons

1:00  Press F5 to force immediate analysis
      → Watch status bar: "Analyzing…" spinner
      → Bottom panel Output tab shows: "1 issue found"
      → Lesson panel animates in (right side)

1:30  Read the lesson: explain mutable default
      → Click 🔊 to play Polly audio
      → Point out before/after code fix

2:00  Click "Got it ✓"
      → Quiz panel activates with 3 questions
      → Answer all correctly → confetti fires → +15 XP

2:30  Click "Progress →"
      → Progress panel shows XP, streak, concept mastery bars

3:00  Click GitHub icon in activity bar (🐙)
      → Click "Skip → use demo repos"
      → Expand cart-service → click models.py
      → File loads into editor

3:30  Switch to api.ts tab
      → Press F5 again
      → any-type lesson fires

4:00  Open Doubt chat → ask "Why is TypeScript any dangerous?"
      → AI response arrives

4:30  Point out: status bar WS Connected indicator
      → Open terminal at bottom → type "npx veda analyze"
```

### `src/pages/IDEPage.jsx` — keyboard shortcut reference

```js
// Add this useEffect to IDEPage for demo-ready shortcuts:
useEffect(() => {
  const handler = (e) => {
    // F5 — force analysis
    if (e.key === 'F5') { e.preventDefault(); triggerAnalyze(); }
    // Ctrl+P — command palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); openCommandPalette(); }
    // Ctrl+` — toggle terminal
    if ((e.ctrlKey || e.metaKey) && e.key === '`') { e.preventDefault(); toggleBottom(); }
    // Ctrl+, — settings
    if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); openSettings(); }
    // Escape — close overlays
    if (e.key === 'Escape') { closeAllOverlays(); }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [triggerAnalyze, toggleBottom]);
```

---

## Complete File Structure

```
veda-learn/
├── public/
│   └── favicon.ico
│
├── src/
│   ├── components/
│   │   ├── editor/
│   │   │   └── VedaEditor.jsx          ✅ Phase 1.1
│   │   ├── panels/
│   │   │   ├── LessonPanel.jsx         ✅ Phase 1.2 + 3.2
│   │   │   ├── QuizPanel.jsx           ✅ Phase 2.1
│   │   │   ├── ProgressPanel.jsx       ✅ Phase 2.1
│   │   │   └── DoubtPanel.jsx          ✅ Phase 2.3
│   │   ├── sidebar/
│   │   │   ├── FileTree.jsx            ✅ existing
│   │   │   ├── GitHubPanel.jsx         ✅ Phase 2.2
│   │   │   ├── SearchPanel.jsx         ✅ existing
│   │   │   └── VedaInsightsPanel.jsx   ✅ existing
│   │   ├── AudioPlayer.jsx             ✅ Phase 3.2
│   │   ├── MermaidDiagram.jsx          ✅ Phase 3.2
│   │   ├── CommandPalette.jsx          ✅ existing
│   │   ├── ConfettiCanvas.jsx          ✅ existing
│   │   ├── ToastStack.jsx              ✅ existing
│   │   ├── SettingsPanel.jsx           ✅ existing
│   │   └── ProtectedRoute.jsx          ✅ Phase 3.1
│   │
│   ├── hooks/
│   │   ├── useWebSocket.js             ✅ Phase 1.2
│   │   ├── useDebounce.js              ✅ Phase 1.1
│   │   └── useGitHubFiles.js           ✅ Phase 2.2
│   │
│   ├── lib/
│   │   ├── api.js                      ✅ Phase 1.3
│   │   ├── github.js                   ✅ Phase 2.2
│   │   └── confetti.js                 ✅ Phase 2.1
│   │
│   ├── pages/
│   │   ├── Landing.jsx                 ✅ Phase 3.1 (use veda-complete.jsx)
│   │   ├── Login.jsx                   ✅ Phase 3.1
│   │   ├── AuthCallback.jsx            ✅ Phase 3.1
│   │   └── IDEPage.jsx                 ✅ Phase 1.1 + all
│   │
│   ├── store/
│   │   └── vedaStore.js                ✅ Phase 1.1
│   │
│   ├── main.jsx                        ✅ Phase 3.1
│   └── index.css
│
├── .env.local                          ✅ Environment
├── .env.production                     ✅ Phase 3.3
├── vercel.json                         ✅ Phase 3.3
├── vite.config.js                      ✅ Environment
└── package.json
```

---

## Environment Variables Reference

| Variable | Dev value | Prod value | Required |
|---|---|---|---|
| `VITE_API_URL` | `https://afwwdtnwob…/dev` | same | ✅ |
| `VITE_WS_URL` | `wss://imhoyvukwe…/dev` | same | ✅ |
| `VITE_GITHUB_CLIENT_ID` | `Ov23liUfaTgayCi8bO5n` | same | ✅ |
| `VITE_GITHUB_REDIRECT_URI` | `http://localhost:5173/auth/callback` | `https://app.vercel.app/auth/callback` | ✅ |
| `VITE_DEMO_MODE` | `true` | `false` | optional |
| `VITE_ENABLE_AUDIO` | `true` | `true` | optional |
| `VITE_ENABLE_CONFETTI` | `true` | `true` | optional |

---

## API Endpoint Reference

All endpoints are at: `https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev`

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/analyze` | `{ fileContent, language, fileName, cursorLine }` | `{ teach, conceptId, lineNumber, confidence }` |
| `POST` | `/lesson` | `{ conceptId, language, fileContent }` | `{ explanation, codeBefore, codeAfter, audioUrl, diagramSyntax }` |
| `POST` | `/quiz` | `{ conceptId, language }` | `{ questions: [{ q, opts, ans, exp }] }` |
| `POST` | `/progress` | `{ conceptId, score, total }` | `{ xpEarned, streak, masteryPct, totalXP }` |
| `GET`  | `/progress` | — | `{ xp, streak, masteredConcepts, weeklyActivity }` |
| `POST` | `/doubt` | `{ question, fileName, fileContent, conceptId, language }` | `{ response }` |
| `POST` | `/auth/github` | `{ code }` | `{ token, ghToken, user }` |

**WebSocket**: `wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev`

| Direction | Action / Type | Payload |
|---|---|---|
| Client → Server | `ping` | `{}` |
| Server → Client | `lesson` | `{ lesson: { explanation, codeBefore, codeAfter, audioUrl, … } }` |
| Server → Client | `quiz` | `{ quiz: { questions: […] } }` |
| Server → Client | `progress` | `{ xpEarned, streak }` |
| Server → Client | `pong` | `{}` |

---

## Troubleshooting Guide

### Monaco editor blank / not loading

```bash
# Pre-bundle Monaco (Vite's optimizeDeps doesn't always catch it)
# Add to vite.config.js:
optimizeDeps: {
  include: ['@monaco-editor/react', 'monaco-editor/esm/vs/editor/editor.api'],
}
```

### WebSocket connects then immediately closes (code 1006)

The JWT in `localStorage` may be expired. Clear it and re-authenticate:
```js
localStorage.removeItem('veda_token');
// Then navigate to /login
```

### Analysis never fires in dev

Check `VITE_DEMO_MODE=true` is set — this drops the debounce from 30s to 5s. Confirm with:
```js
console.log(import.meta.env.VITE_DEMO_MODE); // should print "true"
```

### GitHub OAuth redirect loop

Ensure the callback URL in your GitHub OAuth App **exactly** matches `VITE_GITHUB_REDIRECT_URI` — trailing slashes matter.

### `401 Unauthorized` on all API calls

The Lambda's JWT_SECRET must match what was used to sign the token. Check your Lambda environment variables in AWS console:
```
AWS Console → Lambda → veda-analyze-dev → Configuration → Environment variables → JWT_SECRET
```

### Vercel build fails with Monaco worker errors

```js
// Add to vite.config.js:
worker: { format: 'es' },
```

### CORS errors in production

Update your Lambda's `serverless.yml` CORS origins list to include the Vercel URL, then:
```bash
npx serverless deploy --stage dev
```

---

## ⏱️ Time Estimate Summary

| Phase | Tasks | Estimate |
|---|---|---|
| **Phase 1** | Monaco · WebSocket · API client | 3–4 hours |
| **Phase 2** | Quiz · GitHub browser · Doubt chat | 3–4 hours |
| **Phase 3** | Landing integration · Audio · Deploy | 3–4 hours |
| **Phase 4** | Testing · Demo prep | 2–3 hours |
| **Total** | | **11–15 hours** |

## ✅ MVP Checklist

- [ ] Monaco editor loads with `veda-dark` theme
- [ ] Debounced analysis fires after 5s (demo) / 30s (prod)
- [ ] WebSocket connects on IDE load — WS indicator in status bar is green
- [ ] Lesson arrives after analysis — right panel animates in
- [ ] `Got it ✓` → quiz activates with real API questions
- [ ] Quiz completion → confetti fires → XP updates
- [ ] Progress panel reflects live XP and streak
- [ ] GitHub panel connects and loads repo file into editor
- [ ] Doubt chat sends question with editor context
- [ ] App deploys to Vercel with zero build errors
- [ ] All keyboard shortcuts work (F5, Ctrl+P, Ctrl+\`)
- [ ] Auth flow: GitHub OAuth → callback → IDE (no white screen)

---

*Veda Learn · AWS Hackathon Edition · Last updated: March 2026*
