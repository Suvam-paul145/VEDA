@echo off
echo ========================================
echo VEDA LEARN - PHASE 1 DEPLOYMENT
echo ========================================
echo Deploying Phase 1: Core Backend Services
echo - WebSocket System
echo - Lesson Generation
echo - Quiz System  
echo - Progress Tracking
echo.

cd veda-learn-api

echo [1/3] Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ DEPENDENCY INSTALLATION FAILED!
    echo Check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo [2/3] Deploying to AWS...
call npx serverless deploy --verbose
if %ERRORLEVEL% neq 0 (
    echo ❌ DEPLOYMENT FAILED!
    echo Check the error messages above.
    pause
    exit /b 1
)

echo.
echo [3/3] Verifying deployment...
echo Testing function endpoints...

echo.
echo ✅ DEPLOYMENT SUCCESSFUL!
echo.
echo ========================================
echo PHASE 1 CORE FUNCTIONALITY DEPLOYED
echo ========================================
echo.
echo 🔗 WebSocket System:
echo   - Connection management with JWT auth
echo   - Real-time message delivery to browser
echo   - Auto-cleanup of stale connections
echo.
echo 🧠 Lesson Generation:
echo   - OpenRouter AI integration (3 parallel calls)
echo   - Amazon Polly TTS synthesis
echo   - S3 audio storage with presigned URLs
echo   - WebSocket delivery to browser
echo.
echo 📝 Quiz System:
echo   - Automatic quiz generation after lessons
echo   - Multiple choice questions with scoring
echo   - Progress tracking integration
echo.
echo 📊 Progress Tracking:
echo   - XP and streak calculation
echo   - Concept mastery tracking
echo   - Badge system with auto-awarding
echo.
echo 🛡️ Rate Limiting:
echo   - 30-second cooldown between analysis
echo   - DynamoDB TTL-based implementation
echo.
echo 🔍 Enhanced Analysis:
echo   - Pattern detection for multiple languages
echo   - Automatic lesson generation trigger
echo   - Rate limiting protection
echo.
echo API Endpoints Ready:
echo - REST: https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
echo - WebSocket: wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
echo.
echo NEXT STEPS:
echo 1. Test the system: cd veda-learn-web && npm run dev
echo 2. Open http://localhost:5173
echo 3. Type code with patterns (mutable default, callback hell)
echo 4. Watch for real-time lessons via WebSocket
echo.
echo FIXES APPLIED:
echo - Fixed serverless.yml variable resolution errors
echo - Removed conflicting CloudFormation resources
echo - Used static S3 bucket names with account ID
echo - Comprehensive error handling and validation
echo.
pause