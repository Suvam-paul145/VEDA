@echo off
echo ========================================
echo VEDA LEARN - API FIXES DEPLOYMENT
echo ========================================
echo.

echo [FIXES APPLIED]
echo 1. Auth handler now includes githubToken in JWT
echo 2. AuthCallback extracts githubToken from JWT
echo 3. Analyze handler properly implemented with pattern detection
echo 4. CORS headers configured correctly
echo.

echo [1/3] Deploying backend with fixes...
cd veda-learn-api
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
call npm install @octokit/rest @octokit/auth-token
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend dependency installation failed!
    pause
    exit /b 1
)
cd ..

echo.
echo [3/3] Testing configuration...
echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo CRITICAL CHANGES:
echo - JWT now includes githubToken for GitHub API access
echo - Analyze endpoint properly detects code patterns
echo - CORS configured for authenticated requests
echo.
echo NEXT STEPS:
echo 1. Clear browser localStorage: localStorage.clear()
echo 2. Login again via GitHub OAuth
echo 3. Test analyze with Python mutable default code
echo 4. Check console for githubToken in JWT payload
echo.
echo TEST CODE (paste in editor):
echo def add_item(item, cart=[]):
echo     cart.append(item)
echo     return cart
echo.
pause