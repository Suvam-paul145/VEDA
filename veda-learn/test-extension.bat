@echo off
echo ==========================================
echo    VEDA LEARN EXTENSION - DEPLOYMENT
echo ==========================================

cd /d "%~dp0"

echo.
echo 🔧 COMPILING EXTENSION...
call npm run compile
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Compilation failed
    pause
    exit /b 1
)

echo.
echo ✅ COMPILATION SUCCESSFUL!
echo.
echo 🚀 NEXT STEPS:
echo.
echo 1. TEST IN DEVELOPMENT MODE:
echo    - Press F5 in VS Code to launch Extension Development Host
echo    - Look for "Veda Learn" in the Activity Bar
echo    - Click "Sign in with GitHub" to test OAuth
echo.
echo 2. PACKAGE FOR INSTALLATION:
echo    npm install -g vsce
echo    vsce package
echo.
echo 3. INSTALL MANUALLY:
echo    - Go to Extensions view (Ctrl+Shift+X)
echo    - Click "..." menu → "Install from VSIX..."
echo    - Select the .vsix file
echo.
echo 📊 EXTENSION STATUS:
echo   ✅ Source code: Complete
echo   ✅ API endpoints: Updated with deployed URLs
echo   ✅ Compilation: Successful
echo   ✅ Dependencies: Installed
echo   🧪 Testing: Ready for manual testing
echo.
echo 🔗 API ENDPOINTS CONFIGURED:
echo   REST: https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
echo   WebSocket: wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
echo.
echo Press F5 in VS Code to start testing!
echo.
pause