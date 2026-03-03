# Implementation Plan: Veda Learn - AWS Edition

## Overview

This implementation plan follows a 4-day build schedule to create a fully serverless VS Code extension that teaches developers by detecting code mistakes and delivering interactive lessons with voice narration. The system uses AWS services (Lambda, API Gateway, DynamoDB, OpenSearch, S3, Polly, Bedrock) for infrastructure and OpenRouter API for AI inference.

The implementation is organized into 4 days with 5 hours per day, following the detailed roadmap. Each task builds incrementally, with checkpoints to validate progress before moving forward.

## Tasks

- [ ] 1. AWS Infrastructure Setup (Day 1, Hour 1)
  - Set up all AWS services before writing any code
  - Configure IAM roles, DynamoDB tables, S3 buckets, OpenSearch collection, Bedrock access
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_

  - [ ] 1.1 Install and configure AWS CLI
    - Install AWS CLI for the operating system
    - Run `aws configure` with IAM credentials
    - Set default region to us-east-1
    - _Requirements: 22.2_

  - [ ] 1.2 Create IAM role for Lambda functions
    - Create `veda-lambda-role` in IAM console
    - Attach required policies: DynamoDB, Polly, S3, Bedrock, OpenSearch, API Gateway, CloudWatch, Lambda execution
    - Note the role ARN for serverless.yml configuration
    - _Requirements: 22.3_

  - [ ] 1.3 Create DynamoDB tables
    - Create veda-users table with userId partition key
    - Create veda-mistakes table with mistakeId partition key and userId GSI
    - Create veda-lessons table with lessonId partition key and userId GSI
    - Create veda-profiles table with userId partition key and language sort key
    - Create veda-ws-connections table with userId partition key
    - Create veda-rate-limits table with lockKey partition key and TTL enabled
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9_

  - [ ] 1.4 Create S3 buckets
    - Create veda-learn-audio bucket for Polly MP3 files
    - Create veda-learn-concepts bucket for RAG seed documents
    - Configure CORS on audio bucket to allow GET requests from all origins
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_


  - [ ] 1.5 Create OpenSearch Serverless collection
    - Create encryption, network, and data access security policies
    - Create veda-concepts collection with VECTORSEARCH type
    - Wait for collection to become ACTIVE (~2 minutes)
    - Note the collection endpoint URL for environment variables
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ] 1.6 Create OpenSearch vector index
    - Write Python script to create concept-embeddings index
    - Configure index with k-NN enabled, 1024-dimensional embedding field
    - Set HNSW method with FAISS engine and innerproduct space type
    - Run script to create index in OpenSearch collection
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ] 1.7 Enable Bedrock Titan Embeddings access
    - Navigate to Amazon Bedrock console
    - Request model access for Amazon Titan Text Embeddings V2
    - Verify access is granted (instant approval)
    - _Requirements: 14.2_

  - [ ] 1.8 Set up OpenRouter API account
    - Sign up at openrouter.ai
    - Add $10 credit to account
    - Create API key named "veda-learn-aws"
    - Save API key for environment variables
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_

  - [ ] 1.9 Create GitHub OAuth application
    - Navigate to github.com/settings/applications/new
    - Set application name to "Veda Learn"
    - Configure homepage and callback URLs (will update after API Gateway deployment)
    - Save client ID and client secret for environment variables
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ] 1.10 Create .env file with all configuration
    - Add OpenRouter API key
    - Add GitHub OAuth client ID and secret
    - Generate random JWT secret (64 characters)
    - Add AWS region and credentials
    - Add OpenSearch endpoint URL
    - Add S3 bucket names
    - Placeholder for WebSocket API endpoint (fill after deployment)
    - _Requirements: 22.4_

- [ ] 2. Serverless Framework and API Gateway Configuration (Day 1, Hour 2)
  - Set up Lambda project structure with Serverless Framework
  - Configure REST and WebSocket API Gateway endpoints
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10, 22.1, 22.2, 22.3, 22.4, 22.5, 22.6_


  - [ ] 2.1 Initialize Lambda project structure
    - Create veda-learn-api directory
    - Initialize npm project with package.json
    - Create handlers/ and lib/ subdirectories
    - Install AWS SDK dependencies (@aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, @aws-sdk/client-polly, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, @aws-sdk/client-bedrock-runtime)
    - Install OpenSearch and utility dependencies (@opensearch-project/opensearch, aws4, jsonwebtoken, axios, node-fetch)
    - Install Serverless Framework as dev dependency
    - _Requirements: 22.1, 22.2_

  - [ ] 2.2 Create serverless.yml configuration
    - Configure service name, framework version, and provider settings
    - Set Node.js 20.x runtime and us-east-1 region
    - Reference veda-lambda-role IAM role ARN
    - Define environment variables from .env file
    - Configure REST API endpoints: auth callback, analyze, lesson, quiz, progress get/update
    - Configure WebSocket API endpoints: $connect, $disconnect
    - Set appropriate timeout values (30s for analyze, 60s for lesson, 15s for quiz)
    - Enable CORS for all REST endpoints
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10, 22.1, 22.2, 22.3, 22.4, 22.5, 22.6_

  - [ ] 2.3 Deploy Serverless stack to AWS
    - Run `npx serverless deploy` command
    - Note the REST API endpoint URL
    - Note the WebSocket API endpoint URL
    - Update .env file with WS_API_ENDPOINT value
    - Update GitHub OAuth callback URL with actual REST API endpoint
    - _Requirements: 22.1, 22.5_

- [ ] 3. GitHub OAuth Authentication and JWT (Day 1, Hour 3)
  - Implement GitHub OAuth flow with Lambda
  - Generate and issue JWT tokens
  - Store user records in DynamoDB
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ] 3.1 Create auth handler Lambda function
    - Create handlers/auth.js file
    - Implement callback function to handle OAuth code parameter
    - Exchange OAuth code for GitHub access token via GitHub API
    - Fetch user profile from GitHub API using access token
    - Create userId in format "gh_{githubId}"
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 3.2 Implement user record creation in DynamoDB
    - Upsert user record to veda-users table
    - Include userId, githubId, username, email, avatarUrl, skillScore (0), streakDays (0), lastActive, createdAt
    - Use ConditionExpression to prevent overwriting existing users
    - Ignore ConditionalCheckFailedException errors (idempotent operation)
    - _Requirements: 1.4, 17.7_

  - [ ] 3.3 Generate and return JWT token
    - Sign JWT with userId and username payload
    - Set 30-day expiration
    - Use JWT_SECRET from environment variables
    - Redirect to VS Code custom URI with token as query parameter (vscode://veda-learn.veda-learn/auth?token=...)
    - _Requirements: 1.5, 1.6_


  - [ ]* 3.4 Write unit tests for auth handler
    - Test OAuth code exchange with valid and invalid codes
    - Test GitHub API user profile fetch
    - Test JWT generation and expiration
    - Test DynamoDB user record creation with conditional expression
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [ ] 4. VS Code Extension Scaffold and WebSocket Connection (Day 1, Hour 4)
  - Create VS Code extension project
  - Implement OAuth URI handler
  - Establish WebSocket connection with authentication
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 21.1, 21.2, 21.3_

  - [ ] 4.1 Generate VS Code extension project
    - Run Yeoman generator for TypeScript extension
    - Name extension "veda-learn"
    - Install ws and @types/ws dependencies
    - _Requirements: 21.1, 21.2_

  - [ ] 4.2 Configure extension manifest (package.json)
    - Add activity bar view container with mortar-board icon
    - Register webview sidebar panel
    - Enable URI handler capability
    - Define extension activation events
    - _Requirements: 21.1, 21.2, 21.3_

  - [ ] 4.3 Implement OAuth URI handler
    - Register URI handler in extension activation
    - Parse token from vscode://veda-learn.veda-learn/auth?token=... URI
    - Store JWT token in VS Code SecretStorage
    - Display success notification to user
    - Trigger WebSocket connection after successful authentication
    - _Requirements: 1.6, 1.7, 21.3_

  - [ ] 4.4 Implement WebSocket manager
    - Create WebSocket connection to API Gateway with JWT as query parameter
    - Handle incoming messages and route to appropriate handlers
    - Implement automatic reconnection with 5-second delay on connection close
    - Handle connection errors gracefully
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 16.3_

  - [ ] 4.5 Auto-connect WebSocket on extension startup
    - Check for existing JWT token in SecretStorage on activation
    - Automatically establish WebSocket connection if token exists
    - _Requirements: 2.1, 2.4_

- [ ] 5. Shared Library Components (Day 1, Hour 5)
  - Create reusable library functions for Lambda handlers
  - Implement OpenRouter client, WebSocket pusher, and DynamoDB helpers
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_

  - [ ] 5.1 Create OpenRouter API client
    - Create lib/openrouter.js file
    - Implement callOpenRouter function with model, systemPrompt, userPrompt, maxTokens parameters
    - Make POST request to OpenRouter API with proper headers (Authorization, HTTP-Referer, X-Title)
    - Parse and return message content from response
    - Handle API errors and throw descriptive error messages
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_


  - [ ] 5.2 Create WebSocket pusher utility
    - Create lib/websocket.js file
    - Implement pushToClient function that takes userId and payload
    - Retrieve connectionId from veda-ws-connections DynamoDB table
    - Use ApiGatewayManagementApi to post message to connection
    - Handle missing connectionId gracefully (user not connected)
    - _Requirements: 16.5_

  - [ ] 5.3 Create WebSocket connection handlers
    - Create handlers/wsConnect.js for $connect route
    - Verify JWT token from query parameters
    - Store userId and connectionId in veda-ws-connections table
    - Return 200 on success, 401 on invalid token
    - Create handlers/wsDisconnect.js for $disconnect route
    - Remove connectionId from veda-ws-connections table
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_

  - [ ]* 5.4 Write unit tests for shared libraries
    - Test OpenRouter client with valid and invalid API keys
    - Test WebSocket pusher with existing and missing connectionIds
    - Test WebSocket handlers with valid and invalid JWT tokens
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_

- [ ] 6. Checkpoint - Day 1 Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Code Change Monitoring with Debounce (Day 2, Hour 6)
  - Implement passive watcher in VS Code extension
  - Add 30-second debounce timer
  - Send analysis requests to REST API
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ] 7.1 Implement document change listener
    - Register onDidChangeTextDocument event listener in extension activation
    - Maintain debounce map keyed by document URI
    - Clear existing timer when new change occurs
    - _Requirements: 3.1, 3.2_

  - [ ] 7.2 Implement debounce timer logic
    - Set 30-second timeout after document change (5 seconds in demo mode)
    - Collect file content, language ID, file name, cursor line, and diagnostics
    - Send POST request to /api/analyze endpoint with JWT bearer token
    - Remove timer from debounce map after execution
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.7_

  - [ ] 7.3 Add status bar indicator
    - Create status bar item with "$(eye) Veda watching..." text
    - Position on right side of status bar
    - Show status bar item when extension is active
    - _Requirements: 3.6_

  - [ ]* 7.4 Write unit tests for watcher
    - Test debounce timer resets on new changes
    - Test analysis request is sent after debounce period
    - Test demo mode uses 5-second debounce
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_


- [ ] 8. Code Mistake Detection with Rate Limiting (Day 2, Hour 7)
  - Implement Haiku classifier Lambda function
  - Add DynamoDB TTL-based rate limiting
  - Save detected mistakes to DynamoDB
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ] 8.1 Create rate limiter utility
    - Create lib/rateLimit.js file
    - Implement checkRateLimit function that takes userId
    - Create lock entry in veda-rate-limits table with 30-second TTL
    - Use ConditionExpression to prevent duplicate locks
    - Return false if lock created (no rate limit), true if lock exists (rate limited)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ] 8.2 Create analyze handler Lambda function
    - Create handlers/analyze.js file
    - Verify JWT token from Authorization header
    - Parse request body for fileContent, language, cursorLine, diagnostics
    - Check rate limiter before processing
    - Return cooldown response if rate limited
    - _Requirements: 4.1, 4.2, 5.2, 5.3_

  - [ ] 8.3 Implement Haiku classifier
    - Call OpenRouter API with claude-haiku-4-5 model
    - Send code analysis prompt requesting JSON response
    - Request fields: isMistake, confidence, mistakeType, conceptId, severity, problematicCode, lineNumber
    - Parse JSON response from AI
    - Return no-teaching response if confidence < 0.85 or isMistake is false
    - _Requirements: 4.4, 4.5, 4.6, 20.1_

  - [ ] 8.4 Save mistake to DynamoDB
    - Generate UUID for mistakeId
    - Create mistake record in veda-mistakes table
    - Include mistakeId, userId, language, cursorLine, and all parsed fields from classifier
    - Add createdAt timestamp
    - _Requirements: 4.7, 17.8_

  - [ ] 8.5 Trigger asynchronous lesson generation
    - Import generateLesson function from lesson handler
    - Call generateLesson without awaiting (fire and forget)
    - Catch and log any errors
    - Return immediate response to VS Code with teach: true and mistakeId
    - _Requirements: 4.8, 4.9_

  - [ ]* 8.6 Write unit tests for analyze handler
    - Test JWT verification with valid and invalid tokens
    - Test rate limiter prevents concurrent requests
    - Test classifier with various code samples
    - Test confidence threshold filtering
    - Test mistake record creation in DynamoDB
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [ ] 9. Lesson Generation with Polly TTS (Day 2, Hour 8)
  - Implement parallel OpenRouter calls for lesson content
  - Generate audio with Amazon Polly
  - Upload audio to S3 and generate presigned URLs
  - Push complete lesson via WebSocket
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_


  - [ ] 9.1 Create Polly TTS utility
    - Create lib/polly.js file
    - Implement synthesizeAndStore function with text and lessonId parameters
    - Call Amazon Polly with Ruth voice, generative engine, en-US language
    - Collect audio stream into buffer
    - Upload MP3 to S3 with key "lessons/{lessonId}.mp3"
    - Generate presigned URL with 1-hour expiration
    - Return presigned URL
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ] 9.2 Create lesson generator Lambda function
    - Create handlers/lesson.js file
    - Export generateLesson function that takes userId, mistakeId, mistake
    - Generate UUID for lessonId
    - Extract conceptId, problematicCode, language from mistake object
    - _Requirements: 7.1_

  - [ ] 9.3 Implement parallel OpenRouter calls
    - Make three parallel calls using Promise.all
    - Call 1: claude-sonnet-4-5 for explanation (conversational, under 120 words)
    - Call 2: claude-sonnet-4-5 for code fix (JSON with before, after, comment)
    - Call 3: google/gemini-2.0-flash-001 for Mermaid diagram
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 20.2, 20.3, 20.4_

  - [ ] 9.4 Parse code fix JSON with fallback
    - Try to parse code fix response as JSON
    - Extract before, after, comment fields
    - On parse error, use problematicCode for both before and after with fallback comment
    - _Requirements: 7.6, 7.7, 16.5_

  - [ ] 9.5 Generate audio and save lesson
    - Call synthesizeAndStore with explanation text
    - Save lesson record to veda-lessons table in parallel with audio generation
    - Include lessonId, userId, mistakeId, conceptId, explanation, codeFix, diagram, status (pending), createdAt
    - _Requirements: 7.8, 7.9, 17.9_

  - [ ] 9.6 Push lesson to client via WebSocket
    - Call pushToClient with userId and lesson payload
    - Include type: "lesson" and complete lesson object
    - Include audioUrl from Polly presigned URL
    - _Requirements: 7.10_

  - [ ]* 9.7 Write unit tests for lesson generator
    - Test parallel OpenRouter calls complete successfully
    - Test JSON parsing with valid and malformed responses
    - Test Polly audio generation and S3 upload
    - Test lesson record creation in DynamoDB
    - Test WebSocket push with valid and missing connectionIds
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_


- [ ] 10. Three-Panel Sidebar UI with Audio Playback (Day 2, Hour 9)
  - Create webview sidebar panel
  - Render lesson with three panels (explanation, code diff, diagram)
  - Implement Polly audio playback with controls
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 21.4, 21.5, 21.6, 21.7, 21.8_

  - [ ] 10.1 Create sidebar webview provider
    - Create sidebar provider class implementing WebviewViewProvider
    - Register provider in extension activation
    - Set up HTML content with CDN imports (Mermaid.js, highlight.js, canvas-confetti)
    - _Requirements: 21.2_

  - [ ] 10.2 Implement lesson rendering
    - Create three-panel layout with CSS grid
    - Panel 1: Explanation text with severity badge
    - Panel 2: Before/After code diff with syntax highlighting
    - Panel 3: Mermaid diagram rendered as SVG
    - Add staggered slide-in animations (0ms, 150ms, 300ms delays)
    - _Requirements: 9.2, 9.3, 9.4, 21.4, 21.5_

  - [ ] 10.3 Implement severity badges
    - Display color-coded badges based on mistakeType
    - Red for security, yellow for performance, orange for anti-pattern, blue for style
    - _Requirements: 21.5_

  - [ ] 10.4 Implement Polly audio playback
    - Create Audio element with audioUrl from lesson
    - Set playback rate to 0.95 for clarity
    - Auto-play audio when lesson is received
    - Handle null audioUrl by falling back to Web Speech API
    - _Requirements: 9.5, 9.6, 9.7, 9.8_

  - [ ] 10.5 Add audio control buttons
    - Implement replay button to restart audio from beginning
    - Implement mute button to pause and reset audio
    - Display waveform animation while audio is playing
    - _Requirements: 9.9, 9.10, 21.8_

  - [ ] 10.6 Handle WebSocket messages
    - Listen for messages from WebSocket manager
    - Parse lesson data from message payload
    - Call renderLesson and playAudio functions
    - _Requirements: 9.1_

  - [ ]* 10.7 Write integration tests for sidebar
    - Test lesson rendering with mock data
    - Test audio playback with valid and null URLs
    - Test control buttons (replay, mute)
    - Test WebSocket message handling
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 21.4, 21.5, 21.6, 21.7, 21.8_

- [ ] 11. Integration Testing (Day 2, Hour 10)
  - Test end-to-end flow with real code samples
  - Verify all components work together
  - _Requirements: All Day 1 and Day 2 requirements_

  - [ ] 11.1 Test Python mutable default bug
    - Write Python code with mutable default argument
    - Verify watcher triggers after 30 seconds
    - Verify Haiku classifier detects mistake
    - Verify lesson is generated and pushed via WebSocket
    - Verify all three panels render correctly
    - Verify Polly audio plays automatically
    - _Requirements: 3.1, 3.2, 3.3, 4.4, 4.5, 4.6, 7.2, 7.3, 7.4, 9.2, 9.3, 9.4, 9.5_


  - [ ] 11.2 Test JavaScript callback hell
    - Write JavaScript code with nested callbacks
    - Verify classifier detects callback-hell pattern
    - Verify lesson generation completes
    - Verify diagram renders correctly
    - _Requirements: 3.1, 3.2, 3.3, 4.4, 4.5, 4.6, 7.2, 7.3, 7.4, 9.2, 9.3, 9.4_

  - [ ] 11.3 Test TypeScript any-type abuse
    - Write TypeScript code with any type
    - Verify classifier detects any-type pattern
    - Verify complete lesson delivery
    - Check CloudWatch Logs for any errors
    - _Requirements: 3.1, 3.2, 3.3, 4.4, 4.5, 4.6, 7.2, 7.3, 7.4, 9.2, 9.3, 9.4_

- [ ] 12. Checkpoint - Day 2 Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. RAG System with Titan Embeddings and OpenSearch (Day 3, Hour 11)
  - Seed concept knowledge base
  - Implement RAG context retrieval
  - Integrate RAG context into lesson generation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10_

  - [ ] 13.1 Create concept seed data
    - Define 10 concept objects with id and content
    - Include: mutable-default, callback-hell, any-type, null-ref, n-plus-one, sql-injection, memory-leak, dry-violation, god-object, missing-usememo
    - Write comprehensive content explaining each concept
    - _Requirements: 14.10_

  - [ ] 13.2 Create seed script for OpenSearch
    - Create handlers/seed.js file
    - Initialize Bedrock Runtime client for Titan Embeddings
    - Initialize OpenSearch client with AWS Sigv4 authentication
    - Implement getTitanEmbedding function to generate 1024-dimensional embeddings
    - _Requirements: 14.2, 14.3_

  - [ ] 13.3 Implement concept seeding logic
    - Iterate through concept definitions
    - Generate embedding for each concept content using Titan
    - Index document in OpenSearch with conceptId, content, and embedding fields
    - Log confirmation for each seeded concept
    - Run script once to populate knowledge base
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [ ] 13.4 Create RAG query utility
    - Create lib/opensearch.js file
    - Implement ragQuery function that takes conceptId
    - Generate embedding for query using Titan
    - Perform k-NN search in OpenSearch with k=3
    - Extract and concatenate content from top 3 results
    - Return combined context string
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 13.5 Integrate RAG into lesson generation
    - Import ragQuery in handlers/lesson.js
    - Call ragQuery before parallel OpenRouter calls
    - Prepend RAG context to explanation system prompt
    - _Requirements: 7.2_

  - [ ]* 13.6 Write unit tests for RAG system
    - Test Titan embedding generation
    - Test OpenSearch k-NN search
    - Test RAG context retrieval with various conceptIds
    - Test lesson generation includes RAG context
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 14.1, 14.2, 14.3, 14.4, 14.5_


- [ ] 14. Progress Tracking and Streak Management (Day 3, Hour 12)
  - Implement progress update handler
  - Calculate streak logic
  - Update skill scores
  - Track learning profiles by language
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11, 11.12, 11.13, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [ ] 14.1 Create progress update handler
    - Create handlers/progressUpdate.js file
    - Verify JWT token from Authorization header
    - Parse request body for lessonId, rating, quizPassed, conceptId, language
    - _Requirements: 11.1, 11.2_

  - [ ] 14.2 Mark lesson as completed
    - Update lesson status to "completed" in veda-lessons table
    - Store feedback rating from user
    - _Requirements: 11.3_

  - [ ] 14.3 Implement streak calculation logic
    - Retrieve user record from veda-users table
    - Calculate today's date and yesterday's date
    - If lastActive equals yesterday, increment streak by 1
    - If lastActive equals today, maintain current streak
    - Otherwise, reset streak to 1
    - _Requirements: 11.4, 11.5, 11.6, 11.7, 11.8_

  - [ ] 14.4 Update skill score
    - Add 3 points if quiz passed, 1 point if not passed
    - Cap skill score at 100
    - Update user record with new skillScore, streakDays, and lastActive
    - _Requirements: 11.9, 11.10, 11.11_

  - [ ] 14.5 Update learning profile
    - Upsert record in veda-profiles table with userId and language
    - Increment lessonsCompleted by 1
    - Update updatedAt timestamp
    - _Requirements: 11.12, 11.13_

  - [ ] 14.6 Create progress retrieval handler
    - Create handlers/progress.js file
    - Implement GET handler for /api/progress/{userId}
    - Verify JWT token
    - Retrieve user record from DynamoDB
    - Return skillScore, streakDays, and learning profile data
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 14.7 Create progress display in webview
    - Add Progress tab to sidebar
    - Render circular SVG visualization of skill score
    - Display fire emoji with streak number
    - Show top 3 languages with lesson counts
    - Animate skill score number counting up
    - _Requirements: 12.5, 12.6, 12.7_

  - [ ]* 14.8 Write unit tests for progress tracking
    - Test streak calculation with various date scenarios
    - Test skill score updates and capping at 100
    - Test learning profile updates
    - Test progress retrieval
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11, 11.12, 11.13, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_


- [ ] 15. Quiz Generation and Evaluation (Day 3, Hour 13)
  - Implement quiz generator Lambda function
  - Create quiz UI in webview
  - Handle quiz interactions and scoring
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11_

  - [ ] 15.1 Create quiz generator handler
    - Create handlers/quiz.js file
    - Verify JWT token from Authorization header
    - Parse request body for conceptId and language
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 15.2 Generate quiz questions with Haiku
    - Call OpenRouter API with claude-haiku-4-5 model
    - Request 2 multiple-choice questions in JSON format
    - Parse JSON array containing questions with options and correct answers
    - Return quiz data to extension
    - _Requirements: 10.4, 10.5, 10.6, 10.7, 20.5_

  - [ ] 15.3 Implement quiz UI in webview
    - Add "Got it ✓" button to lesson card
    - Wait 30 seconds after button click
    - Send quiz request to REST API
    - Render question cards with 4 option buttons
    - _Requirements: 10.1, 10.2, 10.8_

  - [ ] 15.4 Handle quiz answer selection
    - On option click, reveal correct answer with green highlighting
    - Show incorrect selections with red highlighting
    - Display explanation text
    - _Requirements: 10.9, 10.10_

  - [ ] 15.5 Add confetti animation for correct answers
    - Trigger confetti with 80 particles when correct answer is selected
    - Use canvas-confetti library
    - _Requirements: 10.11_

  - [ ] 15.6 Send progress update after quiz
    - Call POST /api/progress/update with quiz result
    - Include quizPassed boolean based on user's answers
    - _Requirements: 11.1_

  - [ ]* 15.7 Write unit tests for quiz system
    - Test quiz generation with various concepts
    - Test JSON parsing of quiz questions
    - Test quiz UI rendering
    - Test answer selection and highlighting
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11_

- [ ] 16. Deep Dive Explanations (Day 3, Hour 14)
  - Implement deep dive handler with Opus model
  - Add deep dive button to lesson UI
  - Generate extended explanations with TTS
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 20.6_

  - [ ] 16.1 Create deep dive handler
    - Add deepHandler function to handlers/lesson.js
    - Configure as POST /api/lesson/deep endpoint in serverless.yml
    - Verify JWT token
    - Parse request body for conceptId, language, problematicCode
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ] 16.2 Generate deep explanation with Opus
    - Call OpenRouter API with claude-opus-4-5 model
    - Request comprehensive explanation under 300 words
    - Cover: what, why, harm, examples, and solution
    - _Requirements: 13.4, 13.5, 20.6_


  - [ ] 16.3 Generate audio for deep explanation
    - Call synthesizeAndStore with deep explanation text
    - Use lessonId format "deep-{uuid}"
    - _Requirements: 13.6_

  - [ ] 16.4 Push deep lesson via WebSocket
    - Call pushToClient with type: "deep-lesson"
    - Include explanation and audioUrl
    - _Requirements: 13.7_

  - [ ] 16.5 Add deep dive button to lesson UI
    - Display "Deep Dive 🔍" button on every lesson card
    - Send manual request to /api/lesson/deep on click
    - Render deep explanation and auto-play audio
    - _Requirements: 13.1, 13.2, 13.8_

  - [ ]* 16.6 Write unit tests for deep dive
    - Test Opus model call with various concepts
    - Test audio generation for deep explanations
    - Test WebSocket push of deep lessons
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

- [ ] 17. Rate Limiting and Error Handling (Day 3, Hour 15)
  - Implement per-minute rate limiting
  - Add OpenRouter fallback models
  - Handle Polly errors gracefully
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

  - [ ] 17.1 Implement per-minute rate limiting
    - Add checkMinuteRateLimit function to lib/rateLimit.js
    - Create counter entry in veda-rate-limits table with minute-based key
    - Increment counter on each request
    - Block requests when count exceeds 20 per minute
    - Use TTL to auto-expire counters after 65 seconds
    - _Requirements: 5.6, 5.7_

  - [ ] 17.2 Add rate limit check to analyze handler
    - Call checkMinuteRateLimit before processing analysis
    - Return error response if rate limit exceeded
    - _Requirements: 5.6_

  - [ ] 17.3 Implement OpenRouter fallback
    - Create callOpenRouterWithFallback wrapper function
    - Catch 429 rate limit errors from OpenRouter
    - Retry with openai/gpt-4o-mini model on rate limit
    - Log fallback usage
    - _Requirements: 16.1_

  - [ ] 17.4 Add Polly error handling
    - Wrap synthesizeAndStore in try-catch
    - Return null audioUrl on Polly failure
    - Log error details to CloudWatch
    - Extension falls back to Web Speech API when audioUrl is null
    - _Requirements: 16.2, 16.7_

  - [ ] 17.5 Handle WebSocket connection errors
    - Log connection errors in WebSocket manager
    - Display connection status in status bar
    - Implement exponential backoff for reconnection attempts
    - _Requirements: 16.3_

  - [ ] 17.6 Handle DynamoDB errors
    - Catch ConditionalCheckFailedException and continue (idempotent operations)
    - Retry with exponential backoff for throughput errors
    - Log all errors to CloudWatch with context
    - _Requirements: 16.6_


  - [ ] 17.7 Handle JSON parsing errors
    - Wrap all JSON.parse calls in try-catch blocks
    - Provide fallback values for malformed responses
    - Log parsing errors with original text
    - _Requirements: 16.5_

  - [ ]* 17.8 Write unit tests for error handling
    - Test rate limiting with concurrent requests
    - Test OpenRouter fallback on 429 errors
    - Test Polly fallback to Web Speech API
    - Test DynamoDB error handling
    - Test JSON parsing with malformed data
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

- [ ] 18. Checkpoint - Day 3 Complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Demo Path Hardening (Day 4, Hour 16)
  - Add demo mode with reduced debounce
  - Pre-load demo code samples
  - Warm Lambda functions
  - Test complete flow multiple times
  - _Requirements: 3.7_

  - [ ] 19.1 Implement demo mode
    - Add VEDA_DEMO_MODE environment variable check
    - Reduce debounce timer to 5 seconds when demo mode is enabled
    - Add configuration setting in extension
    - _Requirements: 3.7_

  - [ ] 19.2 Create demo code samples
    - Prepare Python mutable default bug sample
    - Prepare JavaScript callback hell sample
    - Prepare TypeScript any-type sample
    - Save samples in workspace for quick access
    - _Requirements: 4.4, 4.5, 4.6_

  - [ ] 19.3 Create Lambda warm-up script
    - Write bash script to invoke each Lambda function once
    - Run script 5 minutes before demo to eliminate cold starts
    - Test that warm-up reduces response times
    - _Requirements: 22.1_

  - [ ] 19.4 Run end-to-end demo flow
    - Execute complete flow 5 times in a row
    - Verify all 5 runs complete without crashes
    - Test on exact device and network for demo
    - Time each step to ensure it fits in 3-minute window
    - _Requirements: All requirements_

- [ ] 20. UI Polish and Animations (Day 4, Hour 17)
  - Add Veda logo and branding
  - Implement animations and visual effects
  - Polish status indicators
  - _Requirements: 21.4, 21.5, 21.6, 21.7, 21.8_

  - [ ] 20.1 Create Veda logo SVG
    - Design logo with brain and graduation cap elements
    - Use 2-color scheme
    - Add logo to sidebar header
    - _Requirements: 21.1_

  - [ ] 20.2 Add status bar animations
    - Implement pulsing heartbeat animation for "Veda is watching..."
    - Update status bar based on connection state
    - _Requirements: 3.6_

  - [ ] 20.3 Implement panel slide-in animations
    - Add staggered CSS animations (0ms, 150ms, 300ms)
    - Ensure smooth transitions
    - _Requirements: 21.4_


  - [ ] 20.4 Enhance severity badges
    - Implement color-coded badges with icons
    - Red (🔴) for security, yellow (🟡) for performance, orange (🟠) for anti-pattern, blue (🔵) for style
    - _Requirements: 21.5_

  - [ ] 20.5 Add skill score animation
    - Implement counting animation for skill score number
    - Use CSS counter animation
    - _Requirements: 12.5_

  - [ ] 20.6 Add audio waveform animation
    - Display animated bars while Polly audio plays
    - Use CSS animations without external libraries
    - _Requirements: 21.8_

- [ ] 21. Pitch Deck and Documentation (Day 4, Hour 18)
  - Create 10-slide pitch deck
  - Prepare demo script
  - Document architecture and tech stack
  - _Requirements: All requirements_

  - [ ] 21.1 Create pitch deck slides
    - Slide 1: Hook with statistics
    - Slide 2: Problem statement
    - Slide 3: Insight and positioning
    - Slide 4: Product screenshot
    - Slide 5: How it works (3 steps)
    - Slide 6: Tech stack diagram
    - Slide 7: Live demo placeholder
    - Slide 8: Roadmap (built vs coming soon)
    - Slide 9: Market opportunity
    - Slide 10: Team and ask
    - _Requirements: All requirements_

  - [ ] 21.2 Write demo script
    - Create 3-minute script with timestamps
    - Include pauses for Polly audio playback
    - Practice timing and transitions
    - _Requirements: All requirements_

  - [ ] 21.3 Prepare judge Q&A responses
    - Answer for "vs GitHub Copilot?"
    - Answer for "Why AWS?"
    - Answer for "False positives?"
    - _Requirements: All requirements_

- [ ] 22. Backup Demo Video (Day 4, Hour 19)
  - Record complete demo flow
  - Edit and add captions
  - Upload to multiple platforms
  - _Requirements: All requirements_

  - [ ] 22.1 Record demo video
    - Use OBS Studio or Loom at 1080p
    - Record complete flow: Login → Type bug → Lesson → Quiz → Score update
    - Ensure Polly voice is audible
    - _Requirements: All requirements_

  - [ ] 22.2 Edit demo video
    - Trim to 2 minutes 30 seconds maximum
    - Add text captions for key moments
    - Ensure audio quality is clear
    - _Requirements: All requirements_

  - [ ] 22.3 Upload demo video
    - Upload to YouTube as unlisted
    - Upload to Google Drive as backup
    - Test playback on different device
    - _Requirements: All requirements_


- [ ] 23. GitHub README and Final Submission (Day 4, Hour 20)
  - Write comprehensive README
  - Create demo GIF
  - Rehearse pitch
  - Submit to hackathon
  - _Requirements: All requirements_

  - [ ] 23.1 Write GitHub README
    - Add problem statement (2 sentences)
    - Include setup instructions (5 steps)
    - Add architecture diagram
    - Include tech stack badges
    - Add demo GIF
    - _Requirements: All requirements_

  - [ ] 23.2 Create demo GIF
    - Record short demo with LICEcap or similar tool
    - Show key interaction: code → lesson → quiz
    - Optimize file size for GitHub
    - _Requirements: All requirements_

  - [ ] 23.3 Rehearse pitch
    - Practice pitch out loud 3 times
    - Time pitch to ensure under 3 minutes
    - Refine transitions and pauses
    - _Requirements: All requirements_

  - [ ] 23.4 Complete hackathon submission
    - Fill out submission form
    - Include all required links (GitHub, demo video, pitch deck)
    - Verify all links are accessible
    - Submit before deadline
    - _Requirements: All requirements_

- [ ] 24. Final Checkpoint - Project Complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the end of each day
- The implementation follows the 4-day roadmap with 5 hours per day
- AWS infrastructure setup (Task 1) must be completed before any code is written
- Lambda functions are deployed using Serverless Framework
- All AI inference uses OpenRouter API with appropriate models for each task
- Amazon Polly provides voice narration with fallback to Web Speech API
- DynamoDB TTL provides rate limiting without external services
- OpenSearch Serverless with Titan Embeddings enables RAG-based context retrieval
- WebSocket API provides real-time lesson delivery to VS Code extension
- The system is fully serverless and scales automatically

## Implementation Language

All Lambda functions are implemented in JavaScript (Node.js 20.x) and the VS Code extension is implemented in TypeScript, as specified in the design document.
