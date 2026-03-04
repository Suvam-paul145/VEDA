@echo off
echo ==========================================
echo    VEDA LEARN AWS DEPLOYMENT SCRIPT
echo ==========================================

echo.
echo [STEP 1] Final pre-deployment checks...
echo Verifying AWS credentials...
aws sts get-caller-identity --query "Account" --output text
if %ERRORLEVEL% neq 0 (
    echo [ERROR] AWS credentials not configured
    pause
    exit /b 1
)

echo.
echo [STEP 2] Navigating to API directory...
cd veda-learn-api
if %ERRORLEVEL% neq 0 (
    echo [ERROR] veda-learn-api directory not found
    pause
    exit /b 1
)

echo.
echo [STEP 3] Installing/updating dependencies...
npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)

echo.
echo [STEP 4] Validating serverless configuration...
npx serverless print --stage dev >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Serverless configuration validation failed
    echo Please check serverless.yml and .env files
    pause
    exit /b 1
)

echo.
echo [STEP 5] Starting deployment...
echo This may take 5-10 minutes...
echo.
npx serverless deploy --verbose

if %ERRORLEVEL% neq 0 (
    echo.
    echo ==========================================
    echo    DEPLOYMENT FAILED
    echo ==========================================
    echo.
    echo Common issues and solutions:
    echo 1. Missing permissions - run: ..\fix-deployment-permissions.bat
    echo 2. Lambda role issues - run: ..\check-lambda-role-policies.bat
    echo 3. Environment variables - check .env file
    echo 4. Infrastructure missing - run AWS setup scripts
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    DEPLOYMENT SUCCESSFUL!
echo ==========================================

echo.
echo [STEP 6] Extracting deployment information...
echo.
echo API Endpoints:
npx serverless info --verbose | findstr "https://"

echo.
echo [STEP 7] Updating environment variables...
for /f "tokens=2 delims= " %%i in ('npx serverless info --verbose ^| findstr "WSS"') do (
    echo Updating WS_API_ENDPOINT in .env...
    powershell -Command "(Get-Content .env) -replace 'WS_API_ENDPOINT=.*', 'WS_API_ENDPOINT=%%i' | Set-Content .env"
)

echo.
echo [STEP 8] Testing deployment...
echo Testing auth endpoint...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" "https://$(npx serverless info --verbose | findstr "GET - https" | head -1 | cut -d' ' -f4)/auth/github/callback"

echo.
echo ==========================================
echo    DEPLOYMENT COMPLETE!
echo ==========================================
echo.
echo Next steps:
echo 1. Test the API endpoints shown above
echo 2. Configure the VS Code extension
echo 3. Test the WebSocket connection
echo 4. Verify the RAG system with sample queries
echo.
echo Deployment logs saved to: deployment.log
echo.

cd ..
pause