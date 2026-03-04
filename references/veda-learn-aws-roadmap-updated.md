# Veda Learn — AWS Edition (Updated)
## Complete 4-Day Executable Build Plan

> **Key changes in this revision:**
> - ❌ **AWS Bedrock / Titan Embeddings removed** — your account has 0 quota (on-demand inference disabled). No approval path during a hackathon.
> - ✅ **Google Gemini `text-embedding-004`** replaces it — free tier, 1,500 req/day, 768-dim vectors. Get a key in 2 minutes at aistudio.google.com.
> - ✅ **Auth simplified** — GitHub OAuth + Lambda + JWT only. No AWS Cognito. No additional auth services.
> - Everything else stays the same.

---

## Stack Overview

| Layer | Previous Plan | This Build | Cost |
|-------|--------------|------------|------|
| AI Models | OpenRouter API | **OpenRouter API** (unchanged) | ~$8 total |
| Auth | GitHub OAuth + JWT | **GitHub OAuth + JWT** (simplified, Lambda only) | Free |
| Database | Amazon DynamoDB | **Amazon DynamoDB** (unchanged) | Free tier |
| Vector Store | OpenSearch Serverless | **OpenSearch Serverless** (unchanged) | ~$0.24/OCU-hr |
| Embeddings | ~~AWS Titan Embeddings V2~~ | **Google Gemini text-embedding-004** (FREE) | $0.00 |
| Backend Compute | AWS Lambda | **AWS Lambda** (unchanged) | Free tier |
| API Layer | API Gateway REST + WebSocket | **API Gateway REST + WebSocket** (unchanged) | Free tier |
| Real-Time Push | WebSocket API | **WebSocket API** (unchanged) | Free tier |
| Voice TTS | Amazon Polly Generative | **Amazon Polly Generative** (unchanged) | Free tier (5M chars) |
| File Storage | Amazon S3 | **Amazon S3** (unchanged) | Free tier |
| Rate Limiting | DynamoDB TTL items | **DynamoDB TTL items** (unchanged) | Free tier |

**Total AWS infra cost (4 days): ~$2–4. Total AI cost: ~$5–8. Gemini embeddings: $0. Grand total: ~$7–12.**

---

## Architecture Diagram

```
VS Code Extension (TypeScript)
         │
         │  HTTPS REST calls
         ▼
API Gateway (REST API)
         │
         ├──► POST /auth/github/callback  ──► Lambda: AuthHandler
         ├──► POST /api/analyze           ──► Lambda: AnalyzeHandler
         ├──► POST /api/lesson            ──► Lambda: LessonHandler
         ├──► POST /api/quiz              ──► Lambda: QuizHandler
         ├──► GET  /api/progress/{id}     ──► Lambda: ProgressHandler
         └──► POST /api/progress/update   ──► Lambda: ProgressUpdateHandler

API Gateway (WebSocket API)  ◄──── VS Code Extension (persistent WS)
         │
         ├──► $connect    ──► Lambda: WsConnectHandler  → DynamoDB (store connectionId)
         ├──► $disconnect ──► Lambda: WsDisconnectHandler → DynamoDB (remove connectionId)
         └──► Pushed FROM ──► LessonHandler calls ApiGatewayManagementApi → sends lesson JSON

AWS Services Used by Lambdas:
  ├── DynamoDB        → Users, Mistakes, Lessons, LearningProfiles, WsConnections, RateLimits
  ├── OpenSearch Serverless → concept_embeddings index (vector search)
  ├── Google Gemini text-embedding-004 → generate 768-dim vectors (FREE external API)
  ├── Amazon Polly    → synthesize lesson explanation → MP3
  ├── Amazon S3       → store Polly MP3 audio + concept seed docs
  └── OpenRouter API  → Haiku (classify) · Sonnet (lesson+fix) · Gemini Flash (diagram) · Opus (deep)
```

---

## Model Assignments via OpenRouter (Unchanged)

| Task | OpenRouter Model | Trigger | Why |
|------|-----------------|---------|-----|
| Pattern Detection | `anthropic/claude-haiku-4-5` | Auto · 30s debounce | Fastest, cheapest |
| Lesson Text | `anthropic/claude-sonnet-4-5` | Auto · on mistake | Best quality/speed |
| Code Fix | `anthropic/claude-sonnet-4-5` | Auto · parallel | Same batch as lesson |
| Deep Explanation | `anthropic/claude-opus-4-5` | Manual click only | High quality, low volume |
| Mermaid Diagram | `google/gemini-2.0-flash-001` | Auto · parallel | Cheapest structured output |
| Quiz MCQ | `anthropic/claude-haiku-4-5` | Auto · post-lesson | Fast JSON generation |

---

## AWS Services Setup (Hour 1 — Do This Before Any Code)

### 1. AWS Account + IAM Setup (15 min)

```bash
# Install AWS CLI
brew install awscli  # macOS
# or: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html

aws configure
# AWS Access Key ID: <from IAM console>
# AWS Secret Access Key: <from IAM console>
# Default region: us-east-1
# Default output format: json
```

**Create IAM Role `veda-lambda-role` with these policies:**
- `AmazonDynamoDBFullAccess`
- `AmazonPollyFullAccess`
- `AmazonS3FullAccess`
- `# AmazonBedrockFullAccess REMOVED - using Gemini free API instead`
- `AmazonOpenSearchServiceFullAccess`
- `AmazonAPIGatewayInvokeFullAccess`
- `CloudWatchLogsFullAccess`
- `AWSLambdaBasicExecutionRole`

> In IAM Console → Roles → Create Role → AWS Service → Lambda → attach above policies → name: `veda-lambda-role`

### 2. DynamoDB Tables (10 min)

Run this once via AWS CLI or CloudShell:

```bash
# Users table
aws dynamodb create-table \
  --table-name veda-users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Mistakes table
aws dynamodb create-table \
  --table-name veda-mistakes \
  --attribute-definitions \
    AttributeName=mistakeId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=mistakeId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName": "userId-index",
    "KeySchema": [{"AttributeName":"userId","KeyType":"HASH"}],
    "Projection": {"ProjectionType":"ALL"}
  }]' \
  --billing-mode PAY_PER_REQUEST

# Lessons table
aws dynamodb create-table \
  --table-name veda-lessons \
  --attribute-definitions \
    AttributeName=lessonId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=lessonId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName": "userId-index",
    "KeySchema": [{"AttributeName":"userId","KeyType":"HASH"}],
    "Projection": {"ProjectionType":"ALL"}
  }]' \
  --billing-mode PAY_PER_REQUEST

# Learning profiles table
aws dynamodb create-table \
  --table-name veda-profiles \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=language,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=language,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# WebSocket connections table
aws dynamodb create-table \
  --table-name veda-ws-connections \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Rate limiter table (TTL-based, replaces Redis)
aws dynamodb create-table \
  --table-name veda-rate-limits \
  --attribute-definitions AttributeName=lockKey,AttributeType=S \
  --key-schema AttributeName=lockKey,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Enable TTL on rate-limits table
aws dynamodb update-time-to-live \
  --table-name veda-rate-limits \
  --time-to-live-specification "Enabled=true, AttributeName=ttl"
```

### 3. Amazon S3 Buckets (5 min)

```bash
# Audio bucket (Polly MP3 output)
aws s3api create-bucket \
  --bucket veda-learn-audio \
  --region us-east-1

# Concept docs bucket (RAG seed files)
aws s3api create-bucket \
  --bucket veda-learn-concepts \
  --region us-east-1

# Set CORS on audio bucket (for presigned URL playback in VS Code webview)
aws s3api put-bucket-cors \
  --bucket veda-learn-audio \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["*"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET"],
      "MaxAgeSeconds": 3000
    }]
  }'
```

### 4. OpenSearch Serverless Collection (10 min)

```bash
# Create encryption policy
aws opensearchserverless create-security-policy \
  --name veda-encryption \
  --type encryption \
  --policy '{"Rules":[{"Resource":["collection/veda-concepts"],"ResourceType":"collection"}],"AWSOwnedKey":true}'

# Create network policy (allow Lambda access)
aws opensearchserverless create-security-policy \
  --name veda-network \
  --type network \
  --policy '[{"Rules":[{"Resource":["collection/veda-concepts"],"ResourceType":"collection"},
    {"Resource":["collection/veda-concepts"],"ResourceType":"dashboard"}],
    "AllowFromPublic":true}]'

# Create data access policy (grant Lambda role access)
aws opensearchserverless create-access-policy \
  --name veda-access \
  --type data \
  --policy '[{"Description":"Lambda access","Rules":[
    {"Resource":["collection/veda-concepts"],"Permission":["aoss:*"],"ResourceType":"collection"},
    {"Resource":["index/veda-concepts/*"],"Permission":["aoss:*"],"ResourceType":"index"}],
    "Principal":["arn:aws:iam::034476915822:role/veda-lambda-role"]}]'

# Create collection
aws opensearchserverless create-collection \
  --name veda-concepts \
  --type VECTORSEARCH

# Note the collection endpoint from: aws opensearchserverless list-collections
# It looks like: https://xxxxxxxxxxxx.us-east-1.aoss.amazonaws.com
```

**Create the vector index (run after collection is ACTIVE ~2 min):**

```python
# seed/create_index.py — run once locally
import boto3, requests
from requests_aws4auth import AWS4Auth

OPENSEARCH_ENDPOINT = "https://xxxx.us-east-1.aoss.amazonaws.com"
INDEX_NAME = "concept-embeddings"

session = boto3.Session()
creds = session.get_credentials()
auth = AWS4Auth(creds.access_key, creds.secret_key, 'us-east-1', 'aoss', session_token=creds.token)

index_body = {
  "settings": {"index.knn": True},
  "mappings": {
    "properties": {
      "conceptId": {"type": "keyword"},
      "content":   {"type": "text"},
      "embedding": {"type": "knn_vector", "dimension": 768,
                    "method": {"name":"hnsw","engine":"faiss","space_type":"innerproduct"}}
    }
  }
}

r = requests.put(f"{OPENSEARCH_ENDPOINT}/{INDEX_NAME}", json=index_body, auth=auth)
print(r.status_code, r.json())
```

> **Note:** Google Gemini text-embedding-004 outputs **1024-dimensional** vectors. Set `dimension: 768` in the index.

### 5. Enable Bedrock Titan Embeddings (5 min)

```
AWS Console → Amazon Bedrock → Model access → Request access:
  ✅ Amazon Titan Text Embeddings V2  (model ID: google/text-embedding-004 (Gemini free API))
Access is instant — no approval wait.
```

### 6. Amazon Polly — No Setup Required
Polly is available immediately. The Lambda will call it directly via SDK.
Default voice: `Ruth` (Neural, en-US). Generative voices: `Matthew` or `Danielle`.

### 7. OpenRouter (5 min)

```
1. openrouter.ai → Sign Up
2. Add $10 credit (covers hackathon with buffer)
3. API Keys → Create key → name: "veda-learn-aws"
4. Copy key to .env: OPENROUTER_API_KEY=sk-or-v1-...
```

### 8. GitHub OAuth App (5 min)

```
github.com/settings/applications/new
  Application name: Veda Learn
  Homepage URL: https://YOUR_REST_API_ID.execute-api.us-east-1.amazonaws.com/prod
  Callback URL: https://YOUR_REST_API_ID.execute-api.us-east-1.amazonaws.com/prod/auth/github/callback
  Copy: GITHUB_CLIENT_ID=xxx  GITHUB_CLIENT_SECRET=xxx
```

### Full .env File

```bash
# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...

# GitHub OAuth
GITHUB_CLIENT_ID=xxxxx
GITHUB_CLIENT_SECRET=xxxxx
JWT_SECRET=generate-a-random-64-char-string-here

# AWS (auto-provided inside Lambda, needed for local dev)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx

# OpenSearch
OPENSEARCH_ENDPOINT=https://xxxxxxxxxxxx.us-east-1.aoss.amazonaws.com

# S3 Bucket Names
S3_AUDIO_BUCKET=veda-learn-audio
S3_CONCEPTS_BUCKET=veda-learn-concepts

# API Gateway WebSocket URL (fill after Day 1 Hour 3)
WS_API_ENDPOINT=https://xxxx.execute-api.us-east-1.amazonaws.com/prod
```

---

## Lambda Project Structure

```
veda-learn-api/
├── package.json
├── serverless.yml         ← deploy all Lambdas + API Gateway
├── .env
└── handlers/
    ├── auth.js            ← GitHub OAuth + JWT
    ├── analyze.js         ← Haiku classifier
    ├── lesson.js          ← Parallel lesson generation + Polly + S3
    ├── quiz.js            ← MCQ generator
    ├── progress.js        ← GET profile
    ├── progressUpdate.js  ← POST score + streak
    ├── wsConnect.js       ← WebSocket $connect
    ├── wsDisconnect.js    ← WebSocket $disconnect
    └── seed.js            ← One-time RAG seeder (Titan + OpenSearch)
└── lib/
    ├── openrouter.js      ← Universal OpenRouter call
    ├── dynamodb.js        ← DynamoDB helpers
    ├── opensearch.js      ← OpenSearch helpers
    ├── polly.js           ← Polly TTS + S3 upload
    └── rateLimit.js       ← DynamoDB TTL rate limiter
```

**Install dependencies:**

```bash
mkdir veda-learn-api && cd veda-learn-api
npm init -y
npm install \
  @aws-sdk/client-dynamodb \
  @aws-sdk/lib-dynamodb \
  @aws-sdk/client-polly \
  @aws-sdk/client-s3 \
  @aws-sdk/s3-request-presigner \
  @aws-sdk/client-bedrock-runtime \
  @opensearch-project/opensearch \
  aws4 \
  jsonwebtoken \
  axios \
  node-fetch

npm install --save-dev serverless serverless-offline
```

---

## Day 1 — Foundation (Hours 1–5)

**Goal: GitHub login works. One OpenRouter response streams to VS Code via WebSocket.**

### Hour 1 — All AWS Services Setup (60 min) ⚠️ CRITICAL FIRST
Complete all 8 service setups above. Do not write Lambda code until every resource is provisioned and every key is in `.env`.

---

### Hour 2 — Serverless Framework + API Gateway Config (60 min) ⚠️ CRITICAL

**serverless.yml:**

```yaml
service: veda-learn-api
frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  role: arn:aws:iam::034476915822:role/veda-lambda-role
  environment:
    OPENROUTER_API_KEY: ${env:OPENROUTER_API_KEY}
    GITHUB_CLIENT_ID: ${env:GITHUB_CLIENT_ID}
    GITHUB_CLIENT_SECRET: ${env:GITHUB_CLIENT_SECRET}
    JWT_SECRET: ${env:JWT_SECRET}
    OPENSEARCH_ENDPOINT: ${env:OPENSEARCH_ENDPOINT}
    S3_AUDIO_BUCKET: ${env:S3_AUDIO_BUCKET}
    WS_API_ENDPOINT: ${env:WS_API_ENDPOINT}

functions:
  # REST endpoints
  authCallback:
    handler: handlers/auth.callback
    events:
      - http: {path: auth/github/callback, method: get, cors: true}

  analyze:
    handler: handlers/analyze.handler
    timeout: 30
    events:
      - http: {path: api/analyze, method: post, cors: true}

  lesson:
    handler: handlers/lesson.handler
    timeout: 60       # Polly + 3 parallel OpenRouter calls
    events:
      - http: {path: api/lesson, method: post, cors: true}

  quiz:
    handler: handlers/quiz.handler
    timeout: 15
    events:
      - http: {path: api/quiz, method: post, cors: true}

  progressGet:
    handler: handlers/progress.get
    events:
      - http: {path: api/progress/{userId}, method: get, cors: true}

  progressUpdate:
    handler: handlers/progressUpdate.handler
    events:
      - http: {path: api/progress/update, method: post, cors: true}

  # WebSocket endpoints
  wsConnect:
    handler: handlers/wsConnect.handler
    events:
      - websocket: {route: $connect}

  wsDisconnect:
    handler: handlers/wsDisconnect.handler
    events:
      - websocket: {route: $disconnect}
```

**Deploy:**

```bash
npx serverless deploy
# Note both output URLs:
# REST API:      https://XXXX.execute-api.us-east-1.amazonaws.com/dev
# WebSocket API: wss://YYYY.execute-api.us-east-1.amazonaws.com/dev
```

---

### Hour 3 — GitHub OAuth + JWT (Lambda) (60 min) ⚠️ CRITICAL

**handlers/auth.js:**

```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

module.exports.callback = async (event) => {
  const { code } = event.queryStringParameters || {};
  if (!code) return { statusCode: 400, body: 'Missing code' };

  // Exchange code for GitHub access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    })
  });
  const { access_token } = await tokenRes.json();

  // Fetch GitHub user
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `token ${access_token}` }
  });
  const ghUser = await userRes.json();

  const userId = `gh_${ghUser.id}`;

  // Upsert user into DynamoDB
  await ddb.send(new PutCommand({
    TableName: 'veda-users',
    Item: {
      userId,
      githubId: String(ghUser.id),
      username: ghUser.login,
      email: ghUser.email || '',
      avatarUrl: ghUser.avatar_url,
      skillScore: 0,
      streakDays: 0,
      lastActive: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    },
    ConditionExpression: 'attribute_not_exists(userId)'   // don't overwrite existing
  })).catch(() => {});  // ignore ConditionalCheckFailedException (already exists)

  // Issue JWT
  const token = jwt.sign({ userId, username: ghUser.login }, process.env.JWT_SECRET, { expiresIn: '30d' });

  // Redirect to VS Code custom URI handler
  return {
    statusCode: 302,
    headers: { Location: `vscode://veda-learn.veda-learn/auth?token=${token}` }
  };
};
```

---

### Hour 4 — VS Code Extension Scaffold + WebSocket Auth (60 min)

```bash
npx --package yo --package generator-code -- yo code
# Choose: TypeScript extension → name: veda-learn
npm install ws @types/ws
```

**package.json contributes:**

```json
{
  "viewsContainers": {
    "activitybar": [{"id": "veda", "title": "Veda Learn", "icon": "$(mortar-board)"}]
  },
  "views": {
    "veda": [{"type": "webview", "id": "veda.sidebar", "name": "Veda Learn"}]
  },
  "uriHandler": true
}
```

**extension.ts — auth flow + WebSocket connection:**

```typescript
import * as vscode from 'vscode';

const REST_URL = 'https://XXXX.execute-api.us-east-1.amazonaws.com/dev';
const WS_URL  = 'wss://YYYY.execute-api.us-east-1.amazonaws.com/dev';

export function activate(context: vscode.ExtensionContext) {

  // 1. Handle OAuth redirect: veda://auth?token=xxx
  vscode.window.registerUriHandler({
    handleUri: async (uri: vscode.Uri) => {
      if (uri.path === '/auth') {
        const token = new URLSearchParams(uri.query).get('token');
        if (token) {
          await context.secrets.store('veda.jwt', token);
          vscode.window.showInformationMessage('✅ Veda Learn — Logged in!');
          openWebSocket(context, token);   // connect WebSocket after login
        }
      }
    }
  });

  // 2. On startup, if already logged in → reconnect WebSocket
  context.secrets.get('veda.jwt').then(token => {
    if (token) openWebSocket(context, token);
  });
}

function openWebSocket(context: vscode.ExtensionContext, token: string) {
  const WebSocket = require('ws');
  const ws = new WebSocket(`${WS_URL}?token=${token}`);

  ws.on('message', (data: Buffer) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'lesson') {
      // Push lesson data to webview
      VedaSidebar.currentPanel?.receiveLesson(msg.lesson);
    }
  });

  ws.on('close', () => setTimeout(() => openWebSocket(context, token), 5000));  // reconnect
}
```

---

### Hour 5 — First OpenRouter Call + WebSocket Push to Sidebar (60 min)

**lib/openrouter.js (used by all Lambda handlers):**

```javascript
const fetch = require('node-fetch');

async function callOpenRouter({ model, systemPrompt, userPrompt, maxTokens = 500 }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://veda-learn.app',
      'X-Title': 'Veda Learn'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt }
      ]
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

module.exports = { callOpenRouter };
```

**lib/websocket.js — push lesson from Lambda to VS Code:**

```javascript
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

async function pushToClient(userId, payload) {
  const { Item } = await ddb.send(new GetCommand({
    TableName: 'veda-ws-connections',
    Key: { userId }
  }));
  if (!Item?.connectionId) return; // user not connected

  const apigw = new ApiGatewayManagementApiClient({
    endpoint: process.env.WS_API_ENDPOINT.replace('wss://', 'https://')
  });

  await apigw.send(new PostToConnectionCommand({
    ConnectionId: Item.connectionId,
    Data: Buffer.from(JSON.stringify(payload))
  }));
}

module.exports = { pushToClient };
```

**handlers/wsConnect.js:**

```javascript
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const jwt = require('jsonwebtoken');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

module.exports.handler = async (event) => {
  const token = event.queryStringParameters?.token;
  try {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    await ddb.send(new PutCommand({
      TableName: 'veda-ws-connections',
      Item: { userId, connectionId: event.requestContext.connectionId }
    }));
    return { statusCode: 200, body: 'Connected' };
  } catch {
    return { statusCode: 401, body: 'Unauthorized' };
  }
};
```

**Day 1 Checkpoint:**
- [ ] All AWS resources provisioned (DynamoDB 6 tables, S3 2 buckets, OpenSearch collection ACTIVE)
- [ ] Bedrock Titan Embeddings model access granted
- [ ] Serverless deploy succeeds — REST + WebSocket URLs in hand
- [ ] GitHub OAuth login works end-to-end
- [ ] JWT stored in VS Code SecretStorage
- [ ] WebSocket connects from extension to API Gateway
- [ ] One OpenRouter response visible in sidebar

---

## Day 2 — Intelligence (Hours 6–10)

**Goal: Write bad Python → Veda detects → 3-panel lesson renders with diagram via WebSocket.**

### Hour 6 — Passive Watcher + 30s Debounce (60 min) ⚠️ CRITICAL

```typescript
// extension.ts — inside activate()
const debounceMap = new Map<string, NodeJS.Timeout>();

vscode.workspace.onDidChangeTextDocument(event => {
  const uri = event.document.uri.toString();
  clearTimeout(debounceMap.get(uri));

  const timer = setTimeout(async () => {
    debounceMap.delete(uri);
    const jwt = await context.secrets.get('veda.jwt');
    if (!jwt) return;

    const payload = {
      fileContent: event.document.getText(),
      language: event.document.languageId,
      fileName: event.document.fileName,
      cursorLine: vscode.window.activeTextEditor?.selection.active.line,
      diagnostics: vscode.languages.getDiagnostics(event.document.uri)
        .map(d => ({ message: d.message, severity: d.severity, line: d.range.start.line }))
    };

    await fetch(`${REST_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
      body: JSON.stringify(payload)
    });
  }, 30000);  // 30 second debounce

  debounceMap.set(uri, timer);
});

// Status bar
const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
statusBar.text = '$(eye) Veda watching...';
statusBar.show();
```

---

### Hour 7 — Haiku Classifier Lambda + DynamoDB Rate Lock (60 min) ⚠️ CRITICAL

**lib/rateLimit.js:**

```javascript
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

async function checkRateLimit(userId) {
  const lockKey = `lesson-lock:${userId}`;
  const ttl = Math.floor(Date.now() / 1000) + 30;  // 30 second TTL

  try {
    await ddb.send(new PutCommand({
      TableName: 'veda-rate-limits',
      Item: { lockKey, userId, ttl },
      ConditionExpression: 'attribute_not_exists(lockKey)'  // fails if lock exists
    }));
    return false;  // no lock → proceed
  } catch {
    return true;   // lock exists → skip
  }
}

module.exports = { checkRateLimit };
```

**handlers/analyze.js:**

```javascript
const { callOpenRouter } = require('../lib/openrouter');
const { checkRateLimit } = require('../lib/rateLimit');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { generateLesson } = require('./lesson');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

module.exports.handler = async (event) => {
  const token = event.headers?.Authorization?.replace('Bearer ', '');
  let userId;
  try { ({ userId } = jwt.verify(token, process.env.JWT_SECRET)); }
  catch { return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }; }

  const { fileContent, language, cursorLine } = JSON.parse(event.body);

  // DynamoDB TTL rate limit check
  const locked = await checkRateLimit(userId);
  if (locked) return { statusCode: 200, body: JSON.stringify({ teach: false, reason: 'cooldown' }) };

  // Haiku classifier
  const result = await callOpenRouter({
    model: 'anthropic/claude-haiku-4-5',
    systemPrompt: 'You are a code quality analyzer. Respond ONLY with valid JSON, no other text.',
    userPrompt: `Analyze this ${language} code. Return ONLY:
{"isMistake":bool,"confidence":0.0-1.0,"mistakeType":"antipattern"|"bug"|"security"|"performance"|"style",
"conceptId":"mutable-default"|"callback-hell"|"any-type"|"null-ref"|"n-plus-one"|"sql-injection"|"memory-leak"|"dry-violation",
"severity":"low"|"medium"|"high","problematicCode":"the bad line","lineNumber":number}
Only flag if confidence>=0.85. Code:\n${fileContent.slice(0, 3000)}`,
    maxTokens: 256
  });

  const parsed = JSON.parse(result);
  if (!parsed.isMistake || parsed.confidence < 0.85)
    return { statusCode: 200, body: JSON.stringify({ teach: false }) };

  // Save mistake to DynamoDB
  const mistakeId = uuidv4();
  await ddb.send(new PutCommand({
    TableName: 'veda-mistakes',
    Item: {
      mistakeId, userId, language, cursorLine,
      ...parsed,
      createdAt: new Date().toISOString()
    }
  }));

  // Trigger lesson generation async (do NOT await — return fast to VS Code)
  generateLesson(userId, mistakeId, parsed).catch(console.error);

  return { statusCode: 200, body: JSON.stringify({ teach: true, mistakeId }) };
};
```

---

### Hour 8 — Lesson Generator (3 Parallel OpenRouter + Polly TTS + S3) (60 min) ⚠️ CRITICAL

**lib/polly.js — TTS + S3 presigned URL:**

```javascript
const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const polly = new PollyClient({ region: 'us-east-1' });
const s3    = new S3Client({ region: 'us-east-1' });

async function synthesizeAndStore(text, lessonId) {
  // Call Amazon Polly with Generative Engine (highest naturalness)
  const cmd = new SynthesizeSpeechCommand({
    Text: text,
    OutputFormat: 'mp3',
    VoiceId: 'Ruth',         // Generative neural voice
    Engine: 'generative',    // Amazon Polly Generative TTS
    LanguageCode: 'en-US'
  });

  const { AudioStream } = await polly.send(cmd);

  // Collect audio bytes
  const chunks = [];
  for await (const chunk of AudioStream) chunks.push(chunk);
  const audioBuffer = Buffer.concat(chunks);

  // Upload to S3
  const s3Key = `lessons/${lessonId}.mp3`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_AUDIO_BUCKET,
    Key: s3Key,
    Body: audioBuffer,
    ContentType: 'audio/mpeg'
  }));

  // Return presigned URL (valid 1 hour — enough for lesson delivery)
  const presignedUrl = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: process.env.S3_AUDIO_BUCKET,
    Key: s3Key
  }), { expiresIn: 3600 });

  return presignedUrl;
}

module.exports = { synthesizeAndStore };
```

**handlers/lesson.js:**

```javascript
const { callOpenRouter } = require('../lib/openrouter');
const { synthesizeAndStore } = require('../lib/polly');
const { pushToClient } = require('../lib/websocket');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

async function generateLesson(userId, mistakeId, mistake) {
  const { conceptId, problematicCode, language } = mistake;
  const lessonId = uuidv4();

  // 3 parallel OpenRouter calls (same as OpenRouter edition)
  const [explanation, fix, diagram] = await Promise.all([

    callOpenRouter({
      model: 'anthropic/claude-sonnet-4-5',
      systemPrompt: 'Write for voice reading. No markdown. Conversational. Under 120 words.',
      userPrompt: `Explain why the ${conceptId} pattern is problematic in ${language}.
Start with: "Here is what is happening in your code:"`,
      maxTokens: 200
    }),

    callOpenRouter({
      model: 'anthropic/claude-sonnet-4-5',
      systemPrompt: 'Return ONLY valid JSON. No other text.',
      userPrompt: `Fix this ${language} code.
Return: {"before":"original code","after":"fixed code","comment":"one line explanation"}
Code: ${problematicCode}`,
      maxTokens: 400
    }),

    callOpenRouter({
      model: 'google/gemini-2.0-flash-001',
      systemPrompt: 'Return ONLY valid Mermaid.js syntax. No explanation, no code fences.',
      userPrompt: `Create a simple flowchart TD diagram for concept: ${conceptId}.
Show the wrong approach leading to a problem, and the correct approach.
Use only basic nodes and arrows. No subgraphs.`,
      maxTokens: 300
    })
  ]);

  // Parse code fix JSON
  let fixParsed = { before: problematicCode, after: '', comment: '' };
  try { fixParsed = JSON.parse(fix); } catch(_) {}

  // Amazon Polly TTS → S3 → presigned URL
  // Run in parallel with DynamoDB write
  const [audioUrl] = await Promise.all([
    synthesizeAndStore(explanation, lessonId),

    ddb.send(new PutCommand({
      TableName: 'veda-lessons',
      Item: {
        lessonId, userId, mistakeId, conceptId,
        explanation,
        codeBefore: fixParsed.before,
        codeAfter:  fixParsed.after,
        codeComment: fixParsed.comment,
        diagramSyntax: diagram,
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    }))
  ]);

  // Push complete lesson + audio URL to VS Code via WebSocket
  await pushToClient(userId, {
    type:    'lesson',
    lesson:  {
      lessonId, conceptId,
      explanation,
      codeBefore:    fixParsed.before,
      codeAfter:     fixParsed.after,
      codeComment:   fixParsed.comment,
      diagramSyntax: diagram,
      audioUrl       // ← presigned S3 URL for Polly MP3
    }
  });
}

module.exports = { generateLesson };
module.exports.handler = async (event) => {
  // Direct REST fallback if WebSocket not available
  const { userId, mistakeId, mistake } = JSON.parse(event.body);
  await generateLesson(userId, mistakeId, mistake);
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
```

---

### Hour 9 — 3-Panel Sidebar UI + Amazon Polly Audio Playback (60 min)

Webview HTML (CDN imports — no bundler):

```html
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<link  rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>
```

**3 panels (CSS slide-in staggered 0ms / 150ms / 300ms):**
- Panel 1: Explanation text with typewriter effect + mistake badge (🔴🟡🟠🔵)
- Panel 2: Before/After code diff with highlight.js syntax coloring
- Panel 3: `mermaid.render('veda-diagram', diagramSyntax)` in try/catch

**Amazon Polly audio playback (replaces Web Speech API):**

```javascript
// Webview JS — plays Polly MP3 from presigned S3 URL
let currentAudio = null;

function playPollyAudio(audioUrl) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  currentAudio = new Audio(audioUrl);    // presigned S3 URL
  currentAudio.playbackRate = 0.95;      // slightly slower for clarity
  currentAudio.play().catch(console.error);
}

// Replay + mute buttons
document.getElementById('btn-replay').onclick = () => {
  if (currentLesson?.audioUrl) playPollyAudio(currentLesson.audioUrl);
};
document.getElementById('btn-mute').onclick = () => {
  if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
};

// Auto-play when lesson arrives via WebSocket
window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'lesson') {
    currentLesson = msg.lesson;
    renderLesson(msg.lesson);
    playPollyAudio(msg.lesson.audioUrl);  // Amazon Polly audio auto-plays
  }
});
```

---

### Hour 10 — Integration Test (60 min)

Test these 3 bugs in order:
1. Python: `def add(item, cart=[]):` → mutable default
2. JavaScript: 3-level nested callbacks → callback-hell
3. TypeScript: `const x: any = ...` → any-type abuse

Fix any failures. Check CloudWatch Logs for each Lambda. Verify:
- WebSocket pushes lesson JSON
- Polly audio presigned URL resolves in browser
- All 3 panels render

**Day 2 Checkpoint:**
- [ ] Passive watcher fires after 30s
- [ ] Haiku classifies in < 3s
- [ ] DynamoDB rate lock prevents duplicate lessons
- [ ] 3 parallel OpenRouter calls complete
- [ ] Amazon Polly generates MP3 audio
- [ ] MP3 stored in S3 + presigned URL returned
- [ ] WebSocket pushes lesson to VS Code (not SSE)
- [ ] All 3 panels render (explanation + code diff + diagram)
- [ ] Polly audio auto-plays

---

## Day 3 — Depth (Hours 11–15)

**Goal: RAG from OpenSearch. Progress streak. Quiz fires. Rate limiting solid.**

### Hour 11 — Titan Embeddings + OpenSearch RAG Seeder (60 min) ⚠️ CRITICAL

**handlers/seed.js — run once locally:**

```javascript
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { Client } = require('@opensearch-project/opensearch');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

const osClient = new Client({
  ...AwsSigv4Signer({ region: 'us-east-1', service: 'aoss', getCredentials: defaultProvider() }),
  node: process.env.OPENSEARCH_ENDPOINT
});

async function getTitanEmbedding(text) {
  const cmd = new InvokeModelCommand({
    modelId: 'google/text-embedding-004 (Gemini free API)',
    body: JSON.stringify({ inputText: text, dimensions: 768, normalize: true }),
    contentType: 'application/json',
    accept: 'application/json'
  });
  const res = await bedrock.send(cmd);
  const { embedding } = JSON.parse(Buffer.from(res.body).toString('utf-8'));
  return embedding;
}

const concepts = [
  { id: 'mutable-default',   content: 'In Python, default argument values are evaluated only once when the function is defined, not each time it is called. Using a mutable default like a list or dict means all calls share the same object, causing unexpected state accumulation.' },
  { id: 'callback-hell',     content: 'Callback hell occurs when multiple asynchronous operations are nested inside each other as callbacks, creating a deeply indented pyramid structure that is hard to read, debug, and maintain. Async/await flattens this structure.' },
  { id: 'any-type',          content: 'Using the any type in TypeScript disables type checking for that variable entirely. This defeats the purpose of TypeScript and can hide runtime errors that strict types would catch at compile time.' },
  { id: 'null-ref',          content: 'Null reference errors occur when you access properties or call methods on a value that is null or undefined. Optional chaining and null checks prevent these runtime crashes.' },
  { id: 'n-plus-one',        content: 'The N+1 query problem happens when code executes one database query to fetch a list and then N additional queries for each item in that list. Eager loading or batch queries solve this in O(1) round trips.' },
  { id: 'sql-injection',     content: 'SQL injection occurs when user input is concatenated directly into a SQL query string. An attacker can terminate the query and inject malicious SQL. Parameterized queries and prepared statements prevent this.' },
  { id: 'memory-leak',       content: 'Memory leaks in JavaScript occur when references to objects are kept alive unintentionally, preventing garbage collection. Common causes include event listeners not removed, closures retaining large objects, and detached DOM nodes.' },
  { id: 'dry-violation',     content: 'DRY (Do Not Repeat Yourself) violations occur when the same logic is duplicated in multiple places. When that logic needs to change, every copy must be updated, increasing bug risk. Extract shared logic into a function or module.' },
  { id: 'god-object',        content: 'A God Object is a class or module that knows too much or does too much. It accumulates responsibilities that should be spread across multiple focused classes, making the code hard to test and change.' },
  { id: 'missing-usememo',   content: 'In React, a component re-renders whenever its parent renders. Expensive calculations inside the component body run on every render. useMemo memoizes the result and recalculates only when dependencies change.' },
];

async function seedAll() {
  for (const concept of concepts) {
    const embedding = await getTitanEmbedding(concept.content);
    await osClient.index({
      index: 'concept-embeddings',
      body: { conceptId: concept.id, content: concept.content, embedding }
    });
    console.log(`✅ Seeded: ${concept.id}`);
  }
}

seedAll();
```

**lib/opensearch.js — RAG query helper:**

```javascript
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { Client } = require('@opensearch-project/opensearch');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');

const bedrock  = new BedrockRuntimeClient({ region: 'us-east-1' });
const osClient = new Client({
  ...AwsSigv4Signer({ region: 'us-east-1', service: 'aoss', getCredentials: defaultProvider() }),
  node: process.env.OPENSEARCH_ENDPOINT
});

async function ragQuery(conceptId) {
  // Embed the query with Titan
  const cmd = new InvokeModelCommand({
    modelId: 'google/text-embedding-004 (Gemini free API)',
    body: JSON.stringify({ inputText: `Explain the concept: ${conceptId}`, dimensions: 768, normalize: true }),
    contentType: 'application/json', accept: 'application/json'
  });
  const res = await bedrock.send(cmd);
  const { embedding } = JSON.parse(Buffer.from(res.body).toString('utf-8'));

  // k-NN search in OpenSearch Serverless
  const { body } = await osClient.search({
    index: 'concept-embeddings',
    body: {
      size: 3,
      query: { knn: { embedding: { vector: embedding, k: 3 } } }
    }
  });

  return body.hits.hits.map(h => h._source.content).join('\n\n');
}

module.exports = { ragQuery };
```

**Update handlers/lesson.js — prepend RAG context to Sonnet system prompt:**

```javascript
const { ragQuery } = require('../lib/opensearch');

// Inside generateLesson(), before the 3 parallel calls:
const ragContext = await ragQuery(conceptId);

// Pass ragContext into the explanation call:
systemPrompt: `Write for voice reading. No markdown. Conversational. Under 120 words.
Reference this background knowledge where relevant:\n${ragContext}`,
```

---

### Hour 12 — Progress Tracker + Streak Counter (DynamoDB) (60 min)

**handlers/progressUpdate.js:**

```javascript
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const jwt = require('jsonwebtoken');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

module.exports.handler = async (event) => {
  const token = event.headers?.Authorization?.replace('Bearer ', '');
  let userId;
  try { ({ userId } = jwt.verify(token, process.env.JWT_SECRET)); }
  catch { return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }; }

  const { lessonId, rating, quizPassed, conceptId, language } = JSON.parse(event.body);

  // Mark lesson completed in DynamoDB
  await ddb.send(new UpdateCommand({
    TableName: 'veda-lessons',
    Key: { lessonId },
    UpdateExpression: 'SET #s = :s, feedbackRating = :r',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': 'completed', ':r': rating }
  }));

  // Fetch user for streak calculation
  const { Item: user } = await ddb.send(new GetCommand({
    TableName: 'veda-users',
    Key: { userId }
  }));

  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let newStreak = user.streakDays || 0;
  if (user.lastActive === yesterday) newStreak += 1;
  else if (user.lastActive !== today) newStreak = 1;

  const scoreGain = quizPassed ? 3 : 1;

  await ddb.send(new UpdateCommand({
    TableName: 'veda-users',
    Key: { userId },
    UpdateExpression: 'SET skillScore = :s, streakDays = :d, lastActive = :a',
    ExpressionAttributeValues: {
      ':s': Math.min(100, (user.skillScore || 0) + scoreGain),
      ':d': newStreak,
      ':a': today
    }
  }));

  // Upsert learning profile (language-specific)
  await ddb.send(new UpdateCommand({
    TableName: 'veda-profiles',
    Key: { userId, language },
    UpdateExpression: 'ADD lessonsCompleted :one SET updatedAt = :now',
    ExpressionAttributeValues: { ':one': 1, ':now': new Date().toISOString() }
  }));

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
```

**Webview Progress tab:** circular SVG skill score + 🔥 streak number + top 3 weakness pills.

---

### Hour 13 — Quiz Engine (Lambda + DynamoDB) (60 min)

**handlers/quiz.js:**

```javascript
const { callOpenRouter } = require('../lib/openrouter');
const jwt = require('jsonwebtoken');

module.exports.handler = async (event) => {
  const token = event.headers?.Authorization?.replace('Bearer ', '');
  let userId;
  try { ({ userId } = jwt.verify(token, process.env.JWT_SECRET)); }
  catch { return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }; }

  const { conceptId, language } = JSON.parse(event.body);

  const result = await callOpenRouter({
    model: 'anthropic/claude-haiku-4-5',
    systemPrompt: 'Return ONLY a JSON array. No other text. No code fences.',
    userPrompt: `Generate 2 multiple-choice questions testing: ${conceptId} in ${language}.
Format: [{"question":"...","options":["A: ...","B: ...","C: ...","D: ..."],"correct":"A","explanation":"one sentence"}]`,
    maxTokens: 400
  });

  const quiz = JSON.parse(result);
  return { statusCode: 200, body: JSON.stringify({ quiz }) };
};
```

**Webview quiz flow:**
- Quiz card renders 30s after "Got it ✓" is clicked
- 4 option buttons — click to reveal correct (green) / wrong (red)
- On correct: `confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })`
- Call POST /api/progress/update with `quizPassed: true`

---

### Hour 14 — Deep Dive Mode (Opus via OpenRouter + Polly) (60 min)

The deep dive is triggered **only by manual click** — never automatic.

```javascript
// POST /api/lesson/deep  (add to serverless.yml)
module.exports.deepHandler = async (event) => {
  const { conceptId, language, problematicCode } = JSON.parse(event.body);
  const lessonId = uuidv4();

  const explanation = await callOpenRouter({
    model: 'anthropic/claude-opus-4-5',
    systemPrompt: 'You are an expert engineering mentor. Write clearly for voice reading. No markdown. Under 300 words.',
    userPrompt: `Give a deep dive explanation of the ${conceptId} pattern in ${language}.
Cover: what it is, why it exists, how it harms production code, real-world examples, and the corrected approach.
Code context: ${problematicCode}`,
    maxTokens: 600
  });

  // Polly TTS for deep explanation (same flow)
  const audioUrl = await synthesizeAndStore(explanation, `deep-${lessonId}`);

  // Push via WebSocket
  await pushToClient(userId, { type: 'deep-lesson', explanation, audioUrl, lessonId });

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
```

**Webview button:** "Deep Dive 🔍" — visible on every lesson card, sends manual request.

---

### Hour 15 — Rate Limiting Hardening + Error Handling (60 min)

**Per-minute API rate limit via DynamoDB:**

```javascript
// lib/rateLimit.js — add minute-level rate limit check
async function checkMinuteRateLimit(userId) {
  const minuteKey = `rate:${userId}:${Math.floor(Date.now() / 60000)}`;
  const ttl = Math.floor(Date.now() / 1000) + 65;

  try {
    // Try to create the counter entry
    await ddb.send(new PutCommand({
      TableName: 'veda-rate-limits',
      Item: { lockKey: minuteKey, count: 1, userId, ttl },
      ConditionExpression: 'attribute_not_exists(lockKey)'
    }));
    return false; // first request this minute
  } catch {
    // Counter exists — increment and check
    const result = await ddb.send(new UpdateCommand({
      TableName: 'veda-rate-limits',
      Key: { lockKey: minuteKey },
      UpdateExpression: 'ADD #c :one',
      ExpressionAttributeNames: { '#c': 'count' },
      ExpressionAttributeValues: { ':one': 1 },
      ReturnValues: 'UPDATED_NEW'
    }));
    return result.Attributes.count > 20;  // block over 20/min
  }
}
```

**OpenRouter error handling (backup model):**

```javascript
async function callOpenRouterWithFallback(params) {
  try {
    return await callOpenRouter(params);
  } catch (err) {
    if (err.message?.includes('429') || err.message?.includes('rate')) {
      // Fallback to GPT-4o-mini via OpenRouter
      return await callOpenRouter({ ...params, model: 'openai/gpt-4o-mini' });
    }
    throw err;
  }
}
```

**Polly error fallback:**

```javascript
// If Polly fails, return null audioUrl — webview falls back to Web Speech API
async function synthesizeAndStoreSafe(text, lessonId) {
  try {
    return await synthesizeAndStore(text, lessonId);
  } catch (err) {
    console.error('Polly failed, using browser TTS fallback:', err.message);
    return null;  // webview detects null → uses window.speechSynthesis
  }
}
```

**Day 3 Checkpoint:**
- [ ] 10 concept docs seeded into OpenSearch Serverless via Titan Embeddings
- [ ] RAG context prepended to Sonnet lesson prompt
- [ ] Progress tab shows streak 🔥 + skill score
- [ ] Quiz fires 30s after "Got it ✓"
- [ ] Confetti on correct quiz answer
- [ ] Deep Dive button triggers Opus + fresh Polly audio
- [ ] Per-minute rate limit prevents credit drain
- [ ] Polly fallback to Web Speech API if Polly errors

---

## Day 4 — Victory (Hours 16–20)

**Goal: Flawless 3-min demo. 10-slide deck. Backup video. Submitted.**

### Hour 16 — Demo Path Hardening (60 min) ⚠️ CRITICAL

- Add demo mode: reduce debounce to 5s when `VEDA_DEMO_MODE=true`
- Pre-load the Python mutable default bug — don't type from scratch on stage
- Warm the Lambda functions (invoke once before the demo — cold starts add ~1s)
- Run the full flow **5 times in a row** — all 5 must complete without a crash
- Test on the exact device + network you'll use for demo

**Lambda warm-up:**

```bash
# Invoke each Lambda once 5 min before demo to eliminate cold starts
aws lambda invoke --function-name veda-learn-api-dev-analyze /dev/null
aws lambda invoke --function-name veda-learn-api-dev-lesson  /dev/null
aws lambda invoke --function-name veda-learn-api-dev-quiz    /dev/null
```

---

### Hour 17 — UI Polish (60 min)

- Veda logo SVG in sidebar header (brain + graduation cap, 2 colors)
- Pulsing "Veda is watching..." heartbeat animation on status bar
- Staggered panel slide-in animations (0ms / 150ms / 300ms)
- Color-coded mistake badges: 🔴 Security · 🟡 Performance · 🟠 Anti-pattern · 🔵 Style
- Skill score number counts up on Progress tab load (CSS counter animation)
- Audio waveform animation while Polly audio plays (CSS bars, no library needed)

---

### Hour 18 — 10-Slide Pitch Deck (60 min)

| Slide | Content |
|-------|---------|
| 1 | **Hook** — "84% of devs use AI. Junior employment -20%. AI is making devs weaker." |
| 2 | **Problem** — MIT cognitive debt study. No AI tool teaches *why*. |
| 3 | **Insight** — "Every other AI tool is your employee. Veda Learn is your professor." |
| 4 | **Product** — Screenshot of 3-panel lesson UI. Let the product speak. |
| 5 | **How It Works** — 3 steps: You code → Veda detects → Veda teaches. |
| 6 | **Tech Stack** — OpenRouter + AWS Lambda + API Gateway (WebSocket) + DynamoDB + OpenSearch + Polly + S3 + Titan |
| 7 | **LIVE DEMO** — Two words. Switch to VS Code. |
| 8 | **Roadmap** — Built vs Coming Soon (Team Mode, Cognitive Debt Score, Interview Prep) |
| 9 | **Market** — 27M developers. Gartner: 80% need AI upskilling by 2027. |
| 10 | **Team + Ask** — Who you are. What you want from judges. |

---

### Hour 19 — Backup Demo Video (60 min) ⚠️ NEVER SKIP THIS

1. Record with OBS Studio or Loom at 1080p
2. Exact flow: Login → Open Python file → Type bug → Wait → Lesson slides in → **Polly voice plays** → Quiz → Confetti → Score updates
3. Edit to **2 min 30 sec** max. Add text captions
4. Upload to **YouTube (unlisted)** AND **Google Drive** (two separate links)
5. Test playback on a different device before moving on

---

### Hour 20 — GitHub README + Pitch Rehearsal + Submit (60 min)

**README must include:**
- Problem statement (2 sentences)
- Demo GIF (record with LICEcap — free tool)
- Setup instructions (5 steps)
- Architecture diagram (copy from this doc)
- Tech stack badges

**Pitch rehearsal:**
- Say it out loud 3 times — not in your head, out loud
- Time yourself — must be under 3 minutes
- Prepare 3 judge answers:
  - "vs GitHub Copilot?" → "Copilot fixes. Veda teaches. Completely different intent."
  - "Why AWS?" → "Production-grade voice (Polly Generative), semantic search (OpenSearch), serverless scale (Lambda + API Gateway WebSocket). Built to last beyond the hackathon."
  - "False positives?" → "0.85 confidence threshold. User can skip any lesson instantly."

**Day 4 Checkpoint:**
- [ ] Demo runs 5/5 without crash
- [ ] Lambdas warmed up before demo
- [ ] Polly audio plays cleanly in demo
- [ ] Backup video on YouTube + Drive
- [ ] 10-slide deck complete
- [ ] README with demo GIF on GitHub
- [ ] Pitch rehearsed 3x out loud
- [ ] Hackathon submission form completed

---

## 4-Day Cost Estimate

| Item | Rate | Est. Usage | Est. Cost |
|------|------|------------|-----------|
| claude-haiku-4-5 (classifier + quiz) | $0.80/1M in | ~2M tokens | ~$1.80 |
| claude-sonnet-4-5 (lessons + code fix) | $3.00/1M in | ~500K tokens | ~$2.25 |
| google/gemini-2.0-flash (diagrams) | $0.10/1M in | ~300K tokens | ~$0.10 |
| claude-opus-4-5 (deep, manual only) | $15/1M in | ~50K tokens | ~$0.75 |
| AWS Lambda | Free tier (1M req/mo) | ~1K calls | $0.00 |
| API Gateway REST | Free tier (1M calls/mo) | ~1K calls | $0.00 |
| API Gateway WebSocket | $1.14/M msgs | ~5K msgs | ~$0.01 |
| Amazon DynamoDB | Free tier (25 GB) | ~1 MB | $0.00 |
| Amazon S3 | Free tier (5 GB) | ~50 MB audio | $0.00 |
| Amazon Polly Generative | $0.030/1K chars | ~50K chars | ~$1.50 |
| Google Gemini Embeddings (text-embedding-004) | Free (1500 req/day) | ~1K embeds | $0.00 |
| OpenSearch Serverless | $0.24/OCU-hr | ~10 hrs | ~$2.40 |
| **TOTAL** | | | **~$8–13** |

> **OpenSearch Serverless is the main AWS cost.** It bills per OCU-hour even when idle. Delete or pause the collection after the hackathon to stop billing.

---

## 3-Minute Demo Script

| Timestamp | Action | Words |
|-----------|--------|-------|
| 0:00–0:25 | Show sidebar with avatar, score 74, streak 4 days | "I've been using Veda for 4 days. Here's what I've learned." |
| 0:25–1:00 | Type Python mutable default bug. Pause. | "This looks completely fine to most developers." — let silence build |
| 1:00–1:45 | Lesson slides in. **Polly voice plays.** | Point to 3 panels. Let Polly play **fully** — don't talk over it. |
| 1:45–2:05 | Click "Got it ✓" → Quiz → Confetti | "Veda verified I understood it — not just read it." |
| 2:05–2:30 | Show progress score tick up | "Without Veda, Copilot would've fixed this silently. I'd make this mistake again next week." |
| 2:30–3:00 | Return to slides, show roadmap | "Every other AI tool races to replace the developer. Veda Learn builds the developer." |

---

## 60-Second Pitch

> "84% of developers use AI tools every day. But junior employment has dropped 20% in three years. MIT research shows AI creates cognitive debt — developers get faster but measurably weaker. Veda Learn watches you code and teaches you, not for you. Amazon Polly reads the lesson in a natural voice while you keep your eyes on your code. OpenSearch finds the right knowledge context. Lambda scales to every developer on the team. A quiz confirms it stuck. One OpenRouter key powers the intelligence. One VS Code extension changes how you grow. AI that makes you a better developer — not just a faster one."

---

*Veda Learn — AWS Edition | 4 Days · 20 Hours · Full AWS Stack · OpenRouter Intelligence · Build to Win*

---

## ⚠️ Embedding Replacement Guide (Titan → Gemini)

Your AWS account has **zero quota** for Titan Embeddings V2 on-demand inference. This section replaces all Bedrock/Titan embedding code with the **free Google Gemini API**.

### Install the Gemini SDK

```bash
cd veda-learn-api
npm install @google/generative-ai
```

### lib/geminiEmbed.js — Drop-in Replacement

```javascript
// lib/geminiEmbed.js
// Replaces ALL Bedrock/Titan embedding code.
// Free tier: 1,500 requests/day, 1,500,000 tokens/day
// Output: 768-dimensional float array (innerproduct similarity)

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genai.getGenerativeModel({ model: 'text-embedding-004' });

async function getEmbedding(text) {
  const result = await model.embedContent(text);
  return result.embedding.values; // float32[] of length 768
}

module.exports = { getEmbedding };
```

### Updated RAG Seeder (seed.js) — No Bedrock Required

```javascript
// handlers/seed.js — run once locally: node handlers/seed.js
require('dotenv').config();
const { getEmbedding } = require('../lib/geminiEmbed');
const { Client }       = require('@opensearch-project/opensearch');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');

const osClient = new Client({
  ...AwsSigv4Signer({ region: 'us-east-1', service: 'aoss', getCredentials: defaultProvider() }),
  node: process.env.OPENSEARCH_ENDPOINT
});

const concepts = [
  { id: 'mutable-default',  content: 'In Python, default argument values are evaluated only once when the function is defined, not each time it is called. Using a mutable default like a list or dict means all calls share the same object, causing unexpected state accumulation across invocations.' },
  { id: 'callback-hell',    content: 'Callback hell occurs when multiple asynchronous operations are nested as callbacks, creating a deeply indented pyramid structure. Each level of nesting makes error handling and debugging harder. Async/await and Promises flatten this into readable sequential code.' },
  { id: 'any-type',         content: 'Using the any type in TypeScript disables all type checking for that variable. This defeats the purpose of TypeScript entirely, hides runtime errors that strict typing would catch at compile time, and makes refactoring dangerous.' },
  { id: 'null-ref',         content: 'Null reference errors crash programs when code accesses a property or calls a method on a null or undefined value. Optional chaining (?.), nullish coalescing (??), and explicit null checks prevent these runtime errors.' },
  { id: 'n-plus-one',       content: 'The N+1 query problem occurs when code fetches a list with one query and then runs N additional queries for each item. This creates O(N) database round trips. Eager loading, batch queries, or JOIN operations solve this in a constant number of queries.' },
  { id: 'sql-injection',    content: 'SQL injection occurs when user input is concatenated directly into a SQL query string. An attacker can close the query and inject malicious SQL commands. Parameterized queries and prepared statements prevent this by treating input as data, never as executable code.' },
  { id: 'memory-leak',      content: 'Memory leaks in JavaScript happen when references to objects are kept alive unintentionally, preventing garbage collection. Common causes: event listeners not removed after use, closures holding references to large objects, and detached DOM nodes referenced by JavaScript.' },
  { id: 'dry-violation',    content: 'DRY (Do Not Repeat Yourself) violations copy the same logic into multiple places. When that logic changes, every copy must be updated or bugs appear. Extract shared logic into a reusable function, class, or module with a single source of truth.' },
  { id: 'god-object',       content: 'A God Object is a class that knows too much or does too much, violating the Single Responsibility Principle. It accumulates unrelated responsibilities, making it hard to test, change, or reason about. Refactor by extracting focused, cohesive classes.' },
  { id: 'missing-usememo',  content: 'In React, components re-render whenever their parent renders. Expensive calculations in the component body run on every render. useMemo memoizes the result and only recalculates when its declared dependencies change, preventing unnecessary computation.' },
];

async function seedAll() {
  for (const concept of concepts) {
    const embedding = await getEmbedding(concept.content);
    await osClient.index({
      index: 'concept-embeddings',
      body:  { conceptId: concept.id, content: concept.content, embedding }
    });
    console.log(`✅ Seeded: ${concept.id} (${embedding.length}-dim)`);
    // Small delay to respect free tier rate limit
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('All 10 concepts seeded.');
}

seedAll().catch(console.error);
```

### Updated lib/opensearch.js — RAG Query with Gemini

```javascript
// lib/opensearch.js
require('dotenv').config();
const { getEmbedding }    = require('./geminiEmbed');
const { Client }          = require('@opensearch-project/opensearch');
const { AwsSigv4Signer }  = require('@opensearch-project/opensearch/aws');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');

const osClient = new Client({
  ...AwsSigv4Signer({ region: 'us-east-1', service: 'aoss', getCredentials: defaultProvider() }),
  node: process.env.OPENSEARCH_ENDPOINT
});

async function ragQuery(conceptId) {
  // Embed the query with Gemini (free)
  const queryVector = await getEmbedding(`Explain the ${conceptId} code pattern and why it is harmful`);

  // kNN search in OpenSearch Serverless — returns top 3 closest concept docs
  const { body } = await osClient.search({
    index: 'concept-embeddings',
    body: {
      size: 3,
      query: {
        knn: {
          embedding: { vector: queryVector, k: 3 }
        }
      }
    }
  });

  return body.hits.hits.map(h => h._source.content).join('\n\n');
}

module.exports = { ragQuery };
```

### Remove from Package Installations

Do NOT install `@aws-sdk/client-bedrock-runtime` — it is no longer needed.
Do NOT add `AmazonBedrockFullAccess` to your IAM role — it is no longer needed.

### Updated OpenSearch Index Dimension

Your index must use **768 dimensions** (not 1024). When you run `create_index.py`:

```json
"embedding": {
  "type": "knn_vector",
  "dimension": 768,
  "method": { "name": "hnsw", "engine": "faiss", "space_type": "innerproduct" }
}
```

If you already created the index with 1024 dimensions, delete and recreate:
```bash
# Delete and recreate — this is the seed index, safe to wipe
python -c "
import boto3, requests
from requests_aws4auth import AWS4Auth
session = boto3.Session(region_name='us-east-1')
creds = session.get_credentials()
auth = AWS4Auth(creds.access_key, creds.secret_key, 'us-east-1', 'aoss', session_token=creds.token)
r = requests.delete('YOUR_OPENSEARCH_ENDPOINT/concept-embeddings', auth=auth)
print(r.status_code, r.json())
"
# Then re-run create_index.py with dimension: 768
```

