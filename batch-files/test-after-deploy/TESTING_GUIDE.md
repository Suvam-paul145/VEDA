# Veda Learn AWS - Complete Testing Guide

## 🎯 Testing Overview

This guide will help you test all components of your Veda Learn system:
1. **Basic Connectivity** - API Gateway and Lambda functions
2. **Authentication System** - GitHub OAuth flow
3. **Core Features** - Code analysis, lessons, quizzes
4. **Real-time Features** - WebSocket connections
5. **Data Storage** - DynamoDB and S3 integration
6. **RAG System** - OpenSearch and embeddings

## 📋 Your Deployed Endpoints

**REST API Base:** `https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev`
**WebSocket API:** `wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev`

## 🧪 Testing Phases

### Phase 1: Basic Connectivity Tests

#### Test 1.1: Lambda Function Health
```bash
# Test auth endpoint (should return 400 - missing code parameter)
curl -X GET "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/auth/github/callback"

# Expected: {"error": "Missing code parameter"} or similar
```

#### Test 1.2: API Gateway CORS
```bash
# Test CORS headers
curl -X OPTIONS "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/api/analyze" -H "Origin: http://localhost:3000"

# Expected: CORS headers in response
```

#### Test 1.3: All Endpoints Reachable
```bash
# Test each endpoint for basic connectivity
curl -X POST "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/api/analyze" -H "Content-Type: application/json" -d "{}"
curl -X POST "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/api/lesson" -H "Content-Type: application/json" -d "{}"
curl -X POST "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/api/quiz" -H "Content-Type: application/json" -d "{}"

# Expected: 401 Unauthorized or validation errors (not 500 Internal Server Error)
```

### Phase 2: Authentication System Tests

#### Test 2.1: GitHub OAuth Redirect
```bash
# Test OAuth initiation (manual browser test)
# Open in browser: https://github.com/login/oauth/authorize?client_id=Ov23liUfaTgayCi8bO5n&redirect_uri=https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/auth/github/callback&scope=user:email

# Expected: GitHub login page
```

#### Test 2.2: JWT Token Generation
After completing OAuth flow, you should receive a JWT token that can be used for authenticated requests.

### Phase 3: Core Feature Tests

#### Test 3.1: Code Analysis
```bash
# Test with sample JavaScript code
curl -X POST "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/api/analyze" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": "function fibonacci(n) { if (n <= 1) return n; return fibonacci(n-1) + fibonacci(n-2); }",
    "language": "javascript"
  }'

# Expected: Analysis results with mistakes, suggestions, concepts
```

#### Test 3.2: Lesson Generation
```bash
# Test lesson generation
curl -X POST "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/api/lesson" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "concept": "recursion",
    "difficulty": "beginner",
    "userId": "test-user-123"
  }'

# Expected: Generated lesson content with explanations and examples
```

#### Test 3.3: Quiz Generation
```bash
# Test quiz generation
curl -X POST "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/api/quiz" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "concept": "loops",
    "difficulty": "intermediate",
    "questionCount": 3
  }'

# Expected: Generated quiz questions with multiple choice options
```

#### Test 3.4: Progress Tracking
```bash
# Test getting user progress
curl -X GET "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/api/progress/test-user-123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test updating progress
curl -X POST "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/api/progress/update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "test-user-123",
    "concept": "recursion",
    "score": 85,
    "completed": true
  }'

# Expected: Progress data and successful update confirmation
```

### Phase 4: WebSocket Tests

#### Test 4.1: WebSocket Connection
```bash
# Install wscat for WebSocket testing
npm install -g wscat

# Test WebSocket connection
wscat -c "wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev"

# Expected: Connection established, then send test message
```

#### Test 4.2: Real-time Progress Updates
After connecting via WebSocket, test sending progress updates and receiving real-time notifications.

### Phase 5: Data Storage Tests

#### Test 5.1: DynamoDB Integration
Check if data is being stored properly in DynamoDB tables:

```bash
# Check if user data is stored
aws dynamodb scan --table-name veda-users --limit 5

# Check mistakes storage
aws dynamodb scan --table-name veda-mistakes --limit 5

# Check progress storage
aws dynamodb scan --table-name veda-user-profiles --limit 5
```

#### Test 5.2: S3 Integration
Test if audio files and concepts are being stored in S3:

```bash
# Check S3 buckets
aws s3 ls s3://veda-learn-audio/
aws s3 ls s3://veda-learn-concepts/
```

### Phase 6: RAG System Tests

#### Test 6.1: OpenSearch Integration
Test if concepts are being indexed in OpenSearch:

```bash
# Test OpenSearch endpoint (requires proper authentication)
curl -X GET "https://uyldvggykxquifk12deb.us-east-1.aoss.amazonaws.com/_cat/indices"
```

#### Test 6.2: Embedding Generation
Test if Gemini embeddings are working:

```bash
# This will be tested through the lesson generation endpoint
# The system should automatically generate embeddings for concepts
```

## 🔍 Monitoring and Debugging

### CloudWatch Logs
Monitor your Lambda functions in real-time:

```bash
# View logs for specific function
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/veda-learn-api-dev"

# Tail logs in real-time (replace with actual log group name)
aws logs tail /aws/lambda/veda-learn-api-dev-analyze --follow
```

### Error Tracking
Common issues to watch for:
1. **500 Internal Server Error** - Check CloudWatch logs
2. **401 Unauthorized** - JWT token issues
3. **403 Forbidden** - IAM permission issues
4. **Timeout errors** - Function execution time limits

## 📊 Success Criteria

Your system is working correctly if:

✅ **Basic Tests**
- All endpoints return appropriate HTTP status codes (not 500)
- CORS headers are present
- Lambda functions execute without errors

✅ **Authentication**
- GitHub OAuth flow completes successfully
- JWT tokens are generated and validated
- Protected endpoints require authentication

✅ **Core Features**
- Code analysis returns meaningful results
- Lessons are generated with proper content
- Quizzes contain relevant questions
- Progress tracking stores and retrieves data

✅ **Real-time Features**
- WebSocket connections establish successfully
- Real-time updates are received

✅ **Data Storage**
- DynamoDB tables contain expected data
- S3 buckets store files correctly
- OpenSearch indexes concepts properly

## 🚨 Troubleshooting Common Issues

### Issue 1: 500 Internal Server Error
**Solution:** Check CloudWatch logs for the specific Lambda function

### Issue 2: CORS Errors
**Solution:** Verify CORS configuration in serverless.yml

### Issue 3: Authentication Failures
**Solution:** Check GitHub OAuth app configuration and JWT secret

### Issue 4: Database Connection Issues
**Solution:** Verify IAM permissions for Lambda role

### Issue 5: OpenSearch Access Denied
**Solution:** Check OpenSearch data access policies

## 🎯 Next Steps After Testing

Once all tests pass:
1. **Configure VS Code Extension** with your API endpoints
2. **Set up monitoring alerts** in CloudWatch
3. **Implement error handling** improvements
4. **Add performance monitoring**
5. **Set up automated testing** pipeline

## 📝 Test Results Template

Use this template to track your testing results:

```
[ ] Phase 1: Basic Connectivity - All endpoints reachable
[ ] Phase 2: Authentication - GitHub OAuth working
[ ] Phase 3: Core Features - Analysis, lessons, quizzes working
[ ] Phase 4: WebSocket - Real-time connections working
[ ] Phase 5: Data Storage - DynamoDB and S3 integration working
[ ] Phase 6: RAG System - OpenSearch and embeddings working

Issues Found:
- 
- 
- 

Overall Status: ✅ PASS / ❌ FAIL
```