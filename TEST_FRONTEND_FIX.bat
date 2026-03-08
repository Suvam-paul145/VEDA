@echo off
echo ========================================
echo TESTING FRONTEND FIX
echo ========================================
echo.
echo Testing the useVedaStore import fix...
echo.

cd veda-learn-web

echo [1/2] Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ Dependency installation failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Starting development server...
echo.
echo ✅ IMPORT FIX APPLIED:
echo   - Changed: import { useVedaStore } from '../store/useVedaStore'
echo   - To: import useVedaStore from '../store/useVedaStore'
echo.
echo 🔧 ENVIRONMENT CONFIGURED:
echo   - REST API: https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
echo   - WebSocket: wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
echo   - GitHub OAuth: Ov23liUfaTgayCi8bO5n
echo.
echo Starting Vite development server...
echo Open http://localhost:5173 when ready
echo.
call npm run dev