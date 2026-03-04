@echo off
echo ==========================================
echo Creating DynamoDB Tables for Veda Learn
echo ==========================================
echo.

echo [1/6] Creating veda-users table...
aws dynamodb create-table ^
  --table-name veda-users ^
  --attribute-definitions AttributeName=userId,AttributeType=S ^
  --key-schema AttributeName=userId,KeyType=HASH ^
  --billing-mode PAY_PER_REQUEST ^
  --region us-east-1
if %errorlevel% equ 0 (echo [OK] veda-users created) else (echo [FAILED] veda-users)
echo.

echo [2/6] Creating veda-mistakes table...
aws dynamodb create-table ^
  --table-name veda-mistakes ^
  --attribute-definitions AttributeName=mistakeId,AttributeType=S AttributeName=userId,AttributeType=S ^
  --key-schema AttributeName=mistakeId,KeyType=HASH ^
  --global-secondary-indexes "[{\"IndexName\":\"userId-index\",\"KeySchema\":[{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" ^
  --billing-mode PAY_PER_REQUEST ^
  --region us-east-1
if %errorlevel% equ 0 (echo [OK] veda-mistakes created) else (echo [FAILED] veda-mistakes)
echo.

echo [3/6] Creating veda-lessons table...
aws dynamodb create-table ^
  --table-name veda-lessons ^
  --attribute-definitions AttributeName=lessonId,AttributeType=S AttributeName=userId,AttributeType=S ^
  --key-schema AttributeName=lessonId,KeyType=HASH ^
  --global-secondary-indexes "[{\"IndexName\":\"userId-index\",\"KeySchema\":[{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" ^
  --billing-mode PAY_PER_REQUEST ^
  --region us-east-1
if %errorlevel% equ 0 (echo [OK] veda-lessons created) else (echo [FAILED] veda-lessons)
echo.

echo [4/6] Creating veda-profiles table...
aws dynamodb create-table ^
  --table-name veda-profiles ^
  --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=language,AttributeType=S ^
  --key-schema AttributeName=userId,KeyType=HASH AttributeName=language,KeyType=RANGE ^
  --billing-mode PAY_PER_REQUEST ^
  --region us-east-1
if %errorlevel% equ 0 (echo [OK] veda-profiles created) else (echo [FAILED] veda-profiles)
echo.

echo [5/6] Creating veda-ws-connections table...
aws dynamodb create-table ^
  --table-name veda-ws-connections ^
  --attribute-definitions AttributeName=userId,AttributeType=S ^
  --key-schema AttributeName=userId,KeyType=HASH ^
  --billing-mode PAY_PER_REQUEST ^
  --region us-east-1
if %errorlevel% equ 0 (echo [OK] veda-ws-connections created) else (echo [FAILED] veda-ws-connections)
echo.

echo [6/6] Creating veda-rate-limits table...
aws dynamodb create-table ^
  --table-name veda-rate-limits ^
  --attribute-definitions AttributeName=lockKey,AttributeType=S ^
  --key-schema AttributeName=lockKey,KeyType=HASH ^
  --billing-mode PAY_PER_REQUEST ^
  --region us-east-1
if %errorlevel% equ 0 (echo [OK] veda-rate-limits created) else (echo [FAILED] veda-rate-limits)
echo.

echo Enabling TTL on veda-rate-limits table...
aws dynamodb update-time-to-live ^
  --table-name veda-rate-limits ^
  --time-to-live-specification "Enabled=true,AttributeName=ttl" ^
  --region us-east-1
if %errorlevel% equ 0 (echo [OK] TTL enabled) else (echo [FAILED] TTL)
echo.

echo ==========================================
echo DynamoDB Setup Complete!
echo ==========================================
echo.
echo Created tables:
echo   1. veda-users
echo   2. veda-mistakes (with userId-index GSI)
echo   3. veda-lessons (with userId-index GSI)
echo   4. veda-profiles (composite key: userId + language)
echo   5. veda-ws-connections
echo   6. veda-rate-limits (with TTL enabled)
echo.
pause
