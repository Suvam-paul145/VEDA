# Veda Learn - Project Structure

This document provides a complete overview of the project structure and file organization.

## Directory Tree

```
veda-learn/
│
├── 📁 veda-learn-api/                    # Lambda Backend (Node.js 20.x)
│   │
│   ├── 📁 handlers/                      # Lambda Function Handlers
│   │   ├── auth.js                       # GitHub OAuth + JWT issuance
│   │   ├── analyze.js                    # Code analysis with Haiku classifier
│   │   ├── lesson.js                     # Lesson generation (parallel AI calls)
│   │   ├── quiz.js                       # Quiz generation with Haiku
│   │   ├── progress.js                   # GET user progress
│   │   ├── progressUpdate.js             # POST progress updates (streak, score)
│   │   ├── wsConnect.js                  # WebSocket $connect handler
│   │   └── wsDisconnect.js               # WebSocket $disconnect handler
│   │
│   ├── 📁 lib/                           # Shared Library Functions
│   │   ├── openrouter.js                 # OpenRouter API client
│   │   ├── dynamodb.js                   # DynamoDB helper functions
│   │   ├── opensearch.js                 # OpenSearch + RAG utilities
│   │   ├── polly.js                      # Amazon Polly TTS + S3 upload
│   │   ├── rateLimit.js                  # DynamoDB TTL rate limiter
│   │   └── websocket.js                  # WebSocket push utility
│   │
│   ├── 📁 seed/                          # Database Seeding Scripts
│   │   ├── create_index.py               # Create OpenSearch vector index
│   │   └── seed_concepts.js              # Seed concept definitions
│   │
│   ├── 📁 tests/                         # Unit and Integration Tests
│   │   ├── handlers/                     # Handler tests
│   │   ├── lib/                          # Library tests
│   │   └── integration/                  # E2E tests
│   │
│   ├── 📄 .env                           # Environment variables (DO NOT COMMIT)
│   ├── 📄 .env.example                   # Example environment file
│   ├── 📄 .gitignore                     # Git ignore rules
│   ├── 📄 package.json                   # Node.js dependencies
│   ├── 📄 serverless.yml                 # Serverless Framework config
│   └── 📄 jest.config.js                 # Jest test configuration
│
├── 📁 veda-learn-extension/              # VS Code Extension (TypeScript)
│   │
│   ├── 📁 src/                           # TypeScript Source Code
│   │   ├── extension.ts                  # Main extension entry point
│   │   ├── auth.ts                       # GitHub OAuth handler
│   │   ├── watcher.ts                    # Code change watcher (30s debounce)
│   │   ├── websocket.ts                  # WebSocket manager
│   │   ├── sidebar.ts                    # Webview sidebar provider
│   │   ├── config.ts                     # Configuration constants
│   │   └── types.ts                      # TypeScript type definitions
│   │
│   ├── 📁 resources/                     # Static Assets
│   │   ├── icon.png                      # Extension icon
│   │   ├── logo.svg                      # Veda logo
│   │   └── webview/                      # Webview HTML/CSS/JS
│   │       ├── index.html                # Sidebar webview template
│   │       ├── styles.css                # Webview styles
│   │       └── script.js                 # Webview client-side logic
│   │
│   ├── 📁 out/                           # Compiled JavaScript (generated)
│   │   └── ...                           # TypeScript compilation output
│   │
│   ├── 📁 test/                          # Extension Tests
│   │   ├── suite/                        # Test suites
│   │   └── runTest.ts                    # Test runner
│   │
│   ├── 📄 .gitignore                     # Git ignore rules
│   ├── 📄 .vscodeignore                  # VS Code packaging ignore
│   ├── 📄 package.json                   # Extension manifest + dependencies
│   ├── 📄 tsconfig.json                  # TypeScript configuration
│   └── 📄 README.md                      # Extension README
│
├── 📁 .kiro/                             # Kiro Spec Files
│   └── 📁 specs/
│       └── 📁 veda-learn-aws-edition/
│           ├── 📄 .config.kiro           # Spec configuration
│           ├── 📄 requirements.md        # Detailed requirements (23 reqs)
│           ├── 📄 design.md              # System design document
│           └── 📄 tasks.md               # Implementation tasks (24 tasks)
│
├── 📁 references/                        # Documentation & References
│   ├── 📄 veda-learn-aws-roadmap.md      # 4-day build plan
│   └── 📄 veda-system-design.html        # Interactive architecture diagram
│
├── 📁 docs/                              # Additional Documentation
│   ├── 📄 api-contracts.md               # API endpoint specifications
│   ├── 📄 database-schema.md             # DynamoDB schema details
│   └── 📄 deployment-guide.md            # Production deployment guide
│
├── 📄 .gitignore                         # Root git ignore
├── 📄 LICENSE                            # MIT License
├── 📄 README.md                          # Project overview
├── 📄 SETUP.md                           # Complete setup guide
├── 📄 AWS_SETUP_COMMANDS.md              # AWS CLI commands reference
└── 📄 PROJECT_STRUCTURE.md               # This file
```

## File Descriptions

### Lambda Backend (`veda-learn-api/`)

#### Handlers
- **auth.js**: Handles GitHub OAuth flow, exchanges code for token, creates/updates user in DynamoDB, issues JWT
- **analyze.js**: Receives code from extension, checks rate limit, calls Haiku classifier, saves mistake, triggers lesson
- **lesson.js**: Generates lessons with 3 parallel OpenRouter calls, RAG context, Polly TTS, pushes via WebSocket
- **quiz.js**: Generates 2 MCQ questions using Haiku based on concept
- **progress.js**: Retrieves user progress (skill score, streak, learning profiles)
- **progressUpdate.js**: Updates progress after lesson completion (streak calculation, score increment)
- **wsConnect.js**: Handles WebSocket connection, verifies JWT, stores connectionId
- **wsDisconnect.js**: Handles WebSocket disconnection, removes connectionId

#### Libraries
- **openrouter.js**: Universal OpenRouter API client with model selection
- **dynamodb.js**: DynamoDB CRUD operations and helpers
- **opensearch.js**: OpenSearch queries, RAG context retrieval, Titan embeddings
- **polly.js**: Amazon Polly TTS synthesis, S3 upload, presigned URL generation
- **rateLimit.js**: DynamoDB TTL-based rate limiting (30s lesson lock, 20 req/min)
- **websocket.js**: WebSocket message pushing via ApiGatewayManagementApi

#### Configuration
- **.env**: Environment variables (API keys, AWS config, endpoints)
- **serverless.yml**: Serverless Framework configuration (functions, events, IAM role)
- **package.json**: Node.js dependencies and scripts

### VS Code Extension (`veda-learn-extension/`)

#### Source Code
- **extension.ts**: Main entry point, activates extension, registers commands and URI handler
- **auth.ts**: GitHub OAuth flow, JWT storage in SecretStorage
- **watcher.ts**: Monitors code changes with 30s debounce, sends analysis requests
- **websocket.ts**: WebSocket client, handles incoming lessons, auto-reconnect
- **sidebar.ts**: Webview provider, renders lessons, handles user interactions
- **config.ts**: Configuration constants (API URLs, timeouts)
- **types.ts**: TypeScript interfaces and types

#### Resources
- **icon.png**: Extension icon (128x128)
- **logo.svg**: Veda logo for sidebar
- **webview/**: HTML/CSS/JS for sidebar webview (three-panel layout)

#### Configuration
- **package.json**: Extension manifest (contributes, activation events, commands)
- **tsconfig.json**: TypeScript compiler options

### Spec Files (`.kiro/specs/veda-learn-aws-edition/`)

- **requirements.md**: 23 detailed requirements with acceptance criteria (EARS format)
- **design.md**: System architecture, component interfaces, data models, error handling
- **tasks.md**: 24 major tasks with 100+ sub-tasks for implementation

### Documentation (`references/`, `docs/`)

- **veda-learn-aws-roadmap.md**: Hour-by-hour 4-day build plan
- **veda-system-design.html**: Interactive architecture diagram with Mermaid
- **SETUP.md**: Complete setup guide (AWS, Lambda, Extension)
- **AWS_SETUP_COMMANDS.md**: Quick reference for AWS CLI commands

## Key Technologies by Directory

### `veda-learn-api/`
- **Runtime**: Node.js 20.x
- **Framework**: Serverless Framework v3
- **AWS Services**: Lambda, API Gateway, DynamoDB, S3, Polly, Bedrock, OpenSearch
- **AI**: OpenRouter API (Claude Haiku, Sonnet, Opus; Gemini Flash)
- **Testing**: Jest

### `veda-learn-extension/`
- **Language**: TypeScript
- **Platform**: VS Code Extension API
- **UI**: Webview (HTML/CSS/JS)
- **Communication**: WebSocket (ws library), REST (fetch)
- **Testing**: VS Code Test Runner

## Data Flow

```
1. Developer types code
   ↓
2. extension.ts → watcher.ts (30s debounce)
   ↓
3. POST /api/analyze → analyze.js
   ↓
4. OpenRouter Haiku classifier
   ↓
5. Save to DynamoDB → Trigger lesson.js
   ↓
6. Parallel: Sonnet (explanation + fix) + Gemini (diagram)
   ↓
7. OpenSearch RAG context + Polly TTS
   ↓
8. S3 upload → Presigned URL
   ↓
9. WebSocket push → websocket.ts
   ↓
10. sidebar.ts renders lesson + plays audio
```

## Environment Variables

### Required in `.env`
```bash
OPENROUTER_API_KEY          # OpenRouter API key
GITHUB_CLIENT_ID            # GitHub OAuth client ID
GITHUB_CLIENT_SECRET        # GitHub OAuth client secret
JWT_SECRET                  # Random 64-char string
AWS_REGION                  # us-east-1
AWS_ACCESS_KEY_ID           # AWS credentials
AWS_SECRET_ACCESS_KEY       # AWS credentials
OPENSEARCH_ENDPOINT         # OpenSearch collection URL
S3_AUDIO_BUCKET             # veda-learn-audio
S3_CONCEPTS_BUCKET          # veda-learn-concepts
WS_API_ENDPOINT             # WebSocket API URL
```

## Build Commands

### Lambda Backend
```bash
cd veda-learn-api
npm install                 # Install dependencies
npm test                    # Run tests
npx serverless deploy       # Deploy to AWS
npx serverless logs -f analyze  # View logs
```

### VS Code Extension
```bash
cd veda-learn-extension
npm install                 # Install dependencies
npm run compile             # Compile TypeScript
npm run watch               # Watch mode
npm test                    # Run tests
npm run package             # Create .vsix package
```

## Next Steps

1. **Set up AWS infrastructure** - Follow `AWS_SETUP_COMMANDS.md`
2. **Configure environment** - Copy `.env.example` to `.env` and fill in values
3. **Deploy Lambda backend** - Run `npx serverless deploy`
4. **Install extension** - Press F5 in VS Code to test
5. **Implement handlers** - Follow `tasks.md` for step-by-step implementation

## Support

- See `SETUP.md` for detailed setup instructions
- See `tasks.md` for implementation tasks
- See `requirements.md` and `design.md` for specifications
