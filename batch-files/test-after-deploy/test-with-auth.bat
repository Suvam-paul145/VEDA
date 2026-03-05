@echo off
echo ==========================================
echo    VEDA LEARN - AUTHENTICATED TESTING
echo ==========================================

set API_BASE=https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev

echo.
echo This script tests endpoints that require authentication.
echo You need a JWT token from the GitHub OAuth flow.
echo.

set /p JWT_TOKEN="Enter your JWT token (or press Enter to skip): "

if "%JWT_TOKEN%"=="" (
    echo.
    echo ⚠️  No JWT token provided. 
    echo.
    echo To get a JWT token:
    echo 1. Open browser: https://github.com/login/oauth/authorize?client_id=Ov23liUfaTgayCi8bO5n^&redirect_uri=%API_BASE%/auth/github/callback^&scope=user:email
    echo 2. Complete GitHub OAuth flow
    echo 3. Copy the JWT token from the response
    echo 4. Run this script again with the token
    echo.
    pause
    exit /b 0
)

echo.
echo 🔐 TESTING WITH AUTHENTICATION...
echo Token: %JWT_TOKEN:~0,20%...
echo.

echo ==========================================
echo    AUTHENTICATED ENDPOINT TESTS
echo ==========================================

echo.
echo [Test 1] Code Analysis - JavaScript Fibonacci
curl -s -w "\nStatus: %%{http_code}\n" -X POST "%API_BASE%/api/analyze" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %JWT_TOKEN%" ^
  -d "{\"code\":\"function fibonacci(n) { if (n <= 1) return n; return fibonacci(n-1) + fibonacci(n-2); }\",\"language\":\"javascript\"}"

echo.
echo [Test 2] Lesson Generation - Recursion Concept
curl -s -w "\nStatus: %%{http_code}\n" -X POST "%API_BASE%/api/lesson" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %JWT_TOKEN%" ^
  -d "{\"concept\":\"recursion\",\"difficulty\":\"beginner\",\"userId\":\"test-user-123\"}"

echo.
echo [Test 3] Quiz Generation - Loops Concept
curl -s -w "\nStatus: %%{http_code}\n" -X POST "%API_BASE%/api/quiz" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %JWT_TOKEN%" ^
  -d "{\"concept\":\"loops\",\"difficulty\":\"intermediate\",\"questionCount\":3}"

echo.
echo [Test 4] Get User Progress
curl -s -w "\nStatus: %%{http_code}\n" -X GET "%API_BASE%/api/progress/test-user-123" ^
  -H "Authorization: Bearer %JWT_TOKEN%"

echo.
echo [Test 5] Update User Progress
curl -s -w "\nStatus: %%{http_code}\n" -X POST "%API_BASE%/api/progress/update" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %JWT_TOKEN%" ^
  -d "{\"userId\":\"test-user-123\",\"concept\":\"recursion\",\"score\":85,\"completed\":true}"

echo.
echo ==========================================
echo    ADVANCED TESTS
echo ==========================================

echo.
echo [Test 6] Deep Lesson Generation
curl -s -w "\nStatus: %%{http_code}\n" -X POST "%API_BASE%/api/lesson/deep" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %JWT_TOKEN%" ^
  -d "{\"concept\":\"algorithms\",\"difficulty\":\"advanced\",\"userId\":\"test-user-123\"}"

echo.
echo ==========================================
echo    TEST RESULTS ANALYSIS
echo ==========================================
echo.
echo ✅ SUCCESS INDICATORS:
echo   - Status: 200 OK for all requests
echo   - JSON responses with expected data structure
echo   - No "Internal Server Error" messages
echo.
echo ❌ FAILURE INDICATORS:
echo   - Status: 500 Internal Server Error
echo   - Status: 401 Unauthorized (token invalid)
echo   - Status: 403 Forbidden (permission issues)
echo   - Empty responses or error messages
echo.
echo 🔍 DEBUGGING STEPS:
echo   1. Check CloudWatch logs for detailed error messages
echo   2. Verify JWT token is valid and not expired
echo   3. Ensure all environment variables are set correctly
echo   4. Check DynamoDB table permissions
echo   5. Verify OpenRouter and Gemini API keys are working
echo.
echo To check CloudWatch logs:
echo   aws logs tail /aws/lambda/veda-learn-api-dev-analyze --follow
echo.
pause