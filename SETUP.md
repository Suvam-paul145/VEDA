# Veda Learn - Complete Setup Guide

This guide will walk you through setting up the entire Veda Learn system from scratch, including AWS infrastructure, Lambda backend, and VS Code extension.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Infrastructure Setup](#aws-infrastructure-setup)
3. [Lambda Backend Setup](#lambda-backend-setup)
4. [VS Code Extension Setup](#vs-code-extension-setup)
5. [Testing the System](#testing-the-system)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts and Tools

- **AWS Account** with billing enabled
- **GitHub Account** for OAuth
- **OpenRouter Account** with API credits ($10 recommended)
- **Node.js** 20.x or higher
- **npm** or **yarn**
- **AWS CLI** installed and configured
- **VS Code** 1.80.0 or higher
- **Git** for version control

### Install AWS CLI

**macOS:**
```bash
brew install awscli
```

**Windows:**
Download from: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-windows.html

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Configure AWS CLI

```bash
aws configure
```

Enter:
- AWS Access Key ID: (from IAM console)
- AWS Secret Access Key: (from IAM console)
- Default region: `us-east-1`
- Default output format: `json`

---

## AWS Infrastructure Setup

### Step 1: Create IAM Role for Lambda (15 minutes)

1. Go to AWS Console → IAM → Roles
2. Click "Create role"
3. Select "AWS Service" → "Lambda"
4. Attach the following policies:
   - `AmazonDynamoDBFullAccess`
   - `AmazonPollyFullAccess`
   - `AmazonS3FullAccess`
   - `AmazonBedrockFullAccess`
   - `AmazonOpenSearchServiceFullAccess`
   - `AmazonAPIGatewayInvokeFullAccess`
   - `CloudWatchLogsFullAccess`
   - `AWSLambdaBasicExecutionRole`
5. Name the role: `veda-lambda-role`
6. Copy the Role ARN (you'll need this for serverless.yml)

### Step 2: Create DynamoDB Tables (10 minutes)

Run these commands in your terminal:

```bash
# Users table
aws dynamodb create-table \
  --table-name veda-users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

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
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

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
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Learning profiles table
aws dynamodb create-table \
  --table-name veda-profiles \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=language,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=language,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# WebSocket connections table
aws dynamodb create-table \
  --table-name veda-ws-connections \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Rate limiter table
aws dynamodb create-table \
  --table-name veda-rate-limits \
  --attribute-definitions AttributeName=lockKey,AttributeType=S \
  --key-schema AttributeName=lockKey,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Enable TTL on rate-limits table
aws dynamodb update-time-to-live \
  --table-name veda-rate-limits \
  --time-to-live-specification "Enabled=true, AttributeName=ttl" \
  --region us-east-1
```

### Step 3: Create S3 Buckets (5 minutes)

```bash
# Audio bucket for Polly MP3 files
aws s3api create-bucket \
  --bucket veda-learn-audio \
  --region us-east-1

# Concept docs bucket for RAG
aws s3api create-bucket \
  --bucket veda-learn-concepts \
  --region us-east-1

# Set CORS on audio bucket
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

### Step 4: Create OpenSearch Serverless Collection (10 minutes)

**Note:** Replace `YOUR_ACCOUNT_ID` with your actual AWS account ID.

```bash
# Create encryption policy
aws opensearchserverless create-security-policy \
  --name veda-encryption \
  --type encryption \
  --policy '{"Rules":[{"Resource":["collection/veda-concepts"],"ResourceType":"collection"}],"AWSOwnedKey":true}' \
  --region us-east-1

# Create network policy
aws opensearchserverless create-security-policy \
  --name veda-network \
  --type network \
  --policy '[{"Rules":[{"Resource":["collection/veda-concepts"],"ResourceType":"collection"},{"Resource":["collection/veda-concepts"],"ResourceType":"dashboard"}],"AllowFromPublic":true}]' \
  --region us-east-1

# Create data access policy (replace YOUR_ACCOUNT_ID)
aws opensearchserverless create-access-policy \
  --name veda-access \
  --type data \
  --policy '[{"Description":"Lambda access","Rules":[{"Resource":["collection/veda-concepts"],"Permission":["aoss:*"],"ResourceType":"collection"},{"Resource":["index/veda-concepts/*"],"Permission":["aoss:*"],"ResourceType":"index"}],"Principal":["arn:aws:iam::YOUR_ACCOUNT_ID:role/veda-lambda-role"]}]' \
  --region us-east-1

# Create collection
aws opensearchserverless create-collection \
  --name veda-concepts \
  --type VECTORSEARCH \
  --region us-east-1

# Get collection endpoint (wait ~2 minutes for ACTIVE status)
aws opensearchserverless list-collections --region us-east-1
```

Copy the collection endpoint URL (looks like: `https://xxxxxxxxxxxx.us-east-1.aoss.amazonaws.com`)

### Step 5: Create OpenSearch Vector Index (5 minutes)

Create a Python script to create the index:

```bash
cd veda-learn-api/seed
```

Create `create_index.py`:

```python
import boto3
import requests
from requests_aws4auth import AWS4Auth

# Replace with your OpenSearch endpoint
OPENSEARCH_ENDPOINT = "https://your-endpoint.us-east-1.aoss.amazonaws.com"
INDEX_NAME = "concept-embeddings"

session = boto3.Session()
creds = session.get_credentials()
auth = AWS4Auth(
    creds.access_key,
    creds.secret_key,
    'us-east-1',
    'aoss',
    session_token=creds.token
)

index_body = {
    "settings": {"index.knn": True},
    "mappings": {
        "properties": {
            "conceptId": {"type": "keyword"},
            "content": {"type": "text"},
            "embedding": {
                "type": "knn_vector",
                "dimension": 1024,
                "method": {
                    "name": "hnsw",
                    "engine": "faiss",
                    "space_type": "innerproduct"
                }
            }
        }
    }
}

response = requests.put(
    f"{OPENSEARCH_ENDPOINT}/{INDEX_NAME}",
    json=index_body,
    auth=auth
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
```

Install dependencies and run:

```bash
pip install boto3 requests requests-aws4auth
python create_index.py
```

### Step 6: Enable Bedrock Titan Embeddings (5 minutes)

1. Go to AWS Console → Amazon Bedrock
2. Click "Model access" in the left sidebar
3. Click "Request model access"
4. Find "Amazon Titan Text Embeddings V2"
5. Check the box and click "Request model access"
6. Access is granted instantly (no approval wait)

### Step 7: Set Up OpenRouter API (5 minutes)

1. Go to https://openrouter.ai
2. Sign up for an account
3. Add $10 credit to your account
4. Go to API Keys → Create new key
5. Name it "veda-learn-aws"
6. Copy the API key (starts with `sk-or-v1-...`)

### Step 8: Create GitHub OAuth Application (5 minutes)

1. Go to https://github.com/settings/applications/new
2. Fill in:
   - **Application name:** Veda Learn
   - **Homepage URL:** `https://your-api-gateway-url` (you'll update this after deployment)
   - **Authorization callback URL:** `https://your-api-gateway-url/auth/github/callback`
3. Click "Register application"
4. Copy the **Client ID**
5. Click "Generate a new client secret"
6. Copy the **Client Secret**

---

## Lambda Backend Setup

### Step 1: Clone and Install Dependencies (5 minutes)

```bash
cd veda-learn-api
npm install
```

### Step 2: Configure Environment Variables (5 minutes)

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

```bash
# OpenRouter API
OPENROUTER_API_KEY=sk-or-v1-your-actual-key

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# JWT Secret (generate random 64-char string)
JWT_SECRET=your-random-64-character-string-here

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# OpenSearch (from Step 4)
OPENSEARCH_ENDPOINT=https://your-opensearch-endpoint.us-east-1.aoss.amazonaws.com

# S3 Buckets
S3_AUDIO_BUCKET=veda-learn-audio
S3_CONCEPTS_BUCKET=veda-learn-concepts

# WebSocket API (leave empty for now, fill after deployment)
WS_API_ENDPOINT=
```

**Generate JWT Secret:**

```bash
# On macOS/Linux:
openssl rand -hex 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Step 3: Update serverless.yml (2 minutes)

Edit `serverless.yml` and replace `YOUR_ACCOUNT_ID` with your AWS account ID:

```yaml
role: arn:aws:iam::YOUR_ACCOUNT_ID:role/veda-lambda-role
```

### Step 4: Deploy Lambda Functions (5 minutes)

```bash
npx serverless deploy
```

This will output:
- REST API endpoint URL
- WebSocket API endpoint URL

**Copy both URLs!**

### Step 5: Update Environment Variables (2 minutes)

1. Copy the WebSocket API URL from deployment output
2. Update `.env`:

```bash
WS_API_ENDPOINT=wss://your-websocket-id.execute-api.us-east-1.amazonaws.com/dev
```

3. Update GitHub OAuth callback URL:
   - Go to GitHub → Settings → Developer settings → OAuth Apps
   - Edit your Veda Learn app
   - Update Homepage URL and Callback URL with your REST API endpoint

### Step 6: Redeploy with Updated Config (2 minutes)

```bash
npx serverless deploy
```

---

## VS Code Extension Setup

### Step 1: Install Dependencies (3 minutes)

```bash
cd veda-learn-extension
npm install
```

### Step 2: Configure API Endpoints (2 minutes)

Create `src/config.ts`:

```typescript
export const config = {
  restApiUrl: 'https://your-rest-api-id.execute-api.us-east-1.amazonaws.com/dev',
  wsApiUrl: 'wss://your-websocket-api-id.execute-api.us-east-1.amazonaws.com/dev',
};
```

Replace with your actual API Gateway URLs from the Lambda deployment.

### Step 3: Compile Extension (2 minutes)

```bash
npm run compile
```

### Step 4: Test Extension in VS Code (2 minutes)

1. Open the `veda-learn-extension` folder in VS Code
2. Press `F5` to launch Extension Development Host
3. A new VS Code window will open with the extension loaded

---

## Testing the System

### Test 1: Authentication Flow

1. In the Extension Development Host, open Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Run command: "Veda: Sign in with GitHub"
3. Browser should open with GitHub OAuth
4. Approve the application
5. VS Code should show "✅ Veda Learn — Logged in!"

### Test 2: Code Analysis

1. Create a new Python file: `test.py`
2. Type this code:

```python
def add_item(item, cart=[]):
    cart.append(item)
    return cart
```

3. Wait 30 seconds (or 5 seconds if demo mode is enabled)
4. Veda sidebar should show a lesson about mutable default arguments
5. Audio should play automatically

### Test 3: Quiz System

1. After viewing a lesson, click "Got it ✓"
2. Wait 30 seconds
3. Quiz should appear with 2 multiple-choice questions
4. Answer correctly to see confetti animation

### Test 4: Progress Tracking

1. Open the Progress tab in Veda sidebar
2. Should show:
   - Skill score (circular visualization)
   - Streak days (🔥 emoji)
   - Top 3 languages with lesson counts

---

## Troubleshooting

### Lambda Deployment Issues

**Error: "Role not found"**
- Verify IAM role ARN in `serverless.yml`
- Check role exists in IAM console

**Error: "Table already exists"**
- Tables were created successfully, ignore this error
- Or delete tables and recreate: `aws dynamodb delete-table --table-name veda-users`

### OpenSearch Issues

**Error: "Collection not found"**
- Wait 2-3 minutes for collection to become ACTIVE
- Check status: `aws opensearchserverless list-collections`

**Error: "Access denied"**
- Verify data access policy includes correct IAM role ARN
- Check network policy allows public access

### Extension Issues

**WebSocket not connecting**
- Verify `WS_API_ENDPOINT` in `.env` is correct
- Check CloudWatch Logs for wsConnect Lambda errors
- Ensure JWT token is stored in VS Code SecretStorage

**No lessons appearing**
- Check 30-second debounce timer (enable demo mode for 5 seconds)
- Verify OpenRouter API key is valid
- Check CloudWatch Logs for analyze Lambda errors

**Audio not playing**
- Check S3 bucket CORS configuration
- Verify Polly has permissions in IAM role
- Check browser console for audio errors

### Cost Monitoring

**Check AWS costs:**
```bash
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

**Expected costs (4 days):**
- OpenSearch Serverless: ~$2-5
- OpenRouter API: ~$5-8
- Lambda, DynamoDB, S3, Polly: Free tier
- **Total: ~$7-13**

---

## Next Steps

1. **Seed Concept Knowledge Base** - Run the seed script to populate OpenSearch with concept definitions
2. **Implement Lambda Handlers** - Follow tasks.md to implement all Lambda functions
3. **Build Extension UI** - Create the webview sidebar with three-panel layout
4. **Add Testing** - Write unit tests and property-based tests
5. **Deploy to Production** - Use `npx serverless deploy --stage prod`

---

## Project Structure

```
veda-learn/
├── veda-learn-api/              # Lambda backend
│   ├── handlers/                # Lambda function handlers
│   │   ├── auth.js
│   │   ├── analyze.js
│   │   ├── lesson.js
│   │   ├── quiz.js
│   │   ├── progress.js
│   │   ├── progressUpdate.js
│   │   ├── wsConnect.js
│   │   └── wsDisconnect.js
│   ├── lib/                     # Shared libraries
│   │   ├── openrouter.js
│   │   ├── dynamodb.js
│   │   ├── opensearch.js
│   │   ├── polly.js
│   │   ├── rateLimit.js
│   │   └── websocket.js
│   ├── seed/                    # Database seeding scripts
│   │   ├── create_index.py
│   │   └── seed_concepts.js
│   ├── .env                     # Environment variables (DO NOT COMMIT)
│   ├── .env.example             # Example environment file
│   ├── package.json
│   ├── serverless.yml           # Serverless Framework config
│   └── .gitignore
│
├── veda-learn-extension/        # VS Code extension
│   ├── src/                     # TypeScript source
│   │   ├── extension.ts         # Main extension entry
│   │   ├── auth.ts              # Authentication handler
│   │   ├── watcher.ts           # Code change watcher
│   │   ├── websocket.ts         # WebSocket manager
│   │   ├── sidebar.ts           # Webview sidebar provider
│   │   └── config.ts            # Configuration
│   ├── resources/               # Icons and assets
│   ├── out/                     # Compiled JavaScript (generated)
│   ├── package.json
│   ├── tsconfig.json
│   └── .gitignore
│
├── .kiro/                       # Kiro spec files
│   └── specs/
│       └── veda-learn-aws-edition/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
│
├── references/                  # Documentation
│   ├── veda-learn-aws-roadmap.md
│   └── veda-system-design.html
│
├── SETUP.md                     # This file
└── README.md                    # Project overview
```

---

## Support and Resources

- **AWS Documentation:** https://docs.aws.amazon.com/
- **Serverless Framework:** https://www.serverless.com/framework/docs
- **VS Code Extension API:** https://code.visualstudio.com/api
- **OpenRouter API:** https://openrouter.ai/docs
- **Spec Files:** See `.kiro/specs/veda-learn-aws-edition/` for detailed requirements, design, and tasks

---

## License

MIT License - See LICENSE file for details
