# 🧠 Veda Learn — Final 2-Day Web App Roadmap
### System Architect Edition · React + Vite + AWS Lambda + WebSocket + Vercel
> **Written by:** Senior AWS & Google Cloud System Architect  
> **Target:** Fully working, deployed, demo-ready web IDE in 48 hours  
> **Your advantage:** All 9 Lambda functions are already live. All 6 DynamoDB tables exist. WebSocket API is connected. Your job is purely frontend integration + wiring + deploy.

---

## 🗺️ Bird's-Eye Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VEDA LEARN — COMPLETE SYSTEM                        │
│                                                                             │
│  ┌─────────────┐     ┌────────────────────────────────────────────────┐    │
│  │  LANDING    │────▶│              VEDA WEB IDE                      │    │
│  │  (Three.js) │     │                                                │    │
│  │  veda-      │     │  ┌──────────┐ ┌──────────────┐ ┌───────────┐  │    │
│  │  landing.jsx│     │  │ SIDEBAR  │ │ MONACO EDITOR│ │  PANELS   │  │    │
│  └─────────────┘     │  │ GitHub   │ │ (VS Code     │ │ Lesson    │  │    │
│                       │  │ Explorer │ │  engine)     │ │ Quiz      │  │    │
│  ┌─────────────┐     │  │ Progress │ │              │ │ Doubt     │  │    │
│  │  LOGIN PAGE │     │  │ Activity │ │ Syntax HL    │ │ Progress  │  │    │
│  │  GitHub     │     │  │ Bar      │ │ Error marks  │ │           │  │    │
│  │  OAuth      │     │  └──────────┘ └──────────────┘ └───────────┘  │    │
│  └─────────────┘     │                                                │    │
│                       │     Status Bar: 👁 watching · Python · ⚡ 847  │    │
│                       └────────────────────────────────────────────────┘    │
│                                      │                                      │
│            ┌─────────────────────────┼──────────────────────────┐          │
│            ▼                         ▼                          ▼           │
│    ┌──────────────┐      ┌──────────────────┐      ┌──────────────────┐    │
│    │ GitHub API   │      │  AWS REST API    │      │  AWS WebSocket   │    │
│    │ (Octokit)    │      │  9 Lambdas · dev │      │  Lesson Push     │    │
│    │ File Browser │      │  DynamoDB × 6    │      │  Real-time       │    │
│    └──────────────┘      │  OpenSearch      │      └──────────────────┘    │
│                           │  S3 + Polly      │                              │
│                           └──────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ What Is Already DONE (Do NOT rebuild)

| Asset | Status | Location |
|-------|--------|----------|
| `POST /api/analyze` Haiku classifier | ✅ Live | `afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev` |
| `POST /api/lesson` 3× OpenRouter + Polly | ✅ Live | Same REST base URL |
| `POST /api/lesson/deep` Deep Dive | ✅ Live | Same REST base URL |
| `POST /api/quiz` MCQ generator | ✅ Live | Same REST base URL |
| `GET /api/progress/{userId}` | ✅ Live | Same REST base URL |
| `POST /api/progress/update` | ✅ Live | Same REST base URL |
| `GET /auth/github/callback` → JWT | ✅ Live | Same REST base URL |
| WebSocket `wss://imhoyvukwe...` | ✅ Live | Real-time lesson push |
| 6 DynamoDB tables | ✅ Live | `us-east-1` |
| OpenSearch `concept-embeddings` index | ✅ Live | `veda-concepts` collection |
| S3 audio bucket | ✅ Live | Polly MP3 storage |
| veda-landing.jsx | ✅ Built | Three.js neural landing |
| veda-complete.jsx | ✅ Built | Full IDE interface (2,271 lines) |

> **Your 2-day job:** Wire everything. Build the project scaffold. Connect APIs. Test every flow. Deploy.

---

## 🔑 Live Credentials Reference

```bash
REST_BASE     = https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
WS_URL        = wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
GITHUB_CID    = Ov23liUfaTgayCi8bO5n
JWT_SECRET    = 07f1eb1b643aca5269ef9a5217823cb84ad5a9d7d2acd3448a76d4335a44df8f
AWS_ACCOUNT   = 034476915822
REGION        = us-east-1
```

---

---

# 📅 DAY 1 — Build Core & Wire APIs
## Goal by EOD: Login → Monaco editor loads → Type bad code → Lesson arrives via WebSocket → Quiz fires

---

## ⏰ Hour 1 — Project Scaffold + Environment Setup
**Duration:** 60 min | **Output:** Running Vite dev server with routing and env configured

### 1.1 — Create the React Project

```bash
npm create vite@latest veda-learn-web -- --template react
cd veda-learn-web
npm install

# All core dependencies — paste as one block
npm install \
  @monaco-editor/react \
  zustand \
  axios \
  react-router-dom \
  @octokit/rest \
  @octokit/auth-token \
  canvas-confetti \
  mermaid \
  react-syntax-highlighter \
  three

# Dev dependencies
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

> **Why these packages?**
> - `@monaco-editor/react` — Identical engine to VS Code (you literally get VS Code's editor in a div)
> - `zustand` — Minimal global state. No Redux boilerplate. Perfect for this scale
> - `three` — Already used in veda-landing.jsx for the neural particle background
> - `canvas-confetti` — Quiz completion celebration (already wired in veda-complete.jsx)
> - `mermaid` — Architecture diagram rendering inside lesson panels

### 1.2 — Create Project File Structure

```bash
mkdir -p src/{store,hooks,components/{layout,editor,panels,auth},lib,pages}
touch src/store/useVedaStore.js
touch src/hooks/{useWebSocket.js,useDebounce.js,useGitHubFiles.js}
touch src/lib/{api.js,github.js}
touch src/components/auth/{LoginPage.jsx,AuthCallback.jsx}
touch src/App.jsx src/main.jsx
```

### 1.3 — Configure Tailwind

```javascript
// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        veda: {
          bg:      '#07090f',
          surface: '#0d1117',
          panel:   '#161b27',
          border:  'rgba(255,255,255,0.07)',
          indigo:  '#6366f1',
          violet:  '#8b5cf6',
          amber:   '#fbbf24',
          green:   '#10b981',
          red:     '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    }
  }
}
```

### 1.4 — Create `.env` File

```bash
# .env (project root — never commit this)
VITE_REST_URL=https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
VITE_WS_URL=wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
VITE_GITHUB_CLIENT_ID=Ov23liUfaTgayCi8bO5n
VITE_APP_URL=http://localhost:5173
VITE_DEMO_MODE=true
```

Add to `.gitignore`:
```
.env
.env.local
node_modules/
dist/
```

### 1.5 — Set Up React Router

```jsx
// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
```

```jsx
// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import LoginPage from './components/auth/LoginPage.jsx'
import AuthCallback from './components/auth/AuthCallback.jsx'
import IDEPage from './pages/IDEPage.jsx'
import useVedaStore from './store/useVedaStore.js'

export default function App() {
  const jwt = useVedaStore(s => s.jwt)

  return (
    <Routes>
      <Route path="/"               element={<Landing />} />
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/auth/callback"  element={<AuthCallback />} />
      <Route path="/ide"            element={jwt ? <IDEPage /> : <Navigate to="/login" />} />
    </Routes>
  )
}
```

### 1.6 — Update GitHub OAuth App

```
GitHub → Settings → Developer Settings → OAuth Apps → Veda Learn → Edit

Homepage URL:    http://localhost:5173
Callback URLs:   http://localhost:5173/auth/callback
                 https://veda-learn.vercel.app/auth/callback
```

> ⚠️ GitHub allows multiple callback URLs. Do NOT delete the VS Code URI — add the web URL alongside it.

### ✅ Hour 1 Checkpoint
- [ ] `npm run dev` starts without errors
- [ ] `http://localhost:5173` loads (even just the Vite default screen)
- [ ] `.env` has all 4 variables set
- [ ] GitHub OAuth app updated with both callback URLs

---

## ⏰ Hour 2 — Zustand Store + API Layer + Auth Flow
**Duration:** 60 min | **Output:** GitHub OAuth login → JWT stored → IDE route protected

### 2.1 — Zustand Global Store

This is the single source of truth for your entire app. Every component reads from and writes to this store.

```javascript
// src/store/useVedaStore.js
import { create } from 'zustand'

const useVedaStore = create((set, get) => ({
  // ─── AUTH ──────────────────────────────────────────────────────
  jwt:     localStorage.getItem('veda_jwt') || null,
  user:    JSON.parse(localStorage.getItem('veda_user') || 'null'),
  setAuth: (jwt, user) => {
    localStorage.setItem('veda_jwt', jwt)
    localStorage.setItem('veda_user', JSON.stringify(user))
    set({ jwt, user })
  },
  logout: () => {
    localStorage.removeItem('veda_jwt')
    localStorage.removeItem('veda_user')
    set({ jwt: null, user: null })
  },

  // ─── EDITOR ────────────────────────────────────────────────────
  code:        '# Write or paste your code here\n',
  language:    'python',
  fileName:    'untitled.py',
  cursorLine:  1,
  setCode:     (code)     => set({ code }),
  setLanguage: (language) => set({ language }),
  setFileName: (fileName) => set({ fileName }),
  setCursorLine:(line)    => set({ cursorLine: line }),

  // ─── ANALYSIS ──────────────────────────────────────────────────
  analyzing:    false,
  errorMarkers: [],
  lastAnalysis: null,
  setAnalyzing:    (v)       => set({ analyzing: v }),
  setErrorMarkers: (markers) => set({ errorMarkers: markers }),
  setLastAnalysis: (data)    => set({ lastAnalysis: data }),

  // ─── PANELS ────────────────────────────────────────────────────
  activePanel:    'lesson',
  panelDot:       {},                // { quiz: true } → amber dot on quiz tab
  setActivePanel: (p) => set({ activePanel: p }),
  setPanelDot:    (panel, val) => set(s => ({
    panelDot: { ...s.panelDot, [panel]: val }
  })),

  // ─── LESSON ────────────────────────────────────────────────────
  currentLesson: null,
  setLesson: (lesson) => set({
    currentLesson: lesson,
    activePanel: 'lesson',
    panelDot: {}
  }),

  // ─── QUIZ ──────────────────────────────────────────────────────
  currentQuiz:  null,
  quizScore:    0,
  setQuiz:  (quiz) => set({ currentQuiz: quiz, activePanel: 'quiz' }),
  setQuizScore: (score) => set({ quizScore: score }),

  // ─── PROGRESS ──────────────────────────────────────────────────
  skillScore:    0,
  streak:        0,
  weeklyXP:      [0,0,0,0,0,0,0],
  conceptMastery: {},
  setProgress:   (data) => set({
    skillScore:    data.totalXP || 0,
    streak:        data.streak  || 0,
    weeklyXP:      data.weeklyXP || [0,0,0,0,0,0,0],
    conceptMastery: data.conceptMastery || {}
  }),

  // ─── WEBSOCKET ─────────────────────────────────────────────────
  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),

  // ─── NOTIFICATIONS ─────────────────────────────────────────────
  notifications: [],
  addNotification: (n) => set(s => ({
    notifications: [{ id: Date.now(), ...n }, ...s.notifications].slice(0, 20)
  })),
  clearNotifications: () => set({ notifications: [] }),
}))

export default useVedaStore
```

### 2.2 — Axios API Layer

```javascript
// src/lib/api.js
import axios from 'axios'
import useVedaStore from '../store/useVedaStore.js'

const BASE = import.meta.env.VITE_REST_URL

// Create axios instance with auth interceptor
const client = axios.create({ baseURL: BASE })

client.interceptors.request.use(config => {
  const jwt = useVedaStore.getState().jwt
  if (jwt) config.headers.Authorization = `Bearer ${jwt}`
  return config
})

client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      useVedaStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── API METHODS ──────────────────────────────────────────────────────
export const api = {
  // Auth
  async exchangeCode(code) {
    const res = await axios.get(`${BASE}/auth/github/callback?code=${code}&source=web`)
    return res.data
  },

  // Core analyze — sends code, gets back mistake detection
  async analyze({ fileContent, language, fileName, cursorLine, diagnostics = [] }) {
    const res = await client.post('/api/analyze', {
      fileContent, language, fileName, cursorLine, diagnostics
    })
    // If mistake detected, set error markers on monaco
    if (res.data.teach && res.data.lineNumber) {
      useVedaStore.getState().setErrorMarkers([{
        lineNumber:  res.data.lineNumber,
        conceptId:   res.data.conceptId,
        confidence:  res.data.confidence || 0.9,
      }])
      useVedaStore.getState().setLastAnalysis(res.data)
    }
    return res.data
  },

  // Lesson generation (also triggered by WebSocket push from analyze Lambda)
  async getLesson({ mistakeType, language, codeSnippet, conceptId }) {
    const res = await client.post('/api/lesson', {
      mistakeType, language, codeSnippet, conceptId
    })
    return res.data
  },

  // Deep dive lesson
  async getDeepLesson(payload) {
    const res = await client.post('/api/lesson/deep', payload)
    return res.data
  },

  // Quiz generation for a concept
  async getQuiz({ conceptId, language }) {
    const res = await client.post('/api/quiz', { conceptId, language })
    return res.data
  },

  // Progress read
  async getProgress(userId) {
    const res = await client.get(`/api/progress/${userId}`)
    return res.data
  },

  // Progress write (after quiz completion)
  async updateProgress({ userId, conceptId, score, xpEarned }) {
    const res = await client.post('/api/progress/update', {
      userId, conceptId, score, xpEarned
    })
    return res.data
  },

  // Doubt/chat (new Lambda — see Hour 5)
  async askDoubt({ question, codeContext, language }) {
    const res = await client.post('/api/doubt', {
      question, codeContext, language
    })
    return res.data
  },
}

export default api
```

### 2.3 — Login Page + Auth Callback

```jsx
// src/components/auth/LoginPage.jsx
import useVedaStore from '../../store/useVedaStore.js'

export default function LoginPage() {
  const CLIENT_ID  = import.meta.env.VITE_GITHUB_CLIENT_ID
  const APP_URL    = import.meta.env.VITE_APP_URL
  const CALLBACK   = `${APP_URL}/auth/callback`
  const OAUTH_URL  = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${CALLBACK}&scope=user:email,repo`

  return (
    // NOTE: Use your existing LoginPage from veda-complete.jsx
    // Just update the handleGitHubLogin to redirect to OAUTH_URL
    <div onClick={() => window.location.href = OAUTH_URL}>
      Sign in with GitHub
    </div>
  )
}
```

```jsx
// src/components/auth/AuthCallback.jsx
// This page handles /auth/callback?token=JWT after GitHub OAuth
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useVedaStore from '../../store/useVedaStore.js'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate  = useNavigate()
  const setAuth   = useVedaStore(s => s.setAuth)

  useEffect(() => {
    const token = params.get('token')
    if (!token) { navigate('/login'); return }

    // Decode user from JWT payload (it's just base64)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      setAuth(token, {
        id:     payload.sub,
        login:  payload.login,
        name:   payload.name,
        avatar: payload.avatar,
      })
      navigate('/ide')
    } catch {
      navigate('/login')
    }
  }, [])

  return <div style={{ color: '#6366f1', textAlign: 'center', paddingTop: 80 }}>
    Signing you in…
  </div>
}
```

### 2.4 — Update auth.js Lambda for Web Redirect

Run this one-time update to your deployed Lambda so it redirects to your web app:

```javascript
// In veda-learn-api/handlers/auth.js
// Find the final return block and replace with:

const webAppUrl  = process.env.WEB_APP_URL || 'https://veda-learn.vercel.app'
const isWebFlow  = (event.headers?.Accept || '').includes('text/html') ||
                   (event.queryStringParameters?.source === 'web')

const redirectUrl = isWebFlow
  ? `${webAppUrl}/auth/callback?token=${token}`
  : `vscode://veda-learn.veda-learn/auth?token=${token}`

return {
  statusCode: 302,
  headers: {
    Location: redirectUrl,
    'Access-Control-Allow-Origin': '*',
  }
}
```

```bash
# Add env var to serverless.yml environment section:
#   WEB_APP_URL: https://veda-learn.vercel.app

cd veda-learn-api
npx serverless deploy --function authCallback
```

### ✅ Hour 2 Checkpoint
- [ ] `useVedaStore` exported with no TypeScript errors
- [ ] `api.js` imports without errors
- [ ] Navigate to `http://localhost:5173/login` → GitHub button visible
- [ ] Click GitHub → redirects to `github.com/login/oauth/authorize`
- [ ] After GitHub approval → lands on `/auth/callback?token=...`
- [ ] JWT stored in localStorage → redirects to `/ide`

---

## ⏰ Hour 3 — Monaco Editor + Debounce Hook + Analyze Pipeline
**Duration:** 60 min | **Output:** Monaco editor running, typing bad code triggers analyze Lambda

### 3.1 — useDebounce Hook

```javascript
// src/hooks/useDebounce.js
import { useRef, useCallback } from 'react'

export function useDebounce(fn, delay) {
  const timer = useRef(null)
  return useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}
```

### 3.2 — Monaco Editor Component

```jsx
// src/components/editor/VedaEditor.jsx
import { useRef, useEffect, useCallback } from 'react'
import MonacoEditor from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import useVedaStore from '../../store/useVedaStore.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import api from '../../lib/api.js'

// Demo mode drops debounce to 5s so the demo is fast
const DEBOUNCE_MS = import.meta.env.VITE_DEMO_MODE === 'true' ? 5_000 : 30_000

export default function VedaEditor() {
  const editorRef   = useRef(null)
  const { code, language, fileName, cursorLine,
          setCode, setCursorLine,
          errorMarkers, analyzing, setAnalyzing,
          user } = useVedaStore()

  // ── Trigger analysis after debounce ────────────────────────────
  const runAnalysis = useCallback(async (content) => {
    if (!user || analyzing) return
    setAnalyzing(true)
    try {
      await api.analyze({
        fileContent: content,
        language,
        fileName,
        cursorLine,
        diagnostics: [],
      })
      // Note: lesson arrives via WebSocket push, NOT from this response
      // analyze Lambda asyncInvokes lesson Lambda → WebSocket pushes to browser
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setAnalyzing(false)
    }
  }, [user, analyzing, language, fileName, cursorLine])

  const debouncedAnalysis = useDebounce(runAnalysis, DEBOUNCE_MS)

  // ── Apply error markers to Monaco ──────────────────────────────
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !errorMarkers.length) return
    const model = editor.getModel()
    if (!model) return

    monaco.editor.setModelMarkers(model, 'veda', errorMarkers.map(m => ({
      startLineNumber: m.lineNumber || 1,
      endLineNumber:   m.lineNumber || 1,
      startColumn:     1,
      endColumn:       200,
      message:         `Veda: ${(m.conceptId || '').replace(/-/g, ' ')} detected (confidence ${Math.round((m.confidence || 0.9) * 100)}%)`,
      severity:        monaco.MarkerSeverity.Warning,
    })))
  }, [errorMarkers])

  return (
    <MonacoEditor
      height="100%"
      language={language}
      value={code}
      theme="vs-dark"
      onMount={(editor) => { editorRef.current = editor }}
      onChange={(val) => {
        setCode(val || '')
        debouncedAnalysis(val || '')
      }}
      onValidate={() => {}}
      options={{
        fontSize:            14,
        fontFamily:          'JetBrains Mono, monospace',
        fontLigatures:       true,
        minimap:             { enabled: true },
        scrollBeyondLastLine: false,
        lineNumbers:         'on',
        renderLineHighlight: 'all',
        smoothScrolling:     true,
        cursorBlinking:      'smooth',
        cursorSmoothCaretAnimation: 'on',
        padding:             { top: 16, bottom: 16 },
      }}
    />
  )
}
```

### 3.3 — Wire the IDE Page

```jsx
// src/pages/IDEPage.jsx
// Import your existing veda-complete.jsx — it already has all the UI.
// Just replace the static demo sections with live data from the store.

// The critical wiring points in veda-complete.jsx:
// 1. Replace the static DEMO_CODE editor with VedaEditor component
// 2. The "Analyze" button should call api.analyze() manually
// 3. The lesson/quiz/progress panels should read from useVedaStore

// Since veda-complete.jsx is 2,271 lines with full UI,
// the cleanest approach is to use it as-is and add live data hooks:

import VedaComplete from '../components/VedaComplete.jsx'
// (Copy veda-complete.jsx to src/components/VedaComplete.jsx)

export default function IDEPage() {
  return <VedaComplete />
}
```

> **Architecture note:** veda-complete.jsx has all the visual components. In this hour, focus on making the Monaco editor actually trigger your Lambda. The panels (lesson/quiz/progress) will be wired in Hours 4 and 5.

### 3.4 — Test the Analyze Pipeline

After getting the IDE to load, test the critical path:

```bash
# Paste this into the Monaco editor and wait 5 seconds (demo mode):
def add_item(item, cart=[]):
    cart.append(item)
    return cart

# Expected flow:
# 1. Monaco detects change → useDebounce starts 5s timer
# 2. After 5s → api.analyze() POST to Lambda
# 3. Haiku classifier returns { teach: true, conceptId: "mutable-default" }
# 4. analyze Lambda asyncInvokes lesson Lambda
# 5. lesson Lambda generates 3-part lesson → pushes via WebSocket
# 6. useWebSocket hook receives message → setLesson() in Zustand
# 7. Lesson panel slides in with explanation + code fix + Mermaid
```

### ✅ Hour 3 Checkpoint
- [ ] Monaco editor renders in IDE route
- [ ] Typing code and waiting 5s → POST to `/api/analyze` visible in Network tab
- [ ] Chrome DevTools → Network → WS → see WebSocket frame arrive after analyze
- [ ] `useVedaStore.getState().lastAnalysis` has data in browser console

---

## ⏰ Hour 4 — WebSocket Hook + Lesson + Quiz Panels
**Duration:** 60 min | **Output:** Lesson slides in via WebSocket → quiz fires → confetti

### 4.1 — WebSocket Hook

This is the most critical hook. It keeps a persistent WebSocket connection to your API Gateway and processes every incoming message.

```javascript
// src/hooks/useWebSocket.js
import { useEffect, useRef, useCallback } from 'react'
import useVedaStore from '../store/useVedaStore.js'
import api from '../lib/api.js'

const WS_URL = import.meta.env.VITE_WS_URL

export function useWebSocket() {
  const wsRef        = useRef(null)
  const reconnectRef = useRef(null)
  const {
    jwt, setWsConnected,
    setLesson, setQuiz,
    addNotification, setPanelDot,
  } = useVedaStore()

  const connect = useCallback(() => {
    if (!jwt) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_URL}?token=${jwt}`)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      clearInterval(reconnectRef.current)
      addNotification({ type: 'ws', text: 'Veda connected — watching your code' })
      console.log('✅ WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)

        switch (msg.type) {
          case 'lesson':
            // Full lesson payload: explanation + codeAfter + mermaid + audioUrl
            setLesson(msg.lesson)
            addNotification({ type: 'lesson', text: `Lesson ready: ${msg.lesson?.conceptId}` })

            // Auto-trigger quiz 3 seconds after lesson arrives
            if (msg.lesson?.conceptId) {
              setTimeout(async () => {
                try {
                  const quiz = await api.getQuiz({
                    conceptId: msg.lesson.conceptId,
                    language:  useVedaStore.getState().language,
                  })
                  useVedaStore.getState().setQuiz(quiz)
                  useVedaStore.getState().setPanelDot('quiz', true)
                } catch (e) { console.error('Quiz fetch failed:', e) }
              }, 3000)
            }
            break

          case 'error':
            console.error('Lambda error via WS:', msg.message)
            break

          default:
            console.log('WS message:', msg)
        }
      } catch (e) {
        console.error('WS parse error:', e)
      }
    }

    ws.onclose = () => {
      setWsConnected(false)
      // Auto-reconnect every 5 seconds
      reconnectRef.current = setInterval(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) connect()
      }, 5000)
    }

    ws.onerror = (err) => {
      console.error('WS error:', err)
    }
  }, [jwt])

  useEffect(() => {
    connect()
    return () => {
      clearInterval(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])
}
```

### 4.2 — Mount WebSocket in IDE

```jsx
// Add to your IDEPage.jsx or VedaComplete.jsx top-level:
import { useWebSocket } from '../hooks/useWebSocket.js'

function IDEShell() {
  useWebSocket()   // ← This one line connects WebSocket on mount
  // ...rest of IDE
}
```

### 4.3 — Wire Lesson Panel Data

In `veda-complete.jsx`, the Lesson panel already has the UI. You just need to feed it live data from the store instead of the static DEMO_LESSON constant:

```javascript
// Find in veda-complete.jsx: const [lesson, setLesson] = useState(DEMO_LESSON)
// Replace with:
const currentLesson = useVedaStore(s => s.currentLesson)
// Then replace all `lesson.` references with `currentLesson?.`
// Add a null check: if (!currentLesson) show "Waiting for code analysis..."
```

### 4.4 — Wire Quiz Panel + Confetti

```javascript
// Find in veda-complete.jsx: the quiz panel section
// Replace static DEMO_QUIZ with:
const currentQuiz = useVedaStore(s => s.currentQuiz)

// The confetti already fires in veda-complete.jsx on quiz completion.
// Wire the progress update when quiz completes:
const handleQuizComplete = async (score) => {
  const { user, currentLesson } = useVedaStore.getState()
  try {
    await api.updateProgress({
      userId:    user.id,
      conceptId: currentLesson?.conceptId,
      score,
      xpEarned:  score >= 2 ? 50 : 20,
    })
    // Refresh progress panel
    const progress = await api.getProgress(user.id)
    useVedaStore.getState().setProgress(progress)
  } catch (e) { console.error('Progress update failed:', e) }
}
```

### 4.5 — Wire Progress Panel

```javascript
// In veda-complete.jsx Progress panel:
// Add this useEffect to load progress on mount:
useEffect(() => {
  const { user } = useVedaStore.getState()
  if (!user?.id) return
  api.getProgress(user.id).then(data => {
    useVedaStore.getState().setProgress(data)
  }).catch(console.error)
}, [])

// Then replace static score/streak displays with:
const { skillScore, streak, weeklyXP, conceptMastery } = useVedaStore()
```

### ✅ Hour 4 Checkpoint
- [ ] Chrome DevTools → Network → WS → connection shown as "101 Switching Protocols"
- [ ] Type mutable default bug → wait 5s → see WebSocket frame arrive
- [ ] Lesson panel auto-activates with real lesson data (not DEMO_LESSON)
- [ ] 3 seconds after lesson → quiz panel shows with real questions
- [ ] Answering quiz correctly → confetti fires
- [ ] Progress panel shows real XP from DynamoDB

---

## ⏰ Hour 5 — GitHub File Browser + Doubt Chat Panel
**Duration:** 60 min | **Output:** Browse GitHub repos, click a file → loads into Monaco

### 5.1 — GitHub API Wrapper

```javascript
// src/lib/github.js
import { Octokit } from '@octokit/rest'

let octokit = null

export function initGitHub(token) {
  octokit = new Octokit({ auth: token })
}

export const github = {
  // List user's repos
  async getRepos() {
    if (!octokit) throw new Error('GitHub not initialized')
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated', per_page: 20
    })
    return data
  },

  // List files in a repo at a path
  async getContents(owner, repo, path = '') {
    const { data } = await octokit.repos.getContent({ owner, repo, path })
    return Array.isArray(data) ? data : [data]
  },

  // Get file content (decoded from base64)
  async getFileContent(owner, repo, path) {
    const { data } = await octokit.repos.getContent({ owner, repo, path })
    if (data.encoding === 'base64') {
      return atob(data.content.replace(/\n/g, ''))
    }
    return data.content
  },
}
```

### 5.2 — useGitHubFiles Hook

```javascript
// src/hooks/useGitHubFiles.js
import { useState, useCallback } from 'react'
import { github, initGitHub } from '../lib/github.js'
import useVedaStore from '../store/useVedaStore.js'

export function useGitHubFiles() {
  const [repos,    setRepos]    = useState([])
  const [contents, setContents] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const { user, jwt }           = useVedaStore()

  const connect = useCallback(async () => {
    setLoading(true)
    try {
      // The JWT contains the GitHub token in its payload
      const payload = JSON.parse(atob(jwt.split('.')[1]))
      initGitHub(payload.githubToken)   // ← Make sure auth.js includes githubToken in JWT
      const data = await github.getRepos()
      setRepos(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [jwt])

  const openFile = useCallback(async (owner, repo, path, language) => {
    setLoading(true)
    try {
      const content = await github.getFileContent(owner, repo, path)
      useVedaStore.getState().setCode(content)
      useVedaStore.getState().setFileName(path.split('/').pop())
      useVedaStore.getState().setLanguage(language || detectLanguage(path))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { repos, contents, loading, error, connect, openFile }
}

function detectLanguage(path) {
  const ext = path.split('.').pop()
  const map = { py: 'python', js: 'javascript', ts: 'typescript',
                jsx: 'javascript', tsx: 'typescript', java: 'java',
                go: 'go', rs: 'rust', cpp: 'cpp', c: 'c' }
  return map[ext] || 'plaintext'
}
```

### 5.3 — Deploy the Doubt Lambda

This is the only new Lambda you need to write:

```javascript
// In veda-learn-api/handlers/doubt.js
const { verifyJwt } = require('../lib/auth')
const OpenAI = require('openai')

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

module.exports.handler = async (event) => {
  const user = verifyJwt(event)
  if (!user) return { statusCode: 401, body: 'Unauthorized' }

  const { question, codeContext, language } = JSON.parse(event.body || '{}')

  const messages = [
    { role: 'system', content: `You are Veda, an expert ${language} teacher. Answer concisely with code examples. Max 150 words.` },
    { role: 'user', content: `Code context:\n\`\`\`${language}\n${codeContext?.slice(0, 500)}\n\`\`\`\n\nQuestion: ${question}` }
  ]

  const res = await openrouter.chat.completions.create({
    model:       'anthropic/claude-haiku-4',
    messages,
    max_tokens:  300,
  })

  return {
    statusCode: 200,
    body: JSON.stringify({ answer: res.choices[0].message.content }),
    headers: { 'Access-Control-Allow-Origin': '*' }
  }
}
```

Add to `serverless.yml`:
```yaml
doubt:
  handler: handlers/doubt.handler
  events:
    - http: { path: /api/doubt, method: post, cors: true }
```

Deploy:
```bash
cd veda-learn-api && npx serverless deploy --function doubt
```

### ✅ Hour 5 Checkpoint
- [ ] GitHub panel shows your real repos from GitHub API
- [ ] Click a `.py` file → loads content into Monaco editor instantly
- [ ] Doubt panel: type a question → Claude Haiku responds in < 3s
- [ ] File detection: `.ts` file → Monaco switches to TypeScript syntax highlighting
- [ ] `POST /api/doubt` returns 200 with answer in Chrome DevTools

---

# 📅 DAY 2 — Polish, Test, Deploy
## Goal by EOD: Production Vercel URL, all 5 test scenarios pass, demo-ready

---

## ⏰ Hour 6 — Landing Page Integration + Navigation Flow
**Duration:** 60 min | **Output:** Seamless Landing → Login → IDE flow with Three.js

### 6.1 — Wire veda-landing.jsx as Landing Page

```bash
# Copy your existing landing file into the project
cp path/to/veda-landing.jsx src/pages/Landing.jsx
```

```jsx
// src/pages/Landing.jsx — update the CTA button
// Find: onClick={() => setScreen('login')}
// Replace with:
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()
// onClick={() => navigate('/login')}
```

### 6.2 — Wire veda-complete.jsx as the IDE

```bash
cp path/to/veda-complete.jsx src/components/VedaComplete.jsx
```

The wiring points in veda-complete.jsx (all minimal changes):

```javascript
// 1. Top of file — add store import
import useVedaStore from '../store/useVedaStore.js'
import { useWebSocket } from '../hooks/useWebSocket.js'
import api from '../lib/api.js'

// 2. Inside VedaComplete component, mount WebSocket
useWebSocket()

// 3. Replace setScreen('login') with navigate('/login')
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()

// 4. Replace static code state with Zustand
const { code, setCode, language, setLanguage } = useVedaStore()

// 5. Replace DEMO_LESSON with store value
const currentLesson = useVedaStore(s => s.currentLesson)

// 6. Replace DEMO_QUIZ with store value
const currentQuiz = useVedaStore(s => s.currentQuiz)

// 7. Progress panel — read from store
const { skillScore, streak, weeklyXP } = useVedaStore()
```

### 6.3 — Screen Transition Polish

The existing veda-complete.jsx uses internal `screen` state (`landing → login → ide`). Since you're now using React Router, remove the internal screen state and let routing handle navigation:

```javascript
// Remove from veda-complete.jsx:
const [screen, setScreen] = useState('landing')  // DELETE

// Replace all: if (screen === 'landing') return <Landing />
// With direct component return:
// Landing.jsx returns Landing
// LoginPage.jsx returns Login
// IDEPage.jsx returns IDE — as separate route pages
```

### ✅ Hour 6 Checkpoint
- [ ] `http://localhost:5173` → Landing with Three.js neural web renders
- [ ] "Get Started" → navigates to `/login`
- [ ] GitHub OAuth → `/auth/callback` → stores JWT → `/ide`
- [ ] Browser back button works correctly between all 3 pages
- [ ] F5 / page refresh on `/ide` → JWT from localStorage → stays logged in

---

## ⏰ Hour 7 — Polly Audio Playback + Mermaid Diagrams
**Duration:** 60 min | **Output:** Voice lesson plays automatically, Mermaid diagram renders

### 7.1 — Polly Audio Playback

The lesson Lambda generates audio and stores it in S3 with a presigned URL. The WebSocket message includes `audioUrl`. Wire it to auto-play in the Lesson panel:

```jsx
// In the Lesson panel section of VedaComplete.jsx:
const audioRef = useRef(null)
const currentLesson = useVedaStore(s => s.currentLesson)

// Auto-play when lesson arrives
useEffect(() => {
  if (currentLesson?.audioUrl && audioRef.current) {
    audioRef.current.src = currentLesson.audioUrl
    audioRef.current.play().catch(err => {
      // Browser may block autoplay — show play button in that case
      console.log('Autoplay blocked, user must click play:', err)
    })
  }
}, [currentLesson?.audioUrl])

// Render:
<audio ref={audioRef} controls style={{ display: 'none' }} />

// The existing veda-complete.jsx has an audio toggle button — wire it:
<button onClick={() => audioRef.current?.play()}>▶ Play Lesson</button>
```

> **Fallback:** If Polly audio URL is missing (S3 error), the existing Web Speech API fallback in veda-complete.jsx kicks in automatically. No extra code needed.

### 7.2 — Mermaid Diagram Rendering

```jsx
// In the Lesson panel, Mermaid diagram section:
import mermaid from 'mermaid'
import { useEffect, useRef } from 'react'

function MermaidDiagram({ definition }) {
  const divRef = useRef(null)

  useEffect(() => {
    if (!definition || !divRef.current) return
    mermaid.initialize({ theme: 'dark', startOnLoad: false })
    try {
      mermaid.render('veda-diagram', definition).then(({ svg }) => {
        if (divRef.current) divRef.current.innerHTML = svg
      })
    } catch (e) {
      divRef.current.innerHTML = '<p style="color:#ef4444">Diagram unavailable</p>'
    }
  }, [definition])

  return <div ref={divRef} style={{ width: '100%', overflow: 'auto' }} />
}

// Usage in lesson panel:
<MermaidDiagram definition={currentLesson?.mermaidDiagram} />
```

### 7.3 — Syntax-Highlighted Code Diff

The lesson payload includes `codeBefore` and `codeAfter`. Display them side by side:

```jsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

// In lesson panel:
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
  <div>
    <div style={{ color: '#ef4444', fontSize: 11, marginBottom: 4 }}>❌ BEFORE (Bug)</div>
    <SyntaxHighlighter language={language} style={vscDarkPlus}>
      {currentLesson?.codeBefore || ''}
    </SyntaxHighlighter>
  </div>
  <div>
    <div style={{ color: '#10b981', fontSize: 11, marginBottom: 4 }}>✅ AFTER (Fixed)</div>
    <SyntaxHighlighter language={language} style={vscDarkPlus}>
      {currentLesson?.codeAfter || ''}
    </SyntaxHighlighter>
  </div>
</div>
```

### ✅ Hour 7 Checkpoint
- [ ] Lesson arrives → Polly audio starts automatically (or play button appears)
- [ ] Mermaid diagram renders (flowchart or sequence) below the explanation
- [ ] Before/after code diff shows red/green side-by-side
- [ ] No console errors from mermaid.render()
- [ ] Audio toggle button in status bar works

---

## ⏰ Hour 8 — Comprehensive Testing Suite
**Duration:** 60 min | **Output:** All 5 test scenarios pass, CloudWatch confirms no errors

### 8.1 — Test Scenario 1: Python Mutable Default

```python
# Paste in Monaco, select Python, wait 5s
def add_item(item, cart=[]):
    cart.append(item)
    return cart

class Cart:
    def __init__(self, items=[]):
        self.items = items
```

**Expected:** Haiku classifies as `mutable-default` → WebSocket pushes lesson → quiz fires → confetti on correct answer

### 8.2 — Test Scenario 2: JavaScript Callback Hell

```javascript
// Paste in Monaco, select JavaScript, wait 5s
fetchUser(id, function(user) {
  fetchOrders(user.id, function(orders) {
    fetchItems(orders[0].id, function(items) {
      processItems(items, function(result) {
        console.log(result)
      })
    })
  })
})
```

**Expected:** Haiku classifies as `callback-hell` → lesson shows Promise/async alternative

### 8.3 — Test Scenario 3: SQL Injection

```python
# Paste in Monaco, select Python, wait 5s
def get_user(username):
    query = f"SELECT * FROM users WHERE name = '{username}'"
    return db.execute(query)
```

**Expected:** Classifies as `sql-injection` → lesson shows parameterized queries

### 8.4 — Test Scenario 4: TypeScript `any` Abuse

```typescript
// Paste in Monaco, select TypeScript, wait 5s
function processData(data: any): any {
    return data.items.map((x: any) => x.value)
}
```

**Expected:** Classifies as `any-abuse` → lesson shows proper typing

### 8.5 — Test Scenario 5: GitHub File Load

```
1. Open GitHub panel → connect with your token
2. Browse to veda-learn-api repo
3. Click handlers/analyze.js
4. Verify it loads in Monaco with JavaScript highlighting
5. Wait 5s → analyze fires → lesson about the code's patterns
```

### 8.6 — CloudWatch Verification

```bash
# After each test scenario, verify Lambda logs are clean:
aws logs tail /aws/lambda/veda-learn-api-dev-analyze   --follow --region us-east-1
aws logs tail /aws/lambda/veda-learn-api-dev-lesson    --follow --region us-east-1
aws logs tail /aws/lambda/veda-learn-api-dev-wsConnect --follow --region us-east-1
aws logs tail /aws/lambda/veda-learn-api-dev-doubt     --follow --region us-east-1

# Verify DynamoDB writes after quiz completion:
aws dynamodb scan --table-name veda-mistakes  --region us-east-1
aws dynamodb scan --table-name veda-lessons   --region us-east-1
```

### 8.7 — WebSocket Stability Test

```bash
# Install wscat if not already done
npm install -g wscat

# Test WebSocket holds connection for 5+ minutes
wscat -c "wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev?token=YOUR_JWT"
# Expected: Connected and stays connected; no disconnect within 5 minutes
```

### 8.8 — Bug Triage Table

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Monaco doesn't load | `@monaco-editor/react` version conflict | `npm install @monaco-editor/react@latest` |
| `{"ok":true}` but no lesson | WebSocket not connected | Check `wss://` URL in .env + JWT is valid |
| 401 on all requests | JWT expired or wrong secret | Re-run GitHub OAuth → get fresh JWT |
| Mermaid diagram blank | Invalid mermaid syntax in lesson | Add try/catch around `mermaid.render()` |
| GitHub panel empty | Token doesn't have `repo` scope | Re-auth with `scope=user:email,repo` |
| Polly audio 403 | S3 presigned URL expired (15min) | Re-trigger analyze to get fresh URL |
| Confetti doesn't fire | `canvas-confetti` import missing | `npm install canvas-confetti` |

### ✅ Hour 8 Checkpoint
- [ ] All 4 code scenario tests produce lessons via WebSocket
- [ ] Quiz fires 3 seconds after each lesson
- [ ] GitHub file browser loads real repo files
- [ ] CloudWatch shows 0 Lambda errors (only `INFO` lines)
- [ ] DynamoDB `veda-mistakes` table has new rows after testing
- [ ] WebSocket stays connected for 5+ minutes without disconnect

---

## ⏰ Hour 9 — Vercel Deployment + CORS + Production Config
**Duration:** 60 min | **Output:** Live URL at `veda-learn.vercel.app` (or similar)

### 9.1 — Push to GitHub

```bash
cd veda-learn-web
git init
git add .
git commit -m "feat: Veda Learn web app — complete build"

# Create a new GitHub repo named veda-learn-web, then:
git remote add origin https://github.com/Suvam-paul145/veda-learn-web.git
git push -u origin main
```

### 9.2 — Deploy to Vercel

```bash
# Install Vercel CLI globally
npm install -g vercel

# First deploy (follow prompts — all defaults are correct)
vercel

# Set production environment variables
vercel env add VITE_REST_URL production
# → paste: https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev

vercel env add VITE_WS_URL production
# → paste: wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev

vercel env add VITE_GITHUB_CLIENT_ID production
# → paste: Ov23liUfaTgayCi8bO5n

vercel env add VITE_DEMO_MODE production
# → paste: false   (30s debounce in production, not 5s)

# Deploy to production with env vars
vercel --prod
```

### 9.3 — Add `vercel.json` for SPA Routing

Without this, refreshing on `/ide` gives a 404 because Vercel doesn't know about React Router:

```json
// vercel.json (project root)
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Commit and push → Vercel auto-redeploys:
```bash
git add vercel.json && git commit -m "fix: SPA routing" && git push
```

### 9.4 — Update GitHub OAuth Callback URLs

```
GitHub → Settings → Developer Settings → OAuth Apps → Veda Learn

Add: https://veda-learn-YOURDEPLOYMENTID.vercel.app/auth/callback

(Replace with your actual Vercel URL from the deploy output)
```

### 9.5 — Update Lambda CORS + Auth Redirect

```bash
# Redeploy auth Lambda with production web URL:
# In veda-learn-api/serverless.yml environment:
#   WEB_APP_URL: https://veda-learn-YOURURL.vercel.app

cd veda-learn-api
npx serverless deploy --function authCallback
```

### 9.6 — Verify Production Deployment

```bash
# Test production endpoints from terminal:
PROD="https://veda-learn-YOURURL.vercel.app"

# Landing loads
curl -I $PROD | grep "200"

# OAuth URL is correct
echo "Open: https://github.com/login/oauth/authorize?client_id=Ov23liUfaTgayCi8bO5n&redirect_uri=${PROD}/auth/callback&scope=user:email,repo"

# WebSocket reachable from production
wscat -c "wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev?token=YOUR_JWT"
```

### ✅ Hour 9 Checkpoint
- [ ] `vercel --prod` completes with 0 errors
- [ ] Live URL opens in incognito browser → Landing renders with Three.js
- [ ] GitHub OAuth completes from the live URL (not localhost)
- [ ] `/ide` route accessible after login
- [ ] Page refresh on `/ide` keeps user logged in (JWT from localStorage)
- [ ] No mixed content warnings (all HTTP assets served over HTTPS)

---

## ⏰ Hour 10 — Demo Hardening + Final Polish
**Duration:** 60 min | **Output:** Rock-solid demo with preloaded bug scenarios + keyboard shortcuts

### 10.1 — Pre-loaded Bug Scenarios

Add a scenario picker so you can instantly demo any bug type during a presentation:

```jsx
// Add to the IDE toolbar in veda-complete.jsx
const DEMO_BUGS = [
  {
    label: '🐛 Python Mutable Default',
    language: 'python',
    file: 'cart.py',
    code: `def add_item(item, cart=[]):\n    cart.append(item)\n    return cart\n\nclass Cart:\n    def __init__(self, items=[]):\n        self.items = items`
  },
  {
    label: '⚠️ SQL Injection',
    language: 'python',
    file: 'queries.py',
    code: `def get_user(username):\n    query = f"SELECT * FROM users WHERE name = '{username}'"\n    return db.execute(query)`
  },
  {
    label: '🔁 Callback Hell',
    language: 'javascript',
    file: 'async.js',
    code: `fetchUser(id, function(user) {\n  fetchOrders(user.id, function(orders) {\n    fetchItems(orders[0].id, function(items) {\n      processItems(items, function(result) {\n        console.log(result)\n      })\n    })\n  })\n})`
  },
  {
    label: '🚨 TypeScript any',
    language: 'typescript',
    file: 'data.ts',
    code: `function processData(data: any): any {\n    return data.items.map((x: any) => x.value)\n}`
  },
]

// Dropdown in toolbar:
<select onChange={e => {
  const bug = DEMO_BUGS[+e.target.value]
  setCode(bug.code)
  setLanguage(bug.language)
  setFileName(bug.file)
}}>
  <option>⚡ Demo Bugs</option>
  {DEMO_BUGS.map((b, i) => <option key={i} value={i}>{b.label}</option>)}
</select>
```

### 10.2 — Keyboard Shortcuts

```javascript
// Add to IDEPage or VedaComplete:
useEffect(() => {
  const handler = (e) => {
    // F5 → Trigger analyze immediately (skip debounce)
    if (e.key === 'F5') {
      e.preventDefault()
      api.analyze({ fileContent: code, language, fileName, cursorLine })
    }
    // Escape → Close any open panel
    if (e.key === 'Escape') {
      document.activeElement.blur()
    }
    // Ctrl+` → Toggle terminal panel
    if (e.ctrlKey && e.key === '`') {
      e.preventDefault()
      // Toggle bottom panel visibility
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [code, language, fileName, cursorLine])
```

### 10.3 — Status Bar Live Indicators

```jsx
// Status bar in veda-complete.jsx — wire live data:
const { wsConnected, analyzing, user, skillScore, streak, language, fileName } = useVedaStore()

// Status indicator:
<span style={{ color: wsConnected ? '#10b981' : '#ef4444' }}>
  {wsConnected ? '👁 Veda watching' : '⚠ Disconnected'}
</span>

// Analyzing spinner:
{analyzing && <span style={{ color: '#fbbf24' }}>⏳ Analyzing...</span>}
```

### 10.4 — Final Demo Checklist

Run through this end-to-end before your demo:

```
AUTHENTICATION
  [ ] Live URL loads → Landing with Three.js neural web
  [ ] "Get Started" → GitHub login page
  [ ] GitHub OAuth completes in < 5 seconds
  [ ] User avatar + name shown in IDE toolbar
  [ ] Page refresh → stays logged in

EDITOR
  [ ] Monaco loads with Python syntax highlighting
  [ ] Language selector changes Monaco mode
  [ ] Line numbers visible
  [ ] Error squiggles appear on buggy lines after analyze

GITHUB INTEGRATION
  [ ] GitHub panel shows your actual repos
  [ ] Click a .py file → loads into Monaco
  [ ] Language auto-detected from file extension
  [ ] File name updates in status bar and tab

DETECTION + LESSON
  [ ] Load Python mutable default bug
  [ ] Wait 5s (demo mode) → "⏳ Analyzing..." in status bar
  [ ] Lesson panel activates with explanation
  [ ] Polly audio plays (or play button visible)
  [ ] Mermaid diagram renders
  [ ] Before/after code diff shown
  [ ] Amber dot on Quiz tab

QUIZ
  [ ] Quiz panel shows 3 questions
  [ ] Click wrong answer → red highlight
  [ ] Click correct answer → green highlight
  [ ] Complete quiz → confetti fires
  [ ] XP counter increments in status bar

DOUBT CHAT
  [ ] Type "Why is mutable default bad?" → Haiku responds
  [ ] Response includes code example
  [ ] Loading dots animate during response

PROGRESS
  [ ] XP and streak show correct values
  [ ] Weekly bar chart renders
  [ ] Concept mastery bars reflect completed lessons

DEPLOYMENT
  [ ] Works identically on live Vercel URL
  [ ] No console errors in production
  [ ] WebSocket connected on live site
```

### 10.5 — Cost Check

Run this before your demo to confirm you're not burning money:

```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "2 days ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics "UnblendedCost" \
  --region us-east-1

# Expected: < $0.05 per day for hackathon usage levels
```

### ✅ Hour 10 Checkpoint
- [ ] All items in demo checklist pass
- [ ] F5 triggers immediate analyze
- [ ] Demo bug dropdown pre-loads all 4 scenarios
- [ ] Status bar shows live WS connection indicator
- [ ] App works flawlessly on live Vercel URL

---

## 📊 Complete System Architecture (Post-Build)

```
USER BROWSER
    │
    ├─ GET /           → Landing (Three.js neural web)
    ├─ GET /login      → GitHub OAuth CTA
    ├─ GET /auth/callback?token=JWT → JWT → localStorage → /ide
    └─ GET /ide        → Full IDE (Monaco + Panels + Sidebar)
              │
              ├─── REST API calls ────────────────────────────────────────────┐
              │    VITE_REST_URL/api/analyze    → Lambda: analyze.js          │
              │    VITE_REST_URL/api/lesson     → Lambda: lesson.js           │
              │    VITE_REST_URL/api/quiz       → Lambda: quiz.js             │
              │    VITE_REST_URL/api/progress/* → Lambda: progressGet/Update  │
              │    VITE_REST_URL/api/doubt      → Lambda: doubt.js (new)      │
              │    VITE_REST_URL/auth/github/*  → Lambda: authCallback.js     │
              │                                                                │
              │    [analyze Lambda] → asyncInvoke → [lesson Lambda]           │
              │    [lesson Lambda] → ApiGatewayManagementApi.postToConnection │
              │                                                                │
              ├─── WebSocket ──────────────────────────────────────────────── │
              │    VITE_WS_URL?token=JWT                                      │
              │    → Lambda: wsConnect.js (stores connectionId in DynamoDB)   │
              │    ← Push: { type:'lesson', lesson:{...} }                    │
              │                                                                │
              └─── GitHub API (Octokit) ─────────────────────────────────────┘
                   api.github.com → repos, file contents, file tree
```

---

## 🗄️ DynamoDB Table Reference

| Table | Primary Key | Purpose | Written By |
|-------|-------------|---------|-----------|
| `veda-users` | `userId` (PK) | GitHub profile, XP, streak | `auth.js` |
| `veda-mistakes` | `mistakeId` (PK) + `userId` (GSI) | Every detected bug | `analyze.js` |
| `veda-lessons` | `lessonId` (PK) + `userId` (GSI) | Lesson content + S3 audio key | `lesson.js` |
| `veda-profiles` | `userId+language` (PK+SK) | Per-language skill tracking | `progressUpdate.js` |
| `veda-ws-connections` | `connectionId` (PK) | Live WebSocket session | `wsConnect.js` |
| `veda-rate-limits` | `userId:language` (PK) | 30s cooldown TTL | `analyze.js` |

---

## 💰 Total Cost Estimate (2-Day Hackathon)

| Service | Cost |
|---------|------|
| AWS Lambda (9 functions × ~200 invocations) | $0.00 (free tier) |
| API Gateway REST (< 1M requests) | $0.00 (free tier) |
| API Gateway WebSocket | ~$0.01 |
| DynamoDB (on-demand, < 1M reads/writes) | $0.00 (free tier) |
| OpenSearch Serverless | ~$0.50/day = ~$1.00 |
| S3 + Polly audio (< 50 files) | ~$0.02 |
| Vercel hosting | $0.00 (Hobby free plan) |
| OpenRouter AI (Haiku × 200, Sonnet × 50) | ~$0.30 |
| **Total** | **~$1.32 for both days** |

---

## 🛠️ Why Each Service Was Chosen

| Service | Reason |
|---------|--------|
| **React + Vite** | Fastest dev server with HMR. Vite builds in < 2s. No CRA bloat. |
| **Monaco Editor** | Identical engine to VS Code. Your users already know it. Built-in syntax highlighting, IntelliSense framework, error markers. |
| **Zustand** | 3KB global state. No context API complexity. Works with React hooks natively. Perfect for a 2-day build. |
| **AWS Lambda** | Serverless = zero server management. Auto-scales to 0 (no idle cost). 9 function already deployed. |
| **API Gateway + WebSocket** | WebSocket push is cleaner than polling. Lesson arrives the instant it's generated. API Gateway manages connection lifecycle. |
| **DynamoDB** | Auto-scales, pay-per-request, no connection pool management. 6 tables cover every data shape without schema migrations. |
| **OpenSearch Serverless** | kNN vector similarity for concept RAG. No cluster management. Only pay when queried. |
| **Amazon Polly** | Ruth voice TTS. MP3 stored in S3 = no runtime cost at lesson view time. Presigned URL = secure, temporary access. |
| **Google Gemini Embeddings** | Free tier (1,500 req/day), 768-dim, Titan quota is 0 in your account. Drop-in replacement. |
| **OpenRouter** | Access to Haiku (fast + cheap classifier), Sonnet (lesson generator), Gemini Flash (diagram generator) from one API key. |
| **Vercel** | Free hobby plan. Deploys from GitHub push in 30 seconds. Global CDN. SPA routing with `vercel.json`. |
| **GitHub OAuth** | No password management. Users already have GitHub. JWT is stateless — no session store needed. |
| **Three.js** | Neural particle web on landing creates a strong first impression. Already in `veda-landing.jsx` — no extra work. |

---

*Veda Learn — Web App Edition · Final 2-Day Roadmap*  
*AWS Architecture by Senior Cloud Architect · React + Vite + Lambda + WebSocket + Vercel*  
*Total new code required: ~600 lines of integration glue. All heavy infrastructure: already done.*
