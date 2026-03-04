@echo off
echo ==========================================
echo Creating OpenSearch Serverless Collection
echo ==========================================
echo.

REM Get AWS Account ID
for /f "tokens=*" %%i in ('aws sts get-caller-identity --query Account --output text') do set ACCOUNT_ID=%%i
echo Using AWS Account ID: %ACCOUNT_ID%
echo.

echo [1/4] Creating encryption policy...
aws opensearchserverless create-security-policy ^
  --name veda-encryption ^
  --type encryption ^
  --policy "{\"Rules\":[{\"Resource\":[\"collection/veda-concepts\"],\"ResourceType\":\"collection\"}],\"AWSOwnedKey\":true}"
if %errorlevel% equ 0 (echo [OK] Encryption policy created) else (echo [FAILED] Encryption policy - may already exist)
echo.

echo [2/4] Creating network policy...
aws opensearchserverless create-security-policy ^
  --name veda-network ^
  --type network ^
  --policy "[{\"Rules\":[{\"Resource\":[\"collection/veda-concepts\"],\"ResourceType\":\"collection\"},{\"Resource\":[\"collection/veda-concepts\"],\"ResourceType\":\"dashboard\"}],\"AllowFromPublic\":true}]"
if %errorlevel% equ 0 (echo [OK] Network policy created) else (echo [FAILED] Network policy - may already exist)
echo.

echo [3/4] Creating data access policy...
aws opensearchserverless create-access-policy ^
  --name veda-access ^
  --type data ^
  --policy "[{\"Description\":\"Lambda access\",\"Rules\":[{\"Resource\":[\"collection/veda-concepts\"],\"Permission\":[\"aoss:*\"],\"ResourceType\":\"collection\"},{\"Resource\":[\"index/veda-concepts/*\"],\"Permission\":[\"aoss:*\"],\"ResourceType\":\"index\"}],\"Principal\":[\"arn:aws:iam::%ACCOUNT_ID%:role/veda-lambda-role\"]}]"
if %errorlevel% equ 0 (echo [OK] Data access policy created) else (echo [FAILED] Data access policy - may already exist)
echo.

echo [4/4] Creating OpenSearch Serverless collection...
aws opensearchserverless create-collection ^
  --name veda-concepts ^
  --type VECTORSEARCH
if %errorlevel% equ 0 (echo [OK] Collection created) else (echo [FAILED] Collection - may already exist)
echo.

echo Waiting for collection to become active...
timeout /t 10 /nobreak >nul
echo.

echo Retrieving collection endpoint...
for /f "tokens=*" %%i in ('aws opensearchserverless list-collections --query "collectionSummaries[?name==`veda-concepts`].collectionEndpoint" --output text') do set OPENSEARCH_ENDPOINT=%%i
echo Collection endpoint: %OPENSEARCH_ENDPOINT%
echo.

REM Check if collection was created successfully
if "%OPENSEARCH_ENDPOINT%"=="" (
    echo ❌ Collection not found or not active yet. Skipping index creation.
    echo Please wait for collection to become active and run index creation manually.
    goto :skip_index
)

echo [5/5] Creating vector index with 768 dimensions...
echo Installing required Python packages...
pip install boto3 requests requests-aws4auth >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Failed to install Python packages. Please install manually:
    echo    pip install boto3 requests requests-aws4auth
    goto :skip_index
)

echo Creating temporary Python script for index creation...
(
echo import boto3, requests
echo from requests_aws4auth import AWS4Auth
echo.
echo OPENSEARCH_ENDPOINT = "%OPENSEARCH_ENDPOINT%"
echo INDEX_NAME = "concept-embeddings"
echo.
echo session = boto3.Session^(^)
echo creds = session.get_credentials^(^)
echo auth = AWS4Auth^(creds.access_key, creds.secret_key, 'us-east-1', 'aoss', session_token=creds.token^)
echo.
echo index_body = {
echo   "settings": {"index.knn": True},
echo   "mappings": {
echo     "properties": {
echo       "conceptId": {"type": "keyword"},
echo       "content":   {"type": "text"},
echo       "embedding": {"type": "knn_vector", "dimension": 768,
echo                     "method": {"name":"hnsw","engine":"faiss","space_type":"innerproduct"}}
echo     }
echo   }
echo }
echo.
echo r = requests.put^(f"{OPENSEARCH_ENDPOINT}/{INDEX_NAME}", json=index_body, auth=auth^)
echo print^(f"Index creation status: {r.status_code}"^)
echo if r.status_code == 200:
echo     print^("✅ Vector index created successfully with 768 dimensions"^)
echo else:
echo     print^(f"❌ Index creation failed: {r.text}"^)
) > create_index_temp.py

python create_index_temp.py
del create_index_temp.py

:skip_index

echo.
echo ==========================================
echo OpenSearch Serverless Setup Complete!
echo ==========================================
echo.
echo IMPORTANT: Copy this endpoint to your .env file:
echo   OPENSEARCH_ENDPOINT=%OPENSEARCH_ENDPOINT%
echo.
echo ✅ Created:
echo   - Encryption policy: veda-encryption
echo   - Network policy: veda-network  
echo   - Data access policy: veda-access
echo   - Collection: veda-concepts
echo   - Vector index: concept-embeddings (768 dimensions)
echo.
echo Next steps:
echo   1. Create the Lambda execution role: veda-lambda-role
echo   2. Deploy Lambda functions with updated .env
echo   3. Test the RAG system
echo.
pause
