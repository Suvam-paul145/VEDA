# Veda Learn API — Complete Testing Guide

> **Last verified:** March 2026 · **Stack:** Serverless Framework v3 · Node.js 20.x · AWS us-east-1

---

## 📊 Current Test Status (Baseline Run)

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Deployment info | 9 functions + 2 API URLs | ✅ All 9 functions deployed | ✅ PASS |
| Auth endpoint (no code) | `Missing code` | `Missing code` | ✅ PASS |
| Analyze endpoint (no auth) | `{"ok":true}` (stub) | `{"ok":true}` | ⚠️ STUB |
| Quiz endpoint | `{"ok":true}` (stub) | `{"ok":true}` | ⚠️ STUB |
| Progress GET endpoint | `{"ok":true}` (stub) | `{"ok":true}` | ⚠️ STUB |
| WebSocket connection | `Connected` | `Connected` | ✅ PASS |

> **⚠️ Important:** All handler files (`analyze.js`, `quiz.js`, `lesson.js`, `progress.js`, `progressUpdate.js`, `wsConnect.js`, `wsDisconnect.js`) are currently **stubs** that return `{"ok":true}`. The tests below are structured in two tracks — **current stub validation** and **post-implementation full validation**.

---

## 🌐 Endpoints Reference

```
REST API Base : https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
WebSocket URL : wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
AWS Account   : 034476915822
Region        : us-east-1
```

---

## Prerequisites

### Tools Required

```bash
# AWS CLI
aws --version       # >= 2.x

# Node.js
node --version      # >= 20.x

# wscat (WebSocket client)
npm install -g wscat
wscat --version

# curl
curl --version
```

### Environment Setup

```bash
# Set these once in your terminal session before running any test
export BASE="https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev"
export WS="wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev"

# JWT is set AFTER completing Phase 3 (GitHub OAuth)
# export JWT="your-token-here"
```

---

## Phase 1 — Deployment Verification

**Goal:** Confirm all 9 Lambda functions are deployed and both API Gateway endpoints exist.

```bash
cd veda-learn-api
npx serverless info --verbose
```

### ✅ What to check in the output:

```
# Must see exactly these 9 functions:
functions:
  authCallback     : veda-learn-api-dev-authCallback
  analyze          : veda-learn-api-dev-analyze
  lesson           : veda-learn-api-dev-lesson
  lessonDeep       : veda-learn-api-dev-lessonDeep
  quiz             : veda-learn-api-dev-quiz
  progressGet      : veda-learn-api-dev-progressGet
  progressUpdate   : veda-learn-api-dev-progressUpdate
  wsConnect        : veda-learn-api-dev-wsConnect
  wsDisconnect     : veda-learn-api-dev-wsDisconnect

# Must see both API types:
endpoints:
  GET  - https://afwwdtnwob...  ← REST API (7 routes)
  wss://imhoyvukwe...           ← WebSocket API
```

### ✅ Verify Lambda functions exist in AWS directly:

```bash
aws lambda list-functions \
  --region us-east-1 \
  --query "Functions[?starts_with(FunctionName, 'veda-learn-api-dev')].FunctionName" \
  --output table
```

**Expected:** Table showing all 9 function names.

---

## Phase 2 — Infrastructure Health Check

**Goal:** Confirm all supporting AWS services are provisioned correctly.

### 2.1 DynamoDB Tables

```bash
aws dynamodb list-tables --region us-east-1 \
  --query "TableNames[?starts_with(@, 'veda-')]" \
  --output table
```

**Expected output (6 tables):**
```
veda-lessons
veda-mistakes
veda-profiles
veda-rate-limits
veda-users
veda-ws-connections
```

Check TTL is enabled on rate-limits:
```bash
aws dynamodb describe-time-to-live \
  --table-name veda-rate-limits \
  --region us-east-1
```
**Expected:** `"TimeToLiveStatus": "ENABLED"`

### 2.2 S3 Buckets

```bash
aws s3 ls | grep veda-learn
```

**Expected:**
```
veda-learn-audio
veda-learn-concepts
```

Check CORS on audio bucket:
```bash
aws s3api get-bucket-cors --bucket veda-learn-audio
```
**Expected:** JSON showing `AllowedMethods: ["GET"]` and `AllowedOrigins: ["*"]`

### 2.3 OpenSearch Collection

```bash
aws opensearchserverless list-collections \
  --region us-east-1 \
  --query "collectionSummaries[?name=='veda-concepts']" \
  --output table
```

**Expected:** `status: ACTIVE` with your endpoint URL.

### 2.4 IAM Role Policies

```bash
aws iam list-attached-role-policies \
  --role-name veda-lambda-role \
  --output table
```

**Expected:** At minimum these policies attached:
- `AmazonDynamoDBFullAccess`
- `AmazonPollyFullAccess`
- `AmazonS3FullAccess`
- `AmazonOpenSearchServiceFullAccess`
- `AWSLambdaBasicExecutionRole`

---

## Phase 3 — Authentication Flow

**Goal:** Get a real JWT token via GitHub OAuth.

### 3.1 Trigger OAuth

Open this URL in a browser:

```
https://github.com/login/oauth/authorize?client_id=Ov23liUfaTgayCi8bO5n&redirect_uri=https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/auth/github/callback&scope=user:email
```

### 3.2 Monitor the Auth Lambda

In a separate terminal, tail the logs before clicking Approve:

```bash
aws logs tail /aws/lambda/veda-learn-api-dev-authCallback \
  --follow \
  --region us-east-1
```

### 3.3 Verify user was created in DynamoDB

After OAuth completes:

```bash
aws dynamodb scan \
  --table-name veda-users \
  --region us-east-1 \
  --query "Items[0]"
```

**Expected:** Your GitHub profile data with `userId: "gh_XXXXXXX"`, `skillScore: 0`, `streakDays: 0`.

### 3.4 Auth endpoint error handling

```bash
# No code parameter — should return 400
curl -s "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/auth/github/callback"
```
**Expected:** `Missing code`

```bash
# Invalid code — should return error, not 500
curl -s "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/auth/github/callback?code=invalid123"
```
**Expected:** Error JSON, not a 500 Internal Server Error.

---

## Phase 4 — REST API Endpoint Tests

> Set your JWT before running these:
> ```bash
> export JWT="your-jwt-token-from-oauth"
> export BASE="https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev"
> ```

### 4.1 Analyze Endpoint

**Test A: No auth header**
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{}'
```
**Expected (after implementation):** `401`  
**Current (stub):** `200`

**Test B: Valid request with Python mutable default bug**
```bash
curl -s -X POST "$BASE/api/analyze" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "fileContent": "def add_item(item, cart=[]):\n    cart.append(item)\n    return cart",
    "language": "python",
    "fileName": "cart.py",
    "cursorLine": 1,
    "diagnostics": []
  }'
```
**Expected (stub):** `{"ok":true}`  
**Expected (after implementation):** `{"teach":true,"mistakeId":"uuid-here"}` or `{"teach":false,"reason":"cooldown"}`

**Test C: Valid request with SQL injection bug**
```bash
curl -s -X POST "$BASE/api/analyze" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "fileContent": "query = \"SELECT * FROM users WHERE id = \" + user_id",
    "language": "python",
    "fileName": "db.py",
    "cursorLine": 1,
    "diagnostics": []
  }'
```
**Expected (after implementation):** `{"teach":true,"mistakeId":"..."}` — SQL injection should have high confidence.

**Test D: Clean code (no mistake)**
```bash
curl -s -X POST "$BASE/api/analyze" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "fileContent": "def add(a: int, b: int) -> int:\n    return a + b",
    "language": "python",
    "fileName": "math.py",
    "cursorLine": 1,
    "diagnostics": []
  }'
```
**Expected (after implementation):** `{"teach":false}`

---

### 4.2 Quiz Endpoint

**Test A: Valid quiz request**
```bash
curl -s -X POST "$BASE/api/quiz" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "conceptId": "mutable-default",
    "language": "python"
  }'
```
**Expected (stub):** `{"ok":true}`  
**Expected (after implementation):**
```json
{
  "quiz": [
    {
      "question": "What is wrong with using a mutable default argument?",
      "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
      "correct": "A",
      "explanation": "..."
    }
  ]
}
```

**Test B: Different concept**
```bash
curl -s -X POST "$BASE/api/quiz" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "conceptId": "sql-injection",
    "language": "python"
  }'
```

---

### 4.3 Lesson Endpoint

**Test A: Manual lesson trigger**
```bash
curl -s -X POST "$BASE/api/lesson" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "mistakeId": "test-mistake-id",
    "conceptId": "mutable-default",
    "problematicCode": "def add(x, items=[]):",
    "language": "python"
  }'
```
**Expected (stub):** `{"ok":true}`  
**Expected (after implementation):** `{"ok":true}` immediately (lesson delivered via WebSocket asynchronously)

**Test B: Deep dive lesson (Opus model)**
```bash
curl -s -X POST "$BASE/api/lesson/deep" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "conceptId": "mutable-default",
    "language": "python",
    "problematicCode": "def add(x, items=[]):\n  items.append(x)"
  }'
```

---

### 4.4 Progress Endpoints

**Test A: Get progress**
```bash
# Replace gh_YOURID with your actual GitHub userId from DynamoDB scan
curl -s "$BASE/api/progress/gh_YOURID" \
  -H "Authorization: Bearer $JWT"
```
**Expected (stub):** `{"ok":true}`  
**Expected (after implementation):**
```json
{
  "skillScore": 0,
  "streakDays": 0,
  "learningProfiles": []
}
```

**Test B: Update progress**
```bash
curl -s -X POST "$BASE/api/progress/update" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId": "test-lesson-id",
    "rating": 5,
    "quizPassed": true,
    "conceptId": "mutable-default",
    "language": "python"
  }'
```
**Expected (after implementation):** `{"success":true}`

---

## Phase 5 — WebSocket Tests

### 5.1 Basic Connection

```bash
wscat -c "$WS?token=$JWT"
```
**Expected:** `Connected (press CTRL+C to quit)`

If you see `Disconnected` immediately — JWT is invalid or `wsConnect` Lambda is failing. Check logs:
```bash
aws logs tail /aws/lambda/veda-learn-api-dev-wsConnect --follow
```

### 5.2 Verify connectionId stored in DynamoDB

After connecting via wscat, in another terminal:

```bash
aws dynamodb scan \
  --table-name veda-ws-connections \
  --region us-east-1
```
**Expected (after wsConnect implementation):** Your `userId` and `connectionId` stored.

### 5.3 Verify connectionId removed on disconnect

Press `Ctrl+C` in wscat to disconnect, then:

```bash
aws dynamodb scan \
  --table-name veda-ws-connections \
  --region us-east-1
```
**Expected (after wsDisconnect implementation):** Table should be empty.

### 5.4 Invalid token rejection

```bash
wscat -c "$WS?token=invalid-token-here"
```
**Expected (after wsConnect implementation):** Connection rejected with 401.  
**Current (stub):** `Connected` — because stub always returns 200.

---

## Phase 6 — Rate Limiting Tests

> These only apply after `rateLimit.js` is implemented.

### 6.1 Lesson lock (30-second cooldown)

Send two analyze requests in rapid succession with the same user:

```bash
# First request — should trigger lesson
curl -s -X POST "$BASE/api/analyze" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"fileContent":"def add(x, items=[]):","language":"python","fileName":"t.py","cursorLine":1,"diagnostics":[]}'

# Second request immediately — should be blocked
curl -s -X POST "$BASE/api/analyze" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"fileContent":"def add(x, items=[]):","language":"python","fileName":"t.py","cursorLine":1,"diagnostics":[]}'
```

**Expected:** Second returns `{"teach":false,"reason":"cooldown"}`

Check the rate lock in DynamoDB:
```bash
aws dynamodb scan \
  --table-name veda-rate-limits \
  --region us-east-1
```

---

## Phase 7 — End-to-End Flow Test

**Goal:** Full pipeline from code submission → lesson delivery → quiz → progress update.

### Step 1: Open WebSocket listener

```bash
# Terminal 1 — keep this open
wscat -c "$WS?token=$JWT"
```

### Step 2: Submit buggy code

```bash
# Terminal 2
curl -s -X POST "$BASE/api/analyze" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "fileContent": "def add_item(item, cart=[]):\n    cart.append(item)\n    return cart",
    "language": "python",
    "fileName": "cart.py",
    "cursorLine": 1,
    "diagnostics": []
  }'
```

### Step 3: Watch Terminal 1

**Expected (after full implementation):** A lesson JSON message arrives automatically:
```json
{
  "type": "lesson",
  "lesson": {
    "lessonId": "uuid",
    "conceptId": "mutable-default",
    "explanation": "Here is what is happening in your code...",
    "codeBefore": "def add_item(item, cart=[]):",
    "codeAfter": "def add_item(item, cart=None):\n    if cart is None: cart = []",
    "codeComment": "Use None as default, create new list inside",
    "diagramSyntax": "flowchart TD...",
    "audioUrl": "https://veda-learn-audio.s3.amazonaws.com/lessons/uuid.mp3?..."
  }
}
```

### Step 4: Verify all data persisted

```bash
# Check mistake saved
aws dynamodb scan --table-name veda-mistakes --region us-east-1 --limit 1

# Check lesson saved  
aws dynamodb scan --table-name veda-lessons --region us-east-1 --limit 1

# Check audio file in S3
aws s3 ls s3://veda-learn-audio/lessons/
```

### Step 5: Submit progress update

```bash
curl -s -X POST "$BASE/api/progress/update" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "lessonId": "LESSON_ID_FROM_STEP_3",
    "rating": 5,
    "quizPassed": true,
    "conceptId": "mutable-default",
    "language": "python"
  }'
```

### Step 6: Verify score updated

```bash
aws dynamodb get-item \
  --table-name veda-users \
  --key '{"userId":{"S":"gh_YOUR_GITHUB_ID"}}' \
  --region us-east-1
```
**Expected:** `skillScore` incremented by 3 (quiz passed), `streakDays` updated.

---

## Phase 8 — CloudWatch Log Monitoring

Monitor any Lambda in real-time during testing:

```bash
# Auth Lambda
aws logs tail /aws/lambda/veda-learn-api-dev-authCallback --follow

# Analyze Lambda (most important)
aws logs tail /aws/lambda/veda-learn-api-dev-analyze --follow

# Lesson Lambda
aws logs tail /aws/lambda/veda-learn-api-dev-lesson --follow

# Quiz Lambda
aws logs tail /aws/lambda/veda-learn-api-dev-quiz --follow

# WebSocket connect
aws logs tail /aws/lambda/veda-learn-api-dev-wsConnect --follow
```

---

## 🔴 Known Issues & Next Steps

| Issue | Root Cause | Fix Required |
|-------|-----------|--------------|
| All endpoints return `{"ok":true}` | Handler stubs not implemented | Implement all `handlers/*.js` files |
| WebSocket accepts invalid tokens | `wsConnect.js` is a stub | Implement JWT verification in `wsConnect.js` |
| No lesson delivered via WebSocket | `lesson.js` is a stub | Implement `generateLesson()` function |
| No DynamoDB writes on analyze | `analyze.js` is a stub | Implement Haiku classifier + DynamoDB writes |
| No audio files in S3 | `polly.js` is empty | Implement `lib/polly.js` |
| No vector search | `opensearch.js` is empty | Implement `lib/opensearch.js` + run seed script |

---

## Implementation Priority Order

Follow this order to build and test incrementally:

```
1. lib/openrouter.js     → needed by analyze + lesson + quiz
2. lib/rateLimit.js      → needed by analyze
3. handlers/wsConnect.js → needed for WebSocket auth
4. handlers/wsDisconnect.js
5. handlers/analyze.js   → core detection pipeline
6. lib/polly.js          → needed by lesson
7. lib/websocket.js      → needed by lesson
8. handlers/lesson.js    → core lesson delivery
9. lib/geminiEmbed.js    → needed by RAG
10. lib/opensearch.js    → RAG context retrieval
11. handlers/quiz.js     → quiz generation
12. handlers/progress.js + progressUpdate.js → streak tracking
```

After implementing each file, redeploy and re-run the corresponding phase test:

```bash
npx serverless deploy --function analyze   # deploy single function
npx serverless deploy                      # deploy all
```

---

## Quick Smoke Test (Run After Every Deploy)

Copy-paste this block to run all basic checks at once:

```bash
BASE="https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev"
JWT="your-token-here"

echo "=== 1. Auth (expect: Missing code) ==="
curl -s "$BASE/auth/github/callback"

echo -e "\n=== 2. Analyze no-auth (expect: 401 after impl) ==="
curl -s -o /dev/null -w "HTTP %{http_code}" \
  -X POST "$BASE/api/analyze" -H "Content-Type: application/json" -d '{}'

echo -e "\n=== 3. Analyze with auth ==="
curl -s -X POST "$BASE/api/analyze" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"fileContent":"def f(x, y=[]):","language":"python","fileName":"t.py","cursorLine":1,"diagnostics":[]}'

echo -e "\n=== 4. Quiz ==="
curl -s -X POST "$BASE/api/quiz" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"conceptId":"mutable-default","language":"python"}'

echo -e "\n=== 5. DynamoDB tables ==="
aws dynamodb list-tables --region us-east-1 \
  --query "TableNames[?starts_with(@, 'veda-')]" --output text

echo -e "\n=== 6. S3 buckets ==="
aws s3 ls | grep veda-learn

echo -e "\n=== 7. OpenSearch collection ==="
aws opensearchserverless list-collections --region us-east-1 \
  --query "collectionSummaries[?name=='veda-concepts'].status" --output text

echo -e "\n✅ Smoke test complete"
```

---

## Cost Check

Run this after testing to monitor spend:

```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE,Key=SERVICE \
  --query "ResultsByTime[0].Groups[?Metrics.BlendedCost.Amount>'0.00'].[Keys[0],Metrics.BlendedCost.Amount]" \
  --output table
```

**Expected daily cost for dev/test:** `< $0.50`  
**Watch out for:** OpenSearch Serverless (~$0.24/OCU-hr even when idle)

---

*Veda Learn — Testing Guide · Generated March 2026*
