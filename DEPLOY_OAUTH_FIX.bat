@echo off
echo ========================================
echo GITHUB OAUTH FIX - BACKEND DEPLOYMENT
echo ========================================
echo.

echo Deploying backend with dual URL support...
cd veda-learn-api
call npx serverless deploy --verbose
if %ERRORLEVEL% neq 0 (
    echo ERROR: Backend deployment failed!
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Backend now supports BOTH:
echo - Local: http://localhost:5174/auth/callback
echo - Production: https://talk-with-veda.vercel.app/auth/callback
echo.
echo NEXT STEPS:
echo 1. Go to: https://github.com/settings/developers
echo 2. Edit your OAuth app
echo 3. Add BOTH callback URLs:
echo    - https://talk-with-veda.vercel.app/auth/callback
echo    - http://localhost:5174/auth/callback
echo 4. Test both local and production OAuth flows
echo.
pause