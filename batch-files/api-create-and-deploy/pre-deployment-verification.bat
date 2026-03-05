@echo off
echo ==========================================
echo    PRE-DEPLOYMENT VERIFICATION SCRIPT
echo ==========================================

echo.
echo [STEP 1] Checking AWS CLI Configuration...
aws sts get-caller-identity
if %ERRORLEVEL% neq 0 (
    echo [ERROR] AWS CLI not configured or invalid credentials
    echo Please run: aws configure
    pause
    exit /b 1
)

echo.
echo [STEP 2] Verifying AWS Account and Region...
for /f "tokens=*" %%i in ('aws sts get-caller-identity --query "Account" --output text') do set ACCOUNT_ID=%%i
echo Account ID: %ACCOUNT_ID%
if not "%ACCOUNT_ID%"=="034476915822" (
    echo [WARNING] Account ID mismatch. Expected: 034476915822, Got: %ACCOUNT_ID%
)

echo.
echo [STEP 3] Checking Deployment User Policies...
echo Current user policies:
aws iam list-attached-user-policies --user-name vscode-cli-user --output table

echo.
echo [STEP 4] Verifying Lambda Execution Role...
aws iam get-role --role-name veda-lambda-role --query "Role.RoleName" --output text
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Lambda role 'veda-lambda-role' not found
    echo Please create the role first
    pause
    exit /b 1
)

echo.
echo Lambda role policies:
aws iam list-attached-role-policies --role-name veda-lambda-role --output table

echo.
echo [STEP 5] Checking Infrastructure Resources...
echo.
echo DynamoDB Tables:
aws dynamodb list-tables --query "TableNames[?starts_with(@, 'veda-')]" --output table

echo.
echo S3 Buckets:
aws s3 ls | findstr veda-learn

echo.
echo OpenSearch Collections:
aws opensearchserverless list-collections --query "collectionSummaries[?name=='veda-concepts']" --output table

echo.
echo [STEP 6] Verifying Environment Variables...
cd veda-learn-api
if not exist .env (
    echo [ERROR] .env file not found in veda-learn-api directory
    pause
    exit /b 1
)

echo Checking required environment variables in .env:
findstr /C:"OPENROUTER_API_KEY" .env >nul && echo ✓ OPENROUTER_API_KEY || echo ✗ OPENROUTER_API_KEY missing
findstr /C:"GEMINI_API_KEY" .env >nul && echo ✓ GEMINI_API_KEY || echo ✗ GEMINI_API_KEY missing
findstr /C:"GITHUB_CLIENT_ID" .env >nul && echo ✓ GITHUB_CLIENT_ID || echo ✗ GITHUB_CLIENT_ID missing
findstr /C:"GITHUB_CLIENT_SECRET" .env >nul && echo ✓ GITHUB_CLIENT_SECRET || echo ✗ GITHUB_CLIENT_SECRET missing
findstr /C:"JWT_SECRET" .env >nul && echo ✓ JWT_SECRET || echo ✗ JWT_SECRET missing
findstr /C:"OPENSEARCH_ENDPOINT" .env >nul && echo ✓ OPENSEARCH_ENDPOINT || echo ✗ OPENSEARCH_ENDPOINT missing
findstr /C:"S3_AUDIO_BUCKET" .env >nul && echo ✓ S3_AUDIO_BUCKET || echo ✗ S3_AUDIO_BUCKET missing
findstr /C:"S3_CONCEPTS_BUCKET" .env >nul && echo ✓ S3_CONCEPTS_BUCKET || echo ✗ S3_CONCEPTS_BUCKET missing

echo.
echo [STEP 7] Checking Node.js Dependencies...
if not exist node_modules (
    echo [WARNING] node_modules not found. Installing dependencies...
    npm install
)

echo.
echo [STEP 8] Validating Serverless Configuration...
npx serverless print --stage dev >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Serverless configuration validation failed
    echo Please check serverless.yml for syntax errors
    pause
    exit /b 1
) else (
    echo ✓ Serverless configuration is valid
)

cd ..

echo.
echo ==========================================
echo    VERIFICATION COMPLETE
echo ==========================================
echo.
echo Next steps:
echo 1. Review the output above for any errors
echo 2. If all checks pass, run: deploy-veda-application.bat
echo 3. If there are missing policies, run: fix-deployment-permissions.bat first
echo.
pause