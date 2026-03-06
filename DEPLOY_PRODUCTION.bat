@echo off
echo ========================================
echo VEDA LEARN - PRODUCTION DEPLOYMENT
echo ========================================
echo.

echo [1/3] Deploying backend with production URL configuration...
cd veda-learn-api
call npm install
call npx serverless deploy --verbose
if %ERRORLEVEL% neq 0 (
    echo ERROR: Backend deployment failed!
    pause
    exit /b 1
)
cd ..

echo.
echo [2/3] Installing frontend dependencies...
cd veda-learn-web
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend dependency installation failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Building frontend for production...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Backend API: https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
echo WebSocket: wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
echo Frontend: https://talk-with-veda.vercel.app
echo.
echo NEXT STEPS:
echo 1. Deploy frontend build to Vercel
echo 2. Update GitHub OAuth app callback URL to:
echo    https://talk-with-veda.vercel.app/auth/callback
echo 3. Test OAuth flow with production URL
echo.
pause