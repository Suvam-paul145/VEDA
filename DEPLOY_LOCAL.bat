@echo off
echo ========================================
echo VEDA LEARN - LOCAL DEVELOPMENT SETUP
echo ========================================
echo.

echo [1/2] Deploying backend for localhost:5173...
cd veda-learn-api
call npx serverless deploy --verbose
if %ERRORLEVEL% neq 0 (
    echo ERROR: Backend deployment failed!
    pause
    exit /b 1
)
cd ..

echo.
echo [2/2] Installing frontend dependencies...
cd veda-learn-web
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend dependency installation failed!
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo LOCAL SETUP COMPLETE!
echo ========================================
echo.
echo Your app is configured for: http://localhost:5173
echo.
echo GITHUB OAUTH SETUP REQUIRED:
echo 1. Go to: https://github.com/settings/developers
echo 2. Edit your OAuth app (Client ID: Ov23liUfaTgayCi8bO5n)
echo 3. Set Authorization callback URL to:
echo    http://localhost:5173/auth/callback
echo.
echo TO START DEVELOPMENT:
echo cd veda-learn-web
echo npm run dev
echo.
pause