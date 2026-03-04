# Design Document: Veda Learn - AWS Edition

## Overview

Veda Learn - AWS Edition is a VS Code extension that provides real-time, AI-powered code education by detecting mistakes and delivering interactive lessons with voice narration. The system operates passively, watching developers code and intervening only when anti-patterns or mistakes are detected. The architecture is fully serverless, leveraging AWS services for infrastructure while using OpenRouter API for AI inference.

### Key Design Principles

1. **Passive Learning**: The extension monitors code changes with a 30-second debounce, ensuring minimal disruption to developer workflow
2. **Serverless Architecture**: All backend logic runs on AWS Lambda, with API Gateway handling REST and WebSocket communication
3. **Real-Time Delivery**: Lessons are pushed via WebSocket connections for immediate feedback
4. **Multi-Modal Learning**: Combines text explanations, code diffs, visual diagrams, and voice narration
5. **Cost Optimization**: Uses appropriate AI models for each task (Haiku for classification, Sonnet for lessons, Opus for deep dives)

### System Boundaries

**In Scope:**
- VS Code extension client (TypeScript)
- AWS Lambda backend functions (Node.js 20.x)
- GitHub OAuth authentication with JWT
- Real-time code analysis and mistake detection
- Interactive lesson generation with TTS
- Quiz generation and evaluation
- Progress tracking with streaks and skill scores
- RAG-based context retrieval using OpenSearch

**Out of Scope:**
- Multi-IDE support (VS Code only)
- Offline mode
- Custom AI model training
- Team/organization features
- Code execution or sandboxing

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     VS Code Extension                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Watcher    │  │   Sidebar    │  │ Auth Handler │          │
│  │  (Debounce)  │  │  (Webview)   │  │  (URI)       │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          │ REST             │ WebSocket        │ OAuth Redirect
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼──────────────────┐
│                    AWS API Gateway                                │
│  ┌────────────────────────┐  ┌────────────────────────┐          │
│  │   REST API             │  │   WebSocket API        │          │
│  │   /api/*               │  │   $connect             │          │
│  │   /auth/*              │  │   $disconnect          │          │
│  └───────┬────────────────┘  └───────┬────────────────┘          │
└──────────┼───────────────────────────┼───────────────────────────┘
           │                           │
           │ Invoke                    │ Invoke
           │                           │
┌──────────▼───────────────────────────▼───────────────────────────┐
│                      AWS Lambda Functions                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Auth    │ │ Analyze  │ │  Lesson  │ │   Quiz   │            │
│  │ Handler  │ │ Handler  │ │ Generator│ │ Generator│            │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │
│       │            │            │            │                    │
│  ┌────┴─────┐ ┌───┴──────┐ ┌───┴──────┐ ┌───┴──────┐            │
│  │ Progress │ │ Progress │ │   WS     │ │   WS     │            │
│  │   Get    │ │  Update  │ │ Connect  │ │Disconnect│            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
└───────┬────────────┬────────────┬────────────┬───────────────────┘
        │            │            │            │
        │            │            │            │
┌───────▼────────────▼────────────▼────────────▼───────────────────┐
│                      AWS Services                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  DynamoDB    │  │  OpenSearch  │  │  Google      │           │
│  │  (6 tables)  │  │  Serverless  │  │  Gemini API  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  S3          │  │  Polly       │  │  OpenRouter  │           │
│  │  (Audio+Docs)│  │  (TTS)       │  │  API         │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└───────────────────────────────────────────────────────────────────┘
```

### Communication Patterns

1. **Authentication Flow**: GitHub OAuth → Lambda → JWT → VS Code SecretStorage
2. **Code Analysis Flow**: VS Code → REST API → Lambda → OpenRouter → DynamoDB
3. **Lesson Delivery Flow**: Lambda → WebSocket API → VS Code Webview
4. **Progress Sync Flow**: VS Code → REST API → Lambda → DynamoDB

### Technology Stack

**Frontend:**
- VS Code Extension API (TypeScript)
- WebSocket client (ws library)
- Webview for lesson rendering

**Backend:**
- AWS Lambda (Node.js 20.x runtime)
- Serverless Framework v3 for deployment
- API Gateway (REST + WebSocket)

**Data Storage:**
- DynamoDB (6 tables, pay-per-request billing)
- S3 (audio files, concept documents)
- OpenSearch Serverless (vector embeddings)

**AI Services:**
- OpenRouter API (Claude Haiku, Sonnet, Opus; Gemini Flash)
- Google Gemini text-embedding-004 (768-dimensional vectors, FREE tier)
- Amazon Polly Generative TTS (Ruth voice)

## Components and Interfaces

### VS Code Extension Components

#### 1. Watcher Component

**Responsibility**: Monitor code changes and trigger analysis

**Interface:**
```typescript
interface Watcher {
  startWatching(): void;
  stopWatching(): void;
  onDocumentChange(event: TextDocumentChangeEvent): void;
}

interface AnalysisPayload {
  fileContent: string;
  language: string;
  fileName: string;
  cursorLine: number;
  diagnostics: Diagnostic[];
}
```

**Behavior:**
- Listens to `vscode.workspace.onDidChangeTextDocument` events
- Implements 30-second debounce timer (5 seconds in demo mode)
- Collects file content, language ID, cursor position, and VS Code diagnostics
- Sends analysis request to `/api/analyze` with JWT bearer token
- Maintains debounce map keyed by document URI

#### 2. Sidebar Webview Component

**Responsibility**: Render lessons and handle user interactions

**Interface:**
```typescript
interface SidebarPanel {
  receiveLesson(lesson: Lesson): void;
  renderLesson(lesson: Lesson): void;
  playAudio(audioUrl: string): void;
  showQuiz(quiz: Quiz): void;
  updateProgress(progress: Progress): void;
}

interface Lesson {
  lessonId: string;
  explanation: string;
  codeFix: CodeFix;
  diagram: string;
  audioUrl: string | null;
}

interface CodeFix {
  before: string;
  after: string;
  comment: string;
}
```

**Behavior:**
- Renders three-panel layout (explanation, code diff, diagram)
- Displays Mermaid.js diagrams as SVG
- Auto-plays audio at 0.95x speed
- Falls back to Web Speech API if audioUrl is null
- Provides replay and mute controls
- Shows color-coded severity badges

#### 3. Auth Handler Component

**Responsibility**: Handle GitHub OAuth flow

**Interface:**
```typescript
interface AuthHandler {
  initiateLogin(): void;
  handleCallback(uri: Uri): Promise<void>;
  getToken(): Promise<string | undefined>;
}
```

**Behavior:**
- Registers URI handler for `vscode://veda-learn.veda-learn/auth`
- Opens GitHub OAuth URL in browser
- Receives callback with JWT token
- Stores token in VS Code SecretStorage
- Initiates WebSocket connection after successful auth

#### 4. WebSocket Manager Component

**Responsibility**: Maintain persistent connection for real-time updates

**Interface:**
```typescript
interface WebSocketManager {
  connect(token: string): void;
  disconnect(): void;
  onMessage(handler: (message: any) => void): void;
  reconnect(): void;
}
```

**Behavior:**
- Connects to WebSocket API with JWT as query parameter
- Handles incoming lesson and quiz messages
- Implements automatic reconnection with 5-second delay
- Routes messages to appropriate handlers

### Lambda Function Components

#### 1. Auth Handler (handlers/auth.js)

**Responsibility**: GitHub OAuth and JWT issuance

**Interface:**
```javascript
exports.callback = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>
```

**Behavior:**
- Exchanges OAuth code for GitHub access token
- Fetches user profile from GitHub API
- Creates or updates user record in DynamoDB (veda-users table)
- Generates JWT with 30-day expiration
- Redirects to VS Code custom URI with token

#### 2. Analyze Handler (handlers/analyze.js)

**Responsibility**: Code mistake detection and classification

**Interface:**
```javascript
exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>
```

**Behavior:**
- Verifies JWT token
- Checks rate limiter (DynamoDB TTL-based lock)
- Calls OpenRouter with Claude Haiku for classification
- Parses JSON response with mistake details
- Saves mistake to DynamoDB if confidence ≥ 0.85
- Triggers async lesson generation
- Returns immediately to avoid blocking VS Code

#### 3. Lesson Generator (handlers/lesson.js)

**Responsibility**: Generate comprehensive lessons with TTS

**Interface:**
```javascript
exports.generateLesson = async (userId: string, mistakeId: string, mistake: Mistake): Promise<void>
exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>
```

**Behavior:**
- Retrieves RAG context from OpenSearch (k=3)
- Makes 3 parallel OpenRouter calls:
  - Explanation (Claude Sonnet, 120 words, conversational)
  - Code fix (Claude Sonnet, JSON format)
  - Diagram (Gemini Flash, Mermaid.js syntax)
- Parses code fix JSON with fallback handling
- Sends explanation to Amazon Polly (Ruth voice, generative engine)
- Uploads MP3 to S3 and generates presigned URL (1-hour expiration)
- Saves lesson to DynamoDB
- Pushes complete lesson to user via WebSocket

#### 4. Quiz Generator (handlers/quiz.js)

**Responsibility**: Generate multiple-choice questions

**Interface:**
```javascript
exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>
```

**Behavior:**
- Verifies JWT token
- Calls OpenRouter with Claude Haiku
- Requests 2 multiple-choice questions in JSON format
- Returns quiz data to extension

#### 5. Progress Tracker (handlers/progress.js, handlers/progressUpdate.js)

**Responsibility**: Track learning progress and streaks

**Interface:**
```javascript
exports.get = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>
exports.handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>
```

**Behavior:**
- GET: Retrieves user record with skillScore, streakDays, learning profiles
- POST: Updates lesson completion, calculates streak logic, increments skillScore
- Streak logic:
  - If lastActive = yesterday: increment streak
  - If lastActive = today: maintain streak
  - Otherwise: reset to 1
- Quiz scoring: +3 points if passed, +1 if not passed
- Caps skillScore at 100

#### 6. WebSocket Handlers (handlers/wsConnect.js, handlers/wsDisconnect.js)

**Responsibility**: Manage WebSocket connections

**Interface:**
```javascript
exports.handler = async (event: APIGatewayWebSocketEvent): Promise<APIGatewayProxyResult>
```

**Behavior:**
- Connect: Verifies JWT, stores connectionId in DynamoDB
- Disconnect: Removes connectionId from DynamoDB
- Returns 401 if JWT is invalid

### Shared Library Components

#### 1. OpenRouter Client (lib/openrouter.js)

**Interface:**
```javascript
exports.callOpenRouter = async ({
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
}): Promise<string>
```

**Behavior:**
- Makes POST request to OpenRouter API
- Includes API key, HTTP-Referer, X-Title headers
- Handles error responses
- Returns message content from first choice

#### 2. Rate Limiter (lib/rateLimit.js)

**Interface:**
```javascript
exports.checkRateLimit = async (userId: string): Promise<boolean>
```

**Behavior:**
- Creates lock entry in DynamoDB with 30-second TTL
- Uses conditional expression to prevent duplicate locks
- Returns true if lock exists (rate limited), false otherwise
- DynamoDB TTL automatically deletes expired entries

#### 3. Polly TTS Engine (lib/polly.js)

**Interface:**
```javascript
exports.synthesizeAndStore = async (text: string, lessonId: string): Promise<string>
```

**Behavior:**
- Calls Amazon Polly with generative engine
- Collects audio stream into buffer
- Uploads MP3 to S3 with key `lessons/{lessonId}.mp3`
- Generates presigned URL with 1-hour expiration
- Returns presigned URL

#### 4. WebSocket Pusher (lib/websocket.js)

**Interface:**
```javascript
exports.pushToClient = async (userId: string, payload: any): Promise<void>
```

**Behavior:**
- Retrieves connectionId from DynamoDB
- Uses ApiGatewayManagementApi to post message
- Handles missing connectionId gracefully

#### 5. RAG System (lib/opensearch.js)

**Interface:**
```javascript
exports.retrieveContext = async (conceptId: string): Promise<string>
exports.generateEmbedding = async (text: string): Promise<number[]>
```

**Behavior:**
- Generates embedding using Google Gemini text-embedding-004 API (768 dimensions)
- Performs k-NN search in OpenSearch with k=3
- Extracts and concatenates content from top 3 results
- Returns combined context string

## Data Models

### DynamoDB Tables

#### 1. veda-users

**Purpose**: Store user profiles and progress

**Schema:**
```javascript
{
  userId: string,           // PK: "gh_{githubId}"
  githubId: string,
  username: string,
  email: string,
  avatarUrl: string,
  skillScore: number,       // 0-100
  streakDays: number,
  lastActive: string,       // ISO date (YYYY-MM-DD)
  createdAt: string         // ISO timestamp
}
```

**Indexes**: None (primary key only)

#### 2. veda-mistakes

**Purpose**: Store detected code mistakes

**Schema:**
```javascript
{
  mistakeId: string,        // PK: UUID
  userId: string,           // GSI
  language: string,
  conceptId: string,
  severity: string,         // "low" | "medium" | "high"
  mistakeType: string,      // "antipattern" | "bug" | "security" | "performance" | "style"
  problematicCode: string,
  lineNumber: number,
  confidence: number,       // 0.0-1.0
  createdAt: string
}
```

**Indexes**: 
- GSI: userId-index (userId as partition key)

#### 3. veda-lessons

**Purpose**: Store generated lessons

**Schema:**
```javascript
{
  lessonId: string,         // PK: UUID
  userId: string,           // GSI
  mistakeId: string,
  explanation: string,
  codeFix: {
    before: string,
    after: string,
    comment: string
  },
  diagram: string,          // Mermaid.js syntax
  audioUrl: string,         // S3 presigned URL
  status: string,           // "pending" | "completed"
  createdAt: string
}
```

**Indexes**:
- GSI: userId-index (userId as partition key)

#### 4. veda-profiles

**Purpose**: Store per-language learning profiles

**Schema:**
```javascript
{
  userId: string,           // PK
  language: string,         // SK
  lessonsCompleted: number,
  conceptsMastered: string[], // Array of conceptIds
  lastPracticed: string     // ISO timestamp
}
```

**Indexes**: None (composite primary key)

#### 5. veda-ws-connections

**Purpose**: Map users to WebSocket connectionIds

**Schema:**
```javascript
{
  userId: string,           // PK
  connectionId: string,
  connectedAt: string       // ISO timestamp
}
```

**Indexes**: None (primary key only)

#### 6. veda-rate-limits

**Purpose**: Implement rate limiting with TTL

**Schema:**
```javascript
{
  lockKey: string,          // PK: "lesson-lock:{userId}"
  userId: string,
  ttl: number               // Unix timestamp (TTL attribute)
}
```

**Indexes**: None (primary key only)
**TTL**: Enabled on `ttl` attribute

### S3 Buckets

#### 1. veda-learn-audio

**Purpose**: Store Polly-generated MP3 files

**Structure:**
```
lessons/
  {lessonId}.mp3
```

**CORS Configuration:**
- AllowedOrigins: ["*"]
- AllowedMethods: ["GET"]
- AllowedHeaders: ["*"]
- MaxAgeSeconds: 3000

#### 2. veda-learn-concepts

**Purpose**: Store concept seed documents for RAG

**Structure:**
```
concepts/
  mutable-default.md
  callback-hell.md
  any-type.md
  ...
```

### OpenSearch Index

#### concept-embeddings

**Purpose**: Vector search for RAG context retrieval

**Mapping:**
```json
{
  "settings": {
    "index.knn": true
  },
  "mappings": {
    "properties": {
      "conceptId": { "type": "keyword" },
      "content": { "type": "text" },
      "embedding": {
        "type": "knn_vector",
        "dimension": 768,
        "method": {
          "name": "hnsw",
          "engine": "faiss",
          "space_type": "innerproduct"
        }
      }
    }
  }
}
```

**Query Pattern:**
```json
{
  "size": 3,
  "query": {
    "knn": {
      "embedding": {
        "vector": [/* 768-dimensional vector */],
        "k": 3
      }
    }
  }
}
```

### API Contracts

#### REST API Endpoints

**POST /auth/github/callback**
- Query: `code` (OAuth code)
- Response: 302 redirect to `vscode://veda-learn.veda-learn/auth?token={jwt}`

**POST /api/analyze**
- Headers: `Authorization: Bearer {jwt}`
- Body: `{ fileContent, language, fileName, cursorLine, diagnostics }`
- Response: `{ teach: boolean, mistakeId?: string, reason?: string }`

**POST /api/lesson**
- Headers: `Authorization: Bearer {jwt}`
- Body: `{ mistakeId, conceptId, problematicCode, language }`
- Response: Lesson pushed via WebSocket

**POST /api/quiz**
- Headers: `Authorization: Bearer {jwt}`
- Body: `{ conceptId, language }`
- Response: `{ questions: [{ question, options, correctIndex }] }`

**GET /api/progress/{userId}**
- Headers: `Authorization: Bearer {jwt}`
- Response: `{ skillScore, streakDays, learningProfiles }`

**POST /api/progress/update**
- Headers: `Authorization: Bearer {jwt}`
- Body: `{ lessonId, rating, quizPassed, conceptId, language }`
- Response: `{ success: boolean }`

#### WebSocket API

**$connect**
- Query: `token` (JWT)
- Response: 200 (success) or 401 (unauthorized)

**$disconnect**
- Response: 200

**Message Format (Server → Client):**
```json
{
  "type": "lesson",
  "lesson": {
    "lessonId": "uuid",
    "explanation": "text",
    "codeFix": { "before": "code", "after": "code", "comment": "text" },
    "diagram": "mermaid syntax",
    "audioUrl": "https://..."
  }
}
```


## Error Handling

### Error Categories and Strategies

#### 1. Authentication Errors

**Scenarios:**
- Invalid OAuth code
- GitHub API unavailable
- JWT verification failure
- Expired JWT token

**Handling:**
- Return HTTP 401 for invalid/expired tokens
- Log error details to CloudWatch
- Display user-friendly message in VS Code
- Prompt user to re-authenticate

**Implementation:**
```javascript
try {
  const { userId } = jwt.verify(token, process.env.JWT_SECRET);
} catch (error) {
  console.error('JWT verification failed:', error.message);
  return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
}
```

#### 2. OpenRouter API Errors

**Scenarios:**
- Rate limit exceeded (429)
- API timeout
- Invalid response format
- Model unavailable

**Handling:**
- Retry with fallback model (gpt-4o-mini) on 429 errors
- Log error to CloudWatch with request context
- Return graceful degradation response
- Continue operation without blocking user

**Implementation:**
```javascript
try {
  return await callOpenRouter({ model: 'anthropic/claude-haiku-4-5', ... });
} catch (error) {
  if (error.status === 429) {
    console.warn('Rate limited, falling back to GPT-4o-mini');
    return await callOpenRouter({ model: 'openai/gpt-4o-mini', ... });
  }
  throw error;
}
```

#### 3. Amazon Polly Errors

**Scenarios:**
- Synthesis failure
- Text too long
- Service unavailable

**Handling:**
- Return null audioUrl on failure
- Extension falls back to Web Speech API
- Log error to CloudWatch
- Lesson still delivered without audio

**Implementation:**
```javascript
try {
  const audioUrl = await synthesizeAndStore(explanation, lessonId);
  return audioUrl;
} catch (error) {
  console.error('Polly synthesis failed:', error.message);
  return null; // Extension will use browser TTS
}
```

#### 4. DynamoDB Errors

**Scenarios:**
- ConditionalCheckFailedException (user already exists)
- ProvisionedThroughputExceededException
- Item not found
- Network timeout

**Handling:**
- Ignore ConditionalCheckFailedException on user creation (idempotent)
- Retry with exponential backoff for throughput errors
- Return empty result for missing items
- Log all errors to CloudWatch

**Implementation:**
```javascript
await ddb.send(new PutCommand({
  TableName: 'veda-users',
  Item: userData,
  ConditionExpression: 'attribute_not_exists(userId)'
})).catch(err => {
  if (err.name === 'ConditionalCheckFailedException') {
    // User already exists, this is fine
    return;
  }
  throw err;
});
```

#### 5. WebSocket Connection Errors

**Scenarios:**
- Connection closed unexpectedly
- Message delivery failure
- ConnectionId not found
- Network interruption

**Handling:**
- Auto-reconnect after 5 seconds
- Log connection errors to CloudWatch
- Silently skip message delivery if connectionId missing
- Display connection status in VS Code status bar

**Implementation:**
```javascript
ws.on('close', () => {
  console.log('WebSocket closed, reconnecting in 5s');
  setTimeout(() => openWebSocket(context, token), 5000);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error.message);
});
```

#### 6. JSON Parsing Errors

**Scenarios:**
- Malformed AI response
- Invalid code fix JSON
- Unexpected response structure

**Handling:**
- Use try-catch around JSON.parse
- Provide fallback values
- Log parsing errors with original text
- Continue with degraded data

**Implementation:**
```javascript
let fixParsed;
try {
  fixParsed = JSON.parse(fix);
} catch (error) {
  console.error('Failed to parse code fix JSON:', error.message);
  fixParsed = {
    before: problematicCode,
    after: problematicCode,
    comment: 'Unable to generate fix'
  };
}
```

#### 7. Rate Limiting Errors

**Scenarios:**
- User triggers analysis too frequently
- Concurrent lesson generation attempts

**Handling:**
- Return "cooldown" response without error
- Display friendly message in VS Code
- Lock expires automatically via DynamoDB TTL
- No user action required

**Implementation:**
```javascript
const locked = await checkRateLimit(userId);
if (locked) {
  return {
    statusCode: 200,
    body: JSON.stringify({ teach: false, reason: 'cooldown' })
  };
}
```

### Error Logging Strategy

**CloudWatch Logs:**
- All Lambda functions log to CloudWatch automatically
- Include request ID, user ID, and error context
- Use structured logging for easier querying
- Set log retention to 7 days for cost optimization

**Error Metrics:**
- Track error rates per Lambda function
- Monitor OpenRouter API failures
- Alert on sustained error rates > 5%
- Dashboard for real-time monitoring

### Graceful Degradation

**Priority Levels:**
1. **Critical**: Authentication, WebSocket connection
   - Must work for system to function
   - Display clear error messages
   - Prompt user action

2. **High**: Code analysis, lesson generation
   - Retry with fallback strategies
   - Log errors but continue operation
   - Inform user of temporary issues

3. **Medium**: Audio generation, diagrams
   - Fall back to alternatives (Web Speech API, text-only)
   - System remains functional
   - Silent degradation acceptable

4. **Low**: Progress tracking, quiz generation
   - Can be retried later
   - Non-blocking failures
   - Log for investigation

## Testing Strategy

### Testing Approach

The testing strategy employs a dual approach combining unit tests for specific scenarios and property-based tests for comprehensive coverage. This ensures both concrete edge cases and general correctness properties are validated.

### Unit Testing

**Scope**: Specific examples, edge cases, error conditions, and integration points

**Framework**: Jest for both VS Code extension and Lambda functions

**Test Categories:**

1. **VS Code Extension Tests**
   - Watcher debounce timing (30s normal, 5s demo mode)
   - WebSocket reconnection logic
   - Auth callback URI parsing
   - Sidebar rendering with mock lesson data
   - Audio playback controls (play, pause, replay, mute)
   - Quiz interaction and confetti animation

2. **Lambda Function Tests**
   - JWT verification with valid/invalid/expired tokens
   - GitHub OAuth token exchange
   - DynamoDB CRUD operations
   - OpenRouter API call formatting
   - JSON parsing with malformed responses
   - Rate limiter lock creation and expiration

3. **Integration Tests**
   - End-to-end auth flow (GitHub → Lambda → VS Code)
   - WebSocket connection establishment
   - Lesson delivery pipeline (analysis → generation → push)
   - S3 upload and presigned URL generation
   - OpenSearch k-NN search with sample embeddings

4. **Edge Case Tests**
   - Empty file content
   - Very large files (>10MB)
   - Non-ASCII characters in code
   - Malformed Mermaid diagrams
   - Missing connectionId during push
   - Concurrent rate limit checks
   - Expired presigned URLs

**Example Unit Tests:**

```javascript
// Test: Debounce timer resets on new changes
test('watcher resets debounce timer on document change', async () => {
  const watcher = new Watcher();
  const mockAnalyze = jest.fn();
  
  watcher.onDocumentChange(mockEvent1);
  await sleep(20000); // 20s
  watcher.onDocumentChange(mockEvent2); // Reset timer
  await sleep(20000); // 20s more
  
  expect(mockAnalyze).not.toHaveBeenCalled(); // Only 40s elapsed, need 30s after last change
  
  await sleep(10000); // 10s more (total 30s after last change)
  expect(mockAnalyze).toHaveBeenCalledTimes(1);
});

// Test: Rate limiter prevents concurrent lesson generation
test('rate limiter blocks concurrent requests', async () => {
  const userId = 'test-user';
  
  const result1 = await checkRateLimit(userId);
  expect(result1).toBe(false); // First request allowed
  
  const result2 = await checkRateLimit(userId);
  expect(result2).toBe(true); // Second request blocked
  
  // Wait for TTL expiration
  await sleep(31000);
  
  const result3 = await checkRateLimit(userId);
  expect(result3).toBe(false); // Allowed after expiration
});

// Test: JSON parsing fallback for malformed code fix
test('lesson generator handles malformed code fix JSON', async () => {
  const malformedFix = 'This is not JSON';
  const problematicCode = 'def foo(x=[]):';
  
  const result = parseCodeFix(malformedFix, problematicCode);
  
  expect(result.before).toBe(problematicCode);
  expect(result.after).toBe(problematicCode);
  expect(result.comment).toContain('Unable to generate fix');
});
```

### Property-Based Testing

**Scope**: Universal properties that hold across all valid inputs

**Framework**: fast-check for JavaScript/TypeScript

**Configuration**: Minimum 100 iterations per property test

**Tagging Convention**: Each test references its design property
```javascript
// Feature: veda-learn-aws-edition, Property 1: Configuration round-trip
```

**Property Test Categories:**

1. **Data Serialization Properties**
   - Round-trip properties for JSON encoding/decoding
   - DynamoDB item serialization
   - JWT token encoding/decoding

2. **API Contract Properties**
   - All REST endpoints return valid JSON
   - WebSocket messages conform to schema
   - Error responses include required fields

3. **Business Logic Properties**
   - Streak calculation consistency
   - Skill score bounds (0-100)
   - Rate limit timing guarantees

4. **State Invariants**
   - User records maintain required fields
   - Lesson status transitions are valid
   - WebSocket connections are unique per user

**Example Property Tests:**

```javascript
// Property: JWT encoding/decoding round-trip
fc.assert(
  fc.property(
    fc.record({
      userId: fc.string(),
      username: fc.string()
    }),
    (payload) => {
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
      const decoded = jwt.verify(token, JWT_SECRET);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.username).toBe(payload.username);
    }
  ),
  { numRuns: 100 }
);

// Property: Skill score always capped at 100
fc.assert(
  fc.property(
    fc.integer({ min: 0, max: 100 }), // Initial score
    fc.integer({ min: 1, max: 50 }),  // Points to add
    (initialScore, pointsToAdd) => {
      const newScore = Math.min(initialScore + pointsToAdd, 100);
      expect(newScore).toBeLessThanOrEqual(100);
      expect(newScore).toBeGreaterThanOrEqual(initialScore);
    }
  ),
  { numRuns: 100 }
);

// Property: Streak increments only when lastActive = yesterday
fc.assert(
  fc.property(
    fc.integer({ min: 0, max: 365 }), // Current streak
    fc.date(),                         // Last active date
    fc.date(),                         // Current date
    (currentStreak, lastActive, currentDate) => {
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const newStreak = calculateStreak(currentStreak, lastActive, currentDate);
      
      if (isSameDay(lastActive, yesterday)) {
        expect(newStreak).toBe(currentStreak + 1);
      } else if (isSameDay(lastActive, currentDate)) {
        expect(newStreak).toBe(currentStreak);
      } else {
        expect(newStreak).toBe(1);
      }
    }
  ),
  { numRuns: 100 }
);
```

### Test Coverage Goals

- **Unit Test Coverage**: 80% line coverage for Lambda functions
- **Property Test Coverage**: All data transformations and business logic
- **Integration Test Coverage**: All critical user flows
- **E2E Test Coverage**: Happy path for each major feature

### Testing Infrastructure

**Local Development:**
- Use `serverless-offline` for local Lambda testing
- Mock DynamoDB with `dynamodb-local`
- Mock OpenRouter API responses
- Use VS Code Extension Test Runner

**CI/CD Pipeline:**
- Run unit tests on every commit
- Run property tests on pull requests
- Run integration tests before deployment
- Generate coverage reports

**Test Data Management:**
- Use factories for generating test data
- Seed test database with known states
- Clean up test data after each run
- Use separate AWS account for testing

### Manual Testing Checklist

**Pre-Release Validation:**
- [ ] GitHub OAuth flow completes successfully
- [ ] WebSocket connection establishes and reconnects
- [ ] Code analysis triggers after 30-second debounce
- [ ] Lesson renders with all three panels
- [ ] Audio plays automatically at 0.95x speed
- [ ] Mermaid diagram renders correctly
- [ ] Quiz appears 30 seconds after "Got it ✓"
- [ ] Confetti animation plays on correct answer
- [ ] Progress tab shows skill score and streak
- [ ] Deep dive button generates extended explanation
- [ ] Rate limiter prevents spam (30-second cooldown)
- [ ] All error scenarios display user-friendly messages

