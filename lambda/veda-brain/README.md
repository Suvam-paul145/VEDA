# veda-brain — Lambda Function

The AI routing engine powering VEDA. Accepts code + context, returns structured JSON with bug analysis, Mermaid diagram, fix suggestion, and voice response.

## Routing Logic

| `mode` | Model | Provider | Typical Latency | Purpose |
|---|---|---|---|---|
| `companion` | Gemini 2.0 Flash | GCP (free) | ~400ms | Real-time hints on file save |
| `analyze` | Claude 3.5 Sonnet (CRIS) | AWS Bedrock | ~1.5s | Full analysis + diagram + fix |
| `diagram` | Claude 3.5 Haiku (CRIS) | AWS Bedrock | ~600ms | Diagram generation only |
| `deep` | Claude 3 Opus (CRIS) | AWS Bedrock | ~3–5s | Complex/production bugs |

Auto-escalates to `deep` when question contains: `production`, `race condition`, `intermittent`, `memory leak`, `flaky`, `deadlock`, etc.

**CRIS** = Cross-Region Inference. The `us.` prefix routes requests across us-east-1, us-east-2, and us-west-2, giving 3× effective Bedrock quota for free.

## AWS Setup

### 1. Enable Bedrock models in us-east-1
`https://us-east-1.console.aws.amazon.com/bedrock/home#/modelaccess`

Enable: Claude 3.5 Sonnet v2 · Claude 3.5 Haiku · Claude 3 Opus

### 2. Create IAM Role
- Name: `veda-lambda-execution-role`
- Attach: `AmazonBedrockFullAccess` + `AWSLambdaBasicExecutionRole`

### 3. Create Lambda
- Name: `veda-brain` · Runtime: Node.js 20.x
- Memory: 512 MB · Timeout: 30 s
- Role: `veda-lambda-execution-role`

### 4. Set Environment Variables
```
GEMINI_API_KEY = <your key from aistudio.google.com>
NODE_ENV       = production
```

### 5. Deploy
```bash
npm install
zip -r veda-brain.zip index.mjs package.json node_modules/
# Upload via Lambda Console → Code → Upload from → .zip file
```

Or with AWS CLI:
```bash
npm run deploy
```

## Request Format

```json
{
  "code": "async function getUser(id) { const user = fetchUser(id); return user.name; }",
  "language": "javascript",
  "question": "What is wrong?",
  "mode": "analyze"
}
```

## Response Format

```json
{
  "explanation": "The function is missing await before fetchUser...",
  "severity": "high",
  "bug_type": "async_issue",
  "root_cause": "fetchUser() returns a Promise; without await it resolves to undefined",
  "mermaid_diagram": "flowchart TD\n A[getUser] --> B[fetchUser called]\n B --> C{awaited?}\n C -->|No| D[❌ user = Promise]",
  "fix_code": "async function getUser(id) {\n  const user = await fetchUser(id);\n  return user.name;\n}",
  "fix_explanation": "await pauses execution until the Promise resolves, ensuring user holds real data",
  "voice_response": "You have an async bug — fetchUser isn't awaited. Adding await before fetchUser will fix it instantly.",
  "_meta": {
    "provider": "AWS",
    "model": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "mode": "analyze",
    "escalated": false,
    "latency_ms": 1418
  }
}
```

## Test Locally

```bash
export GEMINI_API_KEY=your_key
export AWS_PROFILE=default
npm test
```

## curl Test (after API Gateway setup)

```bash
curl -X POST https://YOUR_ID.execute-api.us-east-1.amazonaws.com/prod/analyze \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{"code":"const x = null; x.name","language":"javascript","mode":"analyze"}'
```
