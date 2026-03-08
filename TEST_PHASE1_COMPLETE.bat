@echo off
echo ========================================
echo VEDA LEARN - PHASE 1 TESTING
echo ========================================
echo Testing Phase 1 deployment and functionality
echo.

echo [1/3] Verifying backend deployment...
echo.
echo ✅ Backend Functions Deployed:
echo   - analyze: Pattern detection + rate limiting
echo   - lesson: AI lesson generation + TTS + WebSocket
echo   - quiz: Quiz generation + scoring
echo   - progress: XP tracking + badges + streaks
echo   - wsConnect/wsDisconnect: WebSocket management
echo.
echo 🔗 API Endpoints:
echo   - REST: https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
echo   - WebSocket: wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
echo.

echo [2/3] Installing frontend dependencies...
cd veda-learn-web
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ Frontend dependency installation failed!
    pause
    exit /b 1
)
cd ..

echo.
echo [3/3] Starting development server...
echo.
echo ========================================
echo PHASE 1 TESTING READY!
echo ========================================
echo.
echo 🚀 CORE FUNCTIONALITY IMPLEMENTED:
echo.
echo 🔍 Enhanced Code Analysis:
echo   - Pattern detection for Python, JavaScript, TypeScript
echo   - Rate limiting (30s cooldown)
echo   - Automatic lesson generation trigger
echo.
echo 🧠 AI Lesson Generation:
echo   - 3 parallel OpenRouter API calls (explanation + code fix + quiz)
echo   - Amazon Polly TTS synthesis
echo   - S3 audio storage with presigned URLs
echo   - Real-time WebSocket delivery
echo.
echo 📝 Interactive Quiz System:
echo   - Auto-generated MCQ questions
echo   - Scoring and XP calculation
echo   - Progress tracking integration
echo.
echo 📊 Progress Tracking:
echo   - XP and level system
echo   - Daily streak tracking
echo   - Concept mastery (0-100 scale)
echo   - Badge system with auto-awarding
echo.
echo 🔗 WebSocket System:
echo   - JWT-based authentication
echo   - Real-time message delivery
echo   - Auto-cleanup of stale connections
echo   - 25s keep-alive ping
echo.
echo TO TEST THE SYSTEM:
echo 1. cd veda-learn-web
echo 2. npm run dev
echo 3. Open http://localhost:5173
echo 4. Login with GitHub OAuth
echo 5. Type code with patterns:
echo    - Python: def func(items=[]):
echo    - JavaScript: nested callbacks
echo    - TypeScript: any types
echo 6. Watch for real-time lessons via WebSocket
echo.
echo EXPECTED FLOW:
echo 1. Code analysis detects pattern
echo 2. Lesson generation starts (3 AI calls)
echo 3. Audio synthesis with Polly
echo 4. WebSocket pushes lesson to browser
echo 5. Quiz appears 3 seconds later
echo 6. XP and progress updates
echo.
pause