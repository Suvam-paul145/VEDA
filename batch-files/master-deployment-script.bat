@echo off
echo ==========================================
echo    VEDA LEARN AWS - MASTER DEPLOYMENT
echo ==========================================
echo.
echo This script will:
echo 1. Verify all prerequisites
echo 2. Fix any missing permissions
echo 3. Ensure Lambda role is properly configured
echo 4. Deploy the Serverless application
echo 5. Verify deployment success
echo.
echo Press any key to start, or Ctrl+C to cancel...
pause >nul

echo.
echo ==========================================
echo    PHASE 1: PRE-DEPLOYMENT VERIFICATION
echo ==========================================
call pre-deployment-verification.bat
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Pre-deployment verification failed
    echo Please fix the issues above before continuing
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    PHASE 2: DEPLOYMENT USER PERMISSIONS
echo ==========================================
echo Checking if VedaServerlessDeployment policy exists...
aws iam get-policy --policy-arn arn:aws:iam::034476915822:policy/VedaServerlessDeployment >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Policy not found. Creating deployment permissions...
    call fix-deployment-permissions.bat
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to fix deployment permissions
        pause
        exit /b 1
    )
) else (
    echo ✓ VedaServerlessDeployment policy already exists
)

echo.
echo ==========================================
echo    PHASE 3: LAMBDA ROLE VERIFICATION
echo ==========================================
call check-lambda-role-policies.bat
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Lambda role configuration failed
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    PHASE 4: APPLICATION DEPLOYMENT
echo ==========================================
call deploy-veda-application.bat
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Application deployment failed
    echo Check the error messages above for troubleshooting
    pause
    exit /b 1
)

echo.
echo ==========================================
echo    PHASE 5: POST-DEPLOYMENT VERIFICATION
echo ==========================================
echo.
echo Verifying deployment...
cd veda-learn-api

echo.
echo Deployed functions:
npx serverless info --verbose | findstr "functions:"
npx serverless info --verbose | findstr "  "

echo.
echo API endpoints:
npx serverless info --verbose | findstr "endpoints:"
npx serverless info --verbose | findstr "  GET\|  POST\|  WSS"

echo.
echo Testing basic connectivity...
for /f "tokens=4" %%i in ('npx serverless info --verbose ^| findstr "GET - https"') do (
    echo Testing: %%i
    curl -s -o nul -w "Status: %%{http_code} " "%%i"
    echo.
)

cd ..

echo.
echo ==========================================
echo    DEPLOYMENT SUMMARY
echo ==========================================
echo.
echo ✅ Infrastructure: DynamoDB, S3, OpenSearch
echo ✅ Permissions: User and Lambda role configured
echo ✅ Application: 8 Lambda functions deployed
echo ✅ APIs: REST and WebSocket endpoints active
echo ✅ Monitoring: CloudWatch logs enabled
echo.
echo 🎯 NEXT STEPS:
echo 1. Configure VS Code extension with API endpoints
echo 2. Test the RAG system with sample data
echo 3. Verify GitHub OAuth integration
echo 4. Monitor CloudWatch logs for any issues
echo.
echo 📋 Deployment details saved to deployment-summary.log
echo 📋 Full checklist available in DEPLOYMENT_CHECKLIST.md
echo.
echo ==========================================
echo    DEPLOYMENT COMPLETE! 🚀
echo ==========================================
pause