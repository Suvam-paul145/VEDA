@echo off
echo ==========================================
echo    Fixing Serverless Deployment Permissions
echo ==========================================

echo.
echo [1/3] Creating serverless deployment policy...
aws iam create-policy ^
    --policy-name VedaServerlessDeployment ^
    --policy-document file://aws-serverless-deployment-policy.json ^
    --description "Permissions for deploying Veda Learn API with Serverless Framework"

if %ERRORLEVEL% neq 0 (
    echo [INFO] Policy may already exist, continuing...
)

echo.
echo [2/3] Attaching policy to user vscode-cli-user...
aws iam attach-user-policy ^
    --user-name vscode-cli-user ^
    --policy-arn arn:aws:iam::034476915822:policy/VedaServerlessDeployment

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to attach policy to user
    echo Please check if the user exists and you have permissions
    pause
    exit /b 1
)

echo.
echo [3/3] Verifying attached policies...
aws iam list-attached-user-policies --user-name vscode-cli-user

echo.
echo ==========================================
echo    Permissions Fixed Successfully!
echo ==========================================
echo.
echo Your user now has the following permissions:
echo - CloudFormation stack management
echo - Lambda function deployment
echo - API Gateway configuration
echo - CloudWatch Logs creation
echo - S3 deployment bucket access
echo.
echo You can now run: npx serverless deploy
echo.
pause