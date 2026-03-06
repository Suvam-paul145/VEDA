# Veda Learn - Web IDE

AI-powered coding tutor in your browser. Learn by making mistakes, get instant lessons, and track your progress.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Live URLs

- **Development**: http://localhost:5173
- **REST API**: https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
- **WebSocket**: wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev

## 📁 Project Structure

```
veda-learn-web/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx       # GitHub OAuth login
│   │   │   └── AuthCallback.jsx    # OAuth callback handler
│   │   ├── editor/                 # (empty - using inline components)
│   │   ├── layout/                 # (empty - using inline components)
│   │   └── panels/                 # (empty - using inline components)
│   ├── hooks/                      # (empty - using inline hooks)
│   ├── lib/
│   │   └── api.js                  # API client with interceptors
│   ├── pages/
│   │   ├── Landing.jsx             # Landing page with Three.js
│   │   └── IDEPage.jsx             # Complete IDE interface
│   ├── store/
│   │   └── useVedaStore.js         # Zustand global state
│   ├── App.jsx                     # Router configuration
│   ├── main.jsx                    # App entry point
│   └── index.css                   # Tailwind imports
├── .env                            # Environment variables
├── package.json                    # Dependencies
├── postcss.config.js               # PostCSS config (Tailwind v4)
├── tailwind.config.js              # Tailwind configuration
└── vite.config.js                  # Vite configuration
```

## 🔑 Environment Variables

Create a `.env` file in the root:

```env
VITE_REST_URL=https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
VITE_WS_URL=wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
VITE_GITHUB_CLIENT_ID=Ov23liUfaTgayCi8bO5n
VITE_APP_URL=http://localhost:5173
VITE_DEMO_MODE=true
```

## 🎯 Features

### ⚡ Live Error Detection
- 30-second debounce on code changes
- Claude Haiku classifier (< 3s response)
- 0.85+ confidence threshold

### 📖 Voice-First Lessons
- 3-panel lesson interface
- Amazon Polly TTS narration
- Before/after code comparison
- Mermaid.js diagrams

### 🎯 Adaptive Quizzes
- 3 MCQ questions per concept
- XP rewards for correct answers
- Concept mastery tracking

### 💬 AI Doubt Assistant
- Context-aware responses
- Full editor context included
- Streaming responses

### 📁 GitHub Integration
- Browse repositories
- Load files directly
- Syntax highlighting

### 📈 Skill Progression
- XP tracking
- Learning streaks
- Weekly activity chart
- Concept mastery percentages

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 7
- **Styling**: Tailwind CSS v4
- **State**: Zustand
- **Editor**: Monaco Editor (VS Code engine)
- **3D**: Three.js
- **Routing**: React Router v7
- **HTTP**: Axios
- **Syntax**: React Syntax Highlighter
- **Diagrams**: Mermaid.js
- **Animations**: Canvas Confetti

## 🔐 Authentication Flow

1. User clicks "Sign in with GitHub" on `/login`
2. Redirects to GitHub OAuth
3. GitHub redirects to `/auth/callback?token=JWT`
4. JWT stored in localStorage
5. User redirected to `/ide`

## 📡 API Integration

### REST Endpoints

```javascript
POST /api/analyze        // Code analysis
POST /api/lesson         // Lesson generation
POST /api/lesson/deep    // Deep dive lesson
POST /api/quiz           // Quiz generation
GET  /api/progress/:id   // Get user progress
POST /api/progress/update // Update progress
POST /api/doubt          // Ask doubt
```

### WebSocket

```javascript
// Connect with JWT
ws://wss://imhoyvukwe.../dev?token=JWT

// Message types
{ type: 'lesson', lesson: {...} }
{ type: 'error', message: '...' }
```

## 🎨 Design System

### Colors

```javascript
bg:      #07090f  // Background
surface: #0d1117  // Surface
panel:   #161b27  // Panel
indigo:  #6366f1  // Primary
violet:  #8b5cf6  // Secondary
amber:   #fbbf24  // Warning
green:   #10b981  // Success
red:     #ef4444  // Error
```

### Typography

- **Headings**: Syne (800 weight)
- **Body**: Syne (400-600 weight)
- **Code**: JetBrains Mono

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm run build
vercel --prod
```

### Environment Variables (Production)

```
VITE_REST_URL=https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
VITE_WS_URL=wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
VITE_GITHUB_CLIENT_ID=Ov23liUfaTgayCi8bO5n
VITE_APP_URL=https://veda-learn.vercel.app
VITE_DEMO_MODE=false
```

## 📝 Development Notes

### Tailwind CSS v4

This project uses Tailwind CSS v4 with the new `@tailwindcss/postcss` plugin:

```javascript
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {}
  }
}
```

```css
/* src/index.css */
@import "tailwindcss";
```

### Monaco Editor

The IDE uses Monaco Editor (same engine as VS Code):

```javascript
import MonacoEditor from '@monaco-editor/react'

<MonacoEditor
  height="100%"
  language="python"
  theme="vs-dark"
  value={code}
  onChange={handleChange}
/>
```

### State Management

Global state is managed with Zustand:

```javascript
import useVedaStore from './store/useVedaStore'

const { jwt, user, code, setCode } = useVedaStore()
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Vite will automatically try another port
# Or kill the process using port 5173
```

### Tailwind Not Working

```bash
# Ensure you have the correct packages
npm install -D @tailwindcss/postcss tailwindcss postcss
```

### WebSocket Connection Failed

- Check JWT is valid
- Verify WebSocket URL in `.env`
- Check browser console for errors

## 📄 License

MIT

## 🤝 Contributing

This is a hackathon project. Contributions welcome!

## 📧 Support

For issues, please check the browser console and network tab first.
