@echo off
echo ==========================================
echo    VEDA LEARN - ENDPOINT TESTING SCRIPT
echo ==========================================

set API_BASE=https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
set WS_ENDPOINT=wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev

echo.
echo 🧪 TESTING ALL ENDPOINTS...
echo API Base: %API_BASE%
echo WebSocket: %WS_ENDPOINT%
echo.

echo ==========================================
echo    PHASE 1: BASIC CONNECTIVITY TESTS
echo ==========================================

echo.
echo [Test 1.1] Auth Endpoint (should return error about missing code)
curl -s -w "Status: %%{http_code}\n" "%API_BASE%/auth/github/callback"

echo.
echo [Test 1.2] Analyze Endpoint (should return 401 Unauthorized)
curl -s -w "Status: %%{http_code}\n" -X POST "%API_BASE%/api/analyze" -H "Content-Type: application/json" -d "{}"

echo.
echo [Test 1.3] Lesson Endpoint (should return 401 Unauthorized)
curl -s -w "Status: %%{http_code}\n" -X POST "%API_BASE%/api/lesson" -H "Content-Type: application/json" -d "{}"

echo.
echo [Test 1.4] Quiz Endpoint (should return 401 Unauthorized)
curl -s -w "Status: %%{http_code}\n" -X POST "%API_BASE%/api/quiz" -H "Content-Type: application/json" -d "{}"

echo.
echo [Test 1.5] Progress Get Endpoint (should return 401 Unauthorized)
curl -s -w "Status: %%{http_code}\n" "%API_BASE%/api/progress/test-user"

echo.
echo [Test 1.6] Progress Update Endpoint (should return 401 Unauthorized)
curl -s -w "Status: %%{http_code}\n" -X POST "%API_BASE%/api/progress/update" -H "Content-Type: application/json" -d "{}"

echo.
echo ==========================================
echo    PHASE 2: CORS TESTING
echo ==========================================

echo.
echo [Test 2.1] CORS Headers Check
curl -s -I -X OPTIONS "%API_BASE%/api/analyze" -H "Origin: http://localhost:3000"

echo.
echo ==========================================
echo    PHASE 3: WEBSOCKET TESTING
echo ==========================================

echo.
echo [Test 3.1] WebSocket Endpoint Info
echo WebSocket URL: %WS_ENDPOINT%
echo To test WebSocket connection, run:
echo   npm install -g wscat
echo   wscat -c "%WS_ENDPOINT%"

echo.
echo ==========================================
echo    PHASE 4: AWS INFRASTRUCTURE CHECK
echo ==========================================

echo.
echo [Test 4.1] DynamoDB Tables
aws dynamodb list-tables --query "TableNames[?starts_with(@, 'veda-')]" --output table

echo.
echo [Test 4.2] S3 Buckets
aws s3 ls | findstr veda-learn

echo.
echo [Test 4.3] OpenSearch Collection
aws opensearchserverless list-collections --query "collectionSummaries[?name=='veda-concepts']" --output table

echo.
echo ==========================================
echo    PHASE 5: CLOUDWATCH LOGS CHECK
echo ==========================================

echo.
echo [Test 5.1] Lambda Log Groups
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/veda-learn-api-dev" --query "logGroups[].logGroupName" --output table

echo.
echo ==========================================
echo    TEST RESULTS SUMMARY
echo ==========================================
echo.
echo ✅ EXPECTED RESULTS:
echo   - Auth endpoint: 400 Bad Request (missing code parameter)
echo   - API endpoints: 401 Unauthorized (missing JWT token)
echo   - CORS headers: Access-Control-Allow-Origin present
echo   - DynamoDB: 6 tables starting with 'veda-'
echo   - S3: veda-learn-audio and veda-learn-concepts buckets
echo   - OpenSearch: veda-concepts collection ACTIVE
echo   - CloudWatch: 9 log groups for Lambda functions
echo.
echo ❌ ISSUES TO INVESTIGATE:
echo   - Any 500 Internal Server Error responses
echo   - Missing CORS headers
echo   - Missing infrastructure components
echo   - No log groups (indicates deployment issues)
echo.
echo 🎯 NEXT STEPS:
echo   1. If all basic tests pass, proceed to authenticated testing
echo   2. Get JWT token via GitHub OAuth flow
echo   3. Test WebSocket connection with wscat
echo   4. Monitor CloudWatch logs during testing
echo.
echo For detailed testing instructions, see: TESTING_GUIDE.md
echo.
pause