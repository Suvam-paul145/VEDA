# 🚀 Veda Learn - Quick Start Guide

## ⚡ 30-Second Setup

```bash
# 1. Navigate to web app
cd veda-learn-web

# 2. Start development server (if not already running)
npm run dev

# 3. Open browser
# Visit: http://localhost:5174
```

That's it! The app is ready to use.

## 🎯 First Time Setup (Already Done!)

The following has already been completed:

- ✅ All dependencies installed
- ✅ Environment variables configured
- ✅ Backend deployed to AWS
- ✅ Database tables created
- ✅ Tailwind CSS v4 configured
- ✅ Development server running

## 🌐 Access Points

### Local Development
- **Frontend**: http://localhost:5174
- **Landing Page**: http://localhost:5174/
- **Login**: http://localhost:5174/login
- **IDE**: http://localhost:5174/ide (requires auth)

### Production APIs
- **REST API**: https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
- **WebSocket**: wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev

## 🎮 How to Use

### 1. Landing Page
- Beautiful Three.js neural network animation
- Click "Start Learning" button

### 2. Login
- Click "Sign in with GitHub"
- Authorize the app
- Redirected back to IDE

### 3. IDE Interface
- **Left Sidebar**: File explorer with demo files
- **Center**: Monaco code editor (VS Code engine)
- **Right Panel**: Lessons, Quizzes, Progress
- **Bottom**: Status bar with language and stats

### 4. Try the Demo
1. Click on `cart.py` in the file explorer
2. Wait 30 seconds (or 5 seconds in demo mode)
3. Watch the lesson appear in the right panel
4. Complete the quiz to earn XP
5. Check your progress in the Progress tab

## 🔑 Test Accounts

Use your own GitHub account for authentication.

## 📱 Features to Test

### Core Features
- [ ] Code analysis (type bad code, wait 30s)
- [ ] Lesson generation (appears via WebSocket)
- [ ] Quiz system (3 MCQ questions)
- [ ] XP rewards (earn points for correct answers)
- [ ] Progress tracking (view your stats)

### UI Features
- [ ] File explorer (click files to load)
- [ ] Monaco editor (full VS Code experience)
- [ ] Syntax highlighting (Python, JS, TS)
- [ ] Panel switching (Lesson, Quiz, Progress)
- [ ] Notifications (top-right bell icon)

### Advanced Features
- [ ] GitHub integration (browse repos)
- [ ] Command palette (Ctrl+K)
- [ ] Terminal emulator (bottom panel)
- [ ] Doubt chat (ask questions)
- [ ] Deep dive lessons (detailed explanations)

## 🐛 Troubleshooting

### Dev Server Not Running?

```bash
cd veda-learn-web
npm run dev
```

### Port Already in Use?

Vite will automatically use another port (5174, 5175, etc.)

### Can't Login?

1. Check GitHub OAuth app settings
2. Verify callback URL: http://localhost:5173/auth/callback
3. Check browser console for errors

### No Lessons Appearing?

1. Wait full 30 seconds (or 5s in demo mode)
2. Check WebSocket connection in Network tab
3. Verify JWT token in localStorage
4. Check browser console for errors

### Tailwind Not Working?

Already configured with Tailwind v4! Should work out of the box.

## 📦 Project Structure

```
veda-learn-web/
├── src/
│   ├── components/auth/     # Login & OAuth
│   ├── pages/
│   │   ├── Landing.jsx      # Landing page
│   │   └── IDEPage.jsx      # Complete IDE
│   ├── store/               # Zustand state
│   ├── lib/                 # API client
│   └── App.jsx              # Router
├── .env                     # Environment variables
└── package.json             # Dependencies
```

## 🎨 Demo Code Files

The IDE comes with 3 demo files:

1. **cart.py**: Python mutable default argument bug
2. **api.ts**: TypeScript excessive `any` usage
3. **fetch.js**: JavaScript callback hell

Try editing these files to trigger lessons!

## 🚀 Deploy to Production

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

## 📚 Documentation

- **Main README**: `/README.md`
- **Web App README**: `/veda-learn-web/README.md`
- **Deployment Guide**: `/DEPLOYMENT_COMPLETE.md`
- **This Guide**: `/QUICKSTART.md`

## 🎯 Key Shortcuts

- `Ctrl+K`: Open command palette
- `Ctrl+L`: Toggle lesson panel
- `Ctrl+Q`: Start quiz
- `Ctrl+D`: Open doubt chat
- `Ctrl+P`: View progress
- `Ctrl+\``: Toggle terminal
- `F5`: Run analysis

## 💡 Tips

1. **Demo Mode**: Set `VITE_DEMO_MODE=true` for 5-second debounce
2. **Production Mode**: Set `VITE_DEMO_MODE=false` for 30-second debounce
3. **GitHub Repos**: Connect your GitHub to browse real code
4. **XP System**: Complete quizzes to earn XP and level up
5. **Streaks**: Code daily to maintain your learning streak

## 🎉 You're Ready!

The application is fully functional and ready to use. Start coding and let Veda teach you!

---

**Need Help?**
- Check browser console (F12)
- Review Network tab for API errors
- Check `DEPLOYMENT_COMPLETE.md` for detailed info

**Happy Learning! 🚀**
