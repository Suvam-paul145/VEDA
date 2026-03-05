@echo off
echo ==========================================
echo    LAMBDA ROLE POLICY VERIFICATION
echo ==========================================

echo.
echo [1/6] Checking if veda-lambda-role exists...
aws iam get-role --role-name veda-lambda-role --query "Role.RoleName" --output text
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Lambda role 'veda-lambda-role' not found
    echo Creating the role...
    goto CREATE_ROLE
) else (
    echo ✓ Role exists
)

echo.
echo [2/6] Current attached policies:
aws iam list-attached-role-policies --role-name veda-lambda-role --output table

echo.
echo [3/6] Checking required AWS managed policies...

echo Checking AWSLambdaBasicExecutionRole...
aws iam list-attached-role-policies --role-name veda-lambda-role --query "AttachedPolicies[?PolicyName=='AWSLambdaBasicExecutionRole']" --output text
if "%ERRORLEVEL%"=="0" (
    echo ✓ AWSLambdaBasicExecutionRole attached
) else (
    echo ✗ AWSLambdaBasicExecutionRole missing - attaching...
    aws iam attach-role-policy --role-name veda-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
)

echo Checking AmazonDynamoDBFullAccess...
aws iam list-attached-role-policies --role-name veda-lambda-role --query "AttachedPolicies[?PolicyName=='AmazonDynamoDBFullAccess']" --output text
if "%ERRORLEVEL%"=="0" (
    echo ✓ AmazonDynamoDBFullAccess attached
) else (
    echo ✗ AmazonDynamoDBFullAccess missing - attaching...
    aws iam attach-role-policy --role-name veda-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
)

echo Checking AmazonS3FullAccess...
aws iam list-attached-role-policies --role-name veda-lambda-role --query "AttachedPolicies[?PolicyName=='AmazonS3FullAccess']" --output text
if "%ERRORLEVEL%"=="0" (
    echo ✓ AmazonS3FullAccess attached
) else (
    echo ✗ AmazonS3FullAccess missing - attaching...
    aws iam attach-role-policy --role-name veda-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
)

echo Checking AmazonPollyFullAccess...
aws iam list-attached-role-policies --role-name veda-lambda-role --query "AttachedPolicies[?PolicyName=='AmazonPollyFullAccess']" --output text
if "%ERRORLEVEL%"=="0" (
    echo ✓ AmazonPollyFullAccess attached
) else (
    echo ✗ AmazonPollyFullAccess missing - attaching...
    aws iam attach-role-policy --role-name veda-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonPollyFullAccess
)

echo.
echo [4/6] Checking OpenSearch access policy...
aws iam get-role-policy --role-name veda-lambda-role --policy-name VedaOpenSearchAccess >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ✗ OpenSearch inline policy missing - creating...
    aws iam put-role-policy --role-name veda-lambda-role --policy-name VedaOpenSearchAccess --policy-document file://lambda-opensearch-policy.json
) else (
    echo ✓ OpenSearch inline policy exists
)

echo.
echo [5/6] Verifying trust relationship...
aws iam get-role --role-name veda-lambda-role --query "Role.AssumeRolePolicyDocument" --output json

echo.
echo [6/6] Final policy summary:
aws iam list-attached-role-policies --role-name veda-lambda-role --output table
aws iam list-role-policies --role-name veda-lambda-role --output table

echo.
echo ==========================================
echo    LAMBDA ROLE VERIFICATION COMPLETE
echo ==========================================
goto END

:CREATE_ROLE
echo Creating veda-lambda-role...
aws iam create-role --role-name veda-lambda-role --assume-role-policy-document file://lambda-trust-policy.json --description "Execution role for Veda Learn Lambda functions"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to create role
    pause
    exit /b 1
)
echo ✓ Role created successfully
echo Attaching policies...
aws iam attach-role-policy --role-name veda-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam attach-role-policy --role-name veda-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
aws iam attach-role-policy --role-name veda-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam attach-role-policy --role-name veda-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonPollyFullAccess
aws iam put-role-policy --role-name veda-lambda-role --policy-name VedaOpenSearchAccess --policy-document file://lambda-opensearch-policy.json
echo ✓ All policies attached

:END
pause