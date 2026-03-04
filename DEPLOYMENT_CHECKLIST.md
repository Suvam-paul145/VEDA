# Veda Learn AWS Deployment Checklist

## Pre-Deployment Requirements ✅

### 1. AWS Infrastructure
- [ ] **DynamoDB Tables Created** (6 tables)
  - veda-users, veda-mistakes, veda-lessons, veda-user-profiles, veda-ws-connections, veda-rate-limits
- [ ] **S3 Buckets Created** (2 buckets)
  - veda-learn-audio, veda-learn-concepts
- [ ] **OpenSearch Serverless Collection** 
  - Collection: veda-concepts
  - Index: concept-embeddings (768 dimensions)
- [ ] **AWS Account ID**: 034476915822
- [ ] **AWS Region**: us-east-1

### 2. IAM Permissions
- [ ] **Deployment User** (vscode-cli-user)
  - [ ] veda-access policy (OpenSearch)
  - [ ] VedaServerlessDeployment policy (CloudFormation, Lambda, API Gateway)
- [ ] **Lambda Execution Role** (veda-lambda-role)
  - [ ] AWSLambdaBasicExecutionRole
  - [ ] AmazonDynamoDBFullAccess
  - [ ] AmazonS3FullAccess
  - [ ] AmazonPollyFullAccess
  - [ ] VedaOpenSearchAccess (inline policy)

### 3. Environment Configuration
- [ ] **.env file** in veda-learn-api/
  - [ ] OPENROUTER_API_KEY
  - [ ] GEMINI_API_KEY
  - [ ] GITHUB_CLIENT_ID
  - [ ] GITHUB_CLIENT_SECRET
  - [ ] JWT_SECRET
  - [ ] AWS_ACCESS_KEY_ID
  - [ ] AWS_SECRET_ACCESS_KEY
  - [ ] OPENSEARCH_ENDPOINT
  - [ ] S3_AUDIO_BUCKET
  - [ ] S3_CONCEPTS_BUCKET

### 4. Application Configuration
- [ ] **Node.js Dependencies** installed
- [ ] **Serverless Framework** configured
- [ ] **Handler Files** present (8 Lambda functions)
- [ ] **Library Files** present (DynamoDB, OpenSearch, etc.)

## Deployment Steps 🚀

### Step 1: Verify Everything
```bash
./pre-deployment-verification.bat
```
**Expected Output**: All checks should pass with ✓ marks

### Step 2: Fix Missing Permissions (if needed)
```bash
./fix-deployment-permissions.bat
```
**Expected Output**: Policy created and attached successfully

### Step 3: Verify Lambda Role (if needed)
```bash
./check-lambda-role-policies.bat
```
**Expected Output**: All required policies attached to veda-lambda-role

### Step 4: Deploy Application
```bash
./deploy-veda-application.bat
```
**Expected Output**: 
- Deployment successful message
- API Gateway endpoints listed
- WebSocket endpoint updated in .env

## Post-Deployment Verification ✅

### 1. API Endpoints
- [ ] **REST API Gateway** deployed
  - [ ] GET /auth/github/callback
  - [ ] POST /api/analyze
  - [ ] POST /api/lesson
  - [ ] POST /api/lesson/deep
  - [ ] POST /api/quiz
  - [ ] GET /api/progress/{userId}
  - [ ] POST /api/progress/update

- [ ] **WebSocket API Gateway** deployed
  - [ ] $connect route
  - [ ] $disconnect route

### 2. Lambda Functions
- [ ] **8 Lambda functions** deployed
  - [ ] authCallback
  - [ ] analyze
  - [ ] lesson
  - [ ] lessonDeep
  - [ ] quiz
  - [ ] progressGet
  - [ ] progressUpdate
  - [ ] wsConnect
  - [ ] wsDisconnect

### 3. CloudWatch Logs
- [ ] **Log groups** created for each Lambda function
- [ ] **Logs** appearing when functions are invoked

### 4. Environment Variables
- [ ] **WS_API_ENDPOINT** updated in .env with deployed WebSocket URL

## Testing Commands 🧪

### Test REST API
```bash
# Test auth endpoint (should return 400 - missing code parameter)
curl -X GET "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/auth/github/callback"

# Test analyze endpoint (should return 401 - missing auth)
curl -X POST "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{"code":"console.log(\"hello\")"}'
```

### Test WebSocket API
```bash
# Use wscat to test WebSocket connection
npm install -g wscat
wscat -c "wss://YOUR_WS_ID.execute-api.us-east-1.amazonaws.com/dev"
```

## Troubleshooting Guide 🔧

### Common Issues

#### 1. CloudFormation Access Denied
**Error**: `User is not authorized to perform: cloudformation:CreateChangeSet`
**Solution**: Run `./fix-deployment-permissions.bat`

#### 2. Lambda Role Not Found
**Error**: `Role arn:aws:iam::034476915822:role/veda-lambda-role does not exist`
**Solution**: Run `./check-lambda-role-policies.bat`

#### 3. Environment Variables Not Found
**Error**: `Cannot resolve variable at "provider.environment.OPENROUTER_API_KEY"`
**Solution**: Check `.env` file exists and has all required variables

#### 4. OpenSearch Access Denied
**Error**: Lambda function cannot access OpenSearch
**Solution**: Verify `veda-access` policy and OpenSearch data access policy

#### 5. S3 Access Denied
**Error**: Lambda function cannot access S3 buckets
**Solution**: Verify S3 buckets exist and Lambda role has S3 permissions

### Verification Commands

```bash
# Check deployment user policies
aws iam list-attached-user-policies --user-name vscode-cli-user

# Check Lambda role policies
aws iam list-attached-role-policies --role-name veda-lambda-role

# Check infrastructure
aws dynamodb list-tables --query "TableNames[?starts_with(@, 'veda-')]"
aws s3 ls | findstr veda-learn
aws opensearchserverless list-collections --query "collectionSummaries[?name=='veda-concepts']"

# Check deployment status
cd veda-learn-api
npx serverless info
```

## Success Criteria ✅

Deployment is successful when:
- [ ] All 8 Lambda functions are deployed and active
- [ ] REST API Gateway has 7 endpoints
- [ ] WebSocket API Gateway has 2 routes
- [ ] All CloudWatch log groups are created
- [ ] Test API calls return expected responses (not 500 errors)
- [ ] Environment variables are properly loaded
- [ ] No permission errors in CloudWatch logs

## Next Steps After Deployment 🎯

1. **Configure VS Code Extension**
   - Update extension settings with API endpoints
   - Test extension functionality

2. **Test RAG System**
   - Upload sample concepts to S3
   - Test embedding generation with Gemini
   - Verify OpenSearch indexing and search

3. **Test Full Workflow**
   - Authenticate with GitHub
   - Analyze code samples
   - Generate lessons and quizzes
   - Test progress tracking

4. **Monitor and Debug**
   - Check CloudWatch logs for errors
   - Monitor API Gateway metrics
   - Test WebSocket connections

## Files Created for Deployment

- `pre-deployment-verification.bat` - Comprehensive pre-flight checks
- `fix-deployment-permissions.bat` - Fix user permissions
- `check-lambda-role-policies.bat` - Verify/fix Lambda role
- `deploy-veda-application.bat` - Main deployment script
- `aws-serverless-deployment-policy.json` - IAM policy for deployment
- `lambda-trust-policy.json` - Trust policy for Lambda role
- `lambda-opensearch-policy.json` - OpenSearch access for Lambda
- `DEPLOYMENT_CHECKLIST.md` - This checklist