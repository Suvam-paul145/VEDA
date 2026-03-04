# Requirements Document

## Introduction

Veda Learn - AWS Edition is a VS Code extension that teaches developers by detecting code mistakes and providing interactive lessons in real-time. The system watches developers code, uses AI to detect anti-patterns and mistakes, generates comprehensive lessons with explanations and code fixes, and delivers them via WebSocket with voice narration. The extension uses AWS services (Lambda, API Gateway, DynamoDB, OpenSearch Serverless, S3, Amazon Polly) for infrastructure, OpenRouter API for AI inference, and Google Gemini text-embedding-004 for vector embeddings.

## Glossary

- **Extension**: The VS Code extension client application
- **Watcher**: The component that monitors code changes in the editor
- **Classifier**: The AI component that analyzes code for mistakes
- **Lesson_Generator**: The component that creates interactive lessons
- **Quiz_Engine**: The component that generates and evaluates quiz questions
- **Progress_Tracker**: The component that tracks user learning progress
- **Auth_Handler**: The Lambda function handling GitHub OAuth authentication
- **WebSocket_Manager**: The component managing WebSocket connections
- **RAG_System**: The Retrieval Augmented Generation system using OpenSearch and Titan embeddings
- **TTS_Engine**: The Amazon Polly text-to-speech engine
- **Rate_Limiter**: The component preventing excessive API calls
- **User**: A developer using the VS Code extension
- **Mistake**: A detected code anti-pattern, bug, or quality issue
- **Lesson**: An interactive teaching module with explanation, code fix, and diagram
- **Concept**: A programming pattern or principle (e.g., mutable-default, callback-hell)
- **Streak**: Consecutive days of learning activity
- **Skill_Score**: A numerical representation of user progress (0-100)


## Requirements

### Requirement 1: User Authentication

**User Story:** As a developer, I want to authenticate using my GitHub account, so that my learning progress is saved and tracked.

#### Acceptance Criteria

1. WHEN a User initiates authentication, THE Extension SHALL redirect to GitHub OAuth authorization page
2. WHEN GitHub OAuth callback is received with a valid code, THE Auth_Handler SHALL exchange the code for a GitHub access token
3. WHEN a GitHub access token is obtained, THE Auth_Handler SHALL fetch the User profile from GitHub API
4. WHEN a User profile is fetched, THE Auth_Handler SHALL create or update the User record in DynamoDB
5. WHEN a User record is created, THE Auth_Handler SHALL generate a JWT token with 30-day expiration
6. WHEN a JWT token is generated, THE Auth_Handler SHALL redirect to the Extension custom URI handler with the token
7. WHEN the Extension receives a JWT token, THE Extension SHALL store the token in VS Code SecretStorage
8. WHEN authentication fails, THE Auth_Handler SHALL return an HTTP 401 status code


### Requirement 2: WebSocket Connection Management

**User Story:** As a developer, I want a persistent connection to receive lessons in real-time, so that I get immediate feedback while coding.

#### Acceptance Criteria

1. WHEN a User authenticates successfully, THE Extension SHALL establish a WebSocket connection to API Gateway
2. WHEN establishing a WebSocket connection, THE Extension SHALL include the JWT token as a query parameter
3. WHEN a WebSocket connection request is received, THE WebSocket_Manager SHALL verify the JWT token
4. WHEN a JWT token is valid, THE WebSocket_Manager SHALL store the connectionId and userId in DynamoDB
5. WHEN a WebSocket connection is closed, THE WebSocket_Manager SHALL remove the connectionId from DynamoDB
6. WHEN a WebSocket connection fails, THE Extension SHALL attempt reconnection after 5 seconds
7. IF a JWT token is invalid, THEN THE WebSocket_Manager SHALL reject the connection with HTTP 401 status


### Requirement 3: Code Change Monitoring

**User Story:** As a developer, I want the extension to watch my code changes passively, so that it can detect mistakes without interrupting my workflow.

#### Acceptance Criteria

1. WHEN a text document changes in VS Code, THE Watcher SHALL capture the change event
2. WHEN a change event is captured, THE Watcher SHALL start a 30-second debounce timer
3. WHEN the debounce timer expires without new changes, THE Watcher SHALL collect the file content, language, file name, cursor line, and diagnostics
4. WHEN code context is collected, THE Watcher SHALL send an analysis request to the REST API
5. WHEN sending an analysis request, THE Watcher SHALL include the JWT token in the Authorization header
6. WHILE the Watcher is active, THE Extension SHALL display a status bar indicator showing "Veda watching..."
7. WHERE demo mode is enabled, THE Watcher SHALL use a 5-second debounce timer instead of 30 seconds


### Requirement 4: Code Mistake Detection

**User Story:** As a developer, I want the system to detect code mistakes and anti-patterns, so that I can learn from my errors.

#### Acceptance Criteria

1. WHEN an analysis request is received, THE Classifier SHALL verify the JWT token
2. WHEN a JWT token is verified, THE Classifier SHALL check the Rate_Limiter for active cooldown
3. IF a cooldown is active, THEN THE Classifier SHALL return a response indicating no teaching is needed
4. WHEN no cooldown is active, THE Classifier SHALL send the code to OpenRouter API using the claude-haiku-4-5 model
5. WHEN the AI response is received, THE Classifier SHALL parse the JSON response containing mistake detection results
6. WHEN confidence is below 0.85, THE Classifier SHALL return a response indicating no mistake was found
7. WHEN confidence is 0.85 or above, THE Classifier SHALL save the Mistake record to DynamoDB with mistakeId, userId, language, conceptId, severity, problematicCode, and lineNumber
8. WHEN a Mistake is saved, THE Classifier SHALL trigger asynchronous lesson generation
9. WHEN lesson generation is triggered, THE Classifier SHALL return a response indicating teaching is needed with the mistakeId


### Requirement 5: Rate Limiting

**User Story:** As a system administrator, I want to prevent excessive API calls, so that costs remain controlled and users don't spam the service.

#### Acceptance Criteria

1. WHEN a lesson generation is requested, THE Rate_Limiter SHALL check for an existing lock in DynamoDB
2. WHEN checking for a lock, THE Rate_Limiter SHALL use a key combining "lesson-lock" and userId
3. WHEN no lock exists, THE Rate_Limiter SHALL create a lock entry with 30-second TTL
4. WHEN a lock is created successfully, THE Rate_Limiter SHALL return false indicating no rate limit
5. IF a lock already exists, THEN THE Rate_Limiter SHALL return true indicating rate limit is active
6. WHEN an API request is received, THE Rate_Limiter SHALL check the per-minute request count
7. WHEN the per-minute count exceeds 20 requests, THE Rate_Limiter SHALL reject the request
8. WHEN a rate limit entry expires, THE DynamoDB TTL mechanism SHALL automatically delete the entry


### Requirement 6: RAG Context Retrieval

**User Story:** As a developer, I want lessons to include relevant background knowledge, so that I understand the broader context of the mistake.

#### Acceptance Criteria

1. WHEN lesson generation begins, THE RAG_System SHALL generate an embedding for the conceptId using Google Gemini text-embedding-004 API
2. WHEN an embedding is generated, THE RAG_System SHALL perform a k-NN search in OpenSearch Serverless with k=3
3. WHEN search results are returned, THE RAG_System SHALL extract the content from the top 3 matching documents
4. WHEN content is extracted, THE RAG_System SHALL concatenate the content with newline separators
5. WHEN RAG context is retrieved, THE Lesson_Generator SHALL include the context in the AI system prompt


### Requirement 7: Lesson Generation

**User Story:** As a developer, I want to receive comprehensive lessons with explanations, code fixes, and diagrams, so that I can understand and correct my mistakes.

#### Acceptance Criteria

1. WHEN lesson generation is triggered, THE Lesson_Generator SHALL retrieve RAG context for the conceptId
2. WHEN RAG context is retrieved, THE Lesson_Generator SHALL make three parallel OpenRouter API calls for explanation, code fix, and diagram
3. WHEN requesting explanation, THE Lesson_Generator SHALL use claude-sonnet-4-5 model with RAG context and request conversational text under 120 words
4. WHEN requesting code fix, THE Lesson_Generator SHALL use claude-sonnet-4-5 model and request JSON with before, after, and comment fields
5. WHEN requesting diagram, THE Lesson_Generator SHALL use google/gemini-2.0-flash-001 model and request Mermaid.js syntax
6. WHEN all three responses are received, THE Lesson_Generator SHALL parse the code fix JSON
7. IF JSON parsing fails, THEN THE Lesson_Generator SHALL use fallback values for before and after code
8. WHEN responses are parsed, THE Lesson_Generator SHALL send the explanation text to the TTS_Engine
9. WHEN audio is generated, THE Lesson_Generator SHALL save the Lesson record to DynamoDB with lessonId, userId, mistakeId, explanation, codeFix, diagram, and audioUrl
10. WHEN the Lesson is saved, THE Lesson_Generator SHALL push the complete lesson to the User via WebSocket


### Requirement 8: Text-to-Speech Audio Generation

**User Story:** As a developer, I want to hear lesson explanations read aloud, so that I can keep my eyes on my code while learning.

#### Acceptance Criteria

1. WHEN explanation text is provided, THE TTS_Engine SHALL call Amazon Polly with the text
2. WHEN calling Polly, THE TTS_Engine SHALL use the Ruth voice with generative engine and en-US language
3. WHEN Polly returns audio, THE TTS_Engine SHALL collect the audio stream into a buffer
4. WHEN audio is buffered, THE TTS_Engine SHALL upload the MP3 file to S3 with key "lessons/{lessonId}.mp3"
5. WHEN the file is uploaded, THE TTS_Engine SHALL generate a presigned URL with 1-hour expiration
6. WHEN the presigned URL is generated, THE TTS_Engine SHALL return the URL
7. IF Polly synthesis fails, THEN THE TTS_Engine SHALL return null to enable browser fallback


### Requirement 9: Lesson Delivery and Rendering

**User Story:** As a developer, I want to see lessons in a clear three-panel layout with automatic audio playback, so that I can learn effectively.

#### Acceptance Criteria

1. WHEN a lesson message is received via WebSocket, THE Extension SHALL parse the lesson data
2. WHEN lesson data is parsed, THE Extension SHALL render three panels showing explanation, code diff, and diagram
3. WHEN rendering the code diff, THE Extension SHALL display before and after code with syntax highlighting
4. WHEN rendering the diagram, THE Extension SHALL render the Mermaid.js syntax as an SVG diagram
5. WHEN panels are rendered, THE Extension SHALL create an Audio element with the audioUrl
6. WHEN the Audio element is created, THE Extension SHALL set playback rate to 0.95
7. WHEN the Audio element is ready, THE Extension SHALL automatically play the audio
8. IF audioUrl is null, THEN THE Extension SHALL use Web Speech API as fallback
9. WHEN the User clicks replay button, THE Extension SHALL restart audio playback from the beginning
10. WHEN the User clicks mute button, THE Extension SHALL pause and reset the audio


### Requirement 10: Quiz Generation and Evaluation

**User Story:** As a developer, I want to answer quiz questions after lessons, so that I can verify my understanding.

#### Acceptance Criteria

1. WHEN a User clicks "Got it ✓" on a lesson, THE Extension SHALL wait 30 seconds
2. WHEN 30 seconds elapse, THE Extension SHALL send a quiz request to the REST API with conceptId and language
3. WHEN a quiz request is received, THE Quiz_Engine SHALL verify the JWT token
4. WHEN the token is verified, THE Quiz_Engine SHALL call OpenRouter API using claude-haiku-4-5 model
5. WHEN calling the AI, THE Quiz_Engine SHALL request 2 multiple-choice questions in JSON format
6. WHEN the AI response is received, THE Quiz_Engine SHALL parse the JSON array containing questions
7. WHEN questions are parsed, THE Quiz_Engine SHALL return the quiz data to the Extension
8. WHEN quiz data is received, THE Extension SHALL render question cards with 4 option buttons
9. WHEN a User clicks an option, THE Extension SHALL reveal the correct answer with green highlighting
10. WHEN a User clicks an incorrect option, THE Extension SHALL reveal it with red highlighting and show the correct answer
11. WHEN a correct answer is selected, THE Extension SHALL trigger confetti animation with 80 particles


### Requirement 11: Progress Tracking and Streak Management

**User Story:** As a developer, I want to track my learning progress and maintain a streak, so that I stay motivated to learn consistently.

#### Acceptance Criteria

1. WHEN a User completes a lesson, THE Extension SHALL send a progress update request with lessonId, rating, quizPassed, conceptId, and language
2. WHEN a progress update is received, THE Progress_Tracker SHALL verify the JWT token
3. WHEN the token is verified, THE Progress_Tracker SHALL mark the lesson as completed in DynamoDB
4. WHEN the lesson is marked complete, THE Progress_Tracker SHALL retrieve the User record
5. WHEN the User record is retrieved, THE Progress_Tracker SHALL calculate the current date and yesterday's date
6. WHEN dates are calculated, THE Progress_Tracker SHALL increment the streak if lastActive equals yesterday
7. WHEN lastActive does not equal yesterday or today, THE Progress_Tracker SHALL reset the streak to 1
8. WHEN lastActive equals today, THE Progress_Tracker SHALL maintain the current streak
9. WHEN quiz is passed, THE Progress_Tracker SHALL add 3 points to skillScore
10. WHEN quiz is not passed, THE Progress_Tracker SHALL add 1 point to skillScore
11. WHEN skillScore is updated, THE Progress_Tracker SHALL cap the value at 100
12. WHEN User data is updated, THE Progress_Tracker SHALL update the learning profile for the language
13. WHEN updating the learning profile, THE Progress_Tracker SHALL increment lessonsCompleted by 1


### Requirement 12: Progress Display

**User Story:** As a developer, I want to view my skill score, streak, and learning statistics, so that I can see my improvement over time.

#### Acceptance Criteria

1. WHEN a User opens the Progress tab, THE Extension SHALL send a GET request to retrieve progress data
2. WHEN a progress request is received, THE Progress_Tracker SHALL verify the JWT token
3. WHEN the token is verified, THE Progress_Tracker SHALL retrieve the User record from DynamoDB
4. WHEN the User record is retrieved, THE Progress_Tracker SHALL return skillScore, streakDays, and learning profile data
5. WHEN progress data is received, THE Extension SHALL render a circular SVG visualization of the skill score
6. WHEN rendering the streak, THE Extension SHALL display a fire emoji with the streak number
7. WHEN rendering learning profiles, THE Extension SHALL display the top 3 languages with lesson counts


### Requirement 13: Deep Dive Explanations

**User Story:** As a developer, I want to request detailed explanations for complex concepts, so that I can gain deeper understanding when needed.

#### Acceptance Criteria

1. WHEN a lesson is displayed, THE Extension SHALL show a "Deep Dive 🔍" button
2. WHEN a User clicks the Deep Dive button, THE Extension SHALL send a deep dive request with conceptId, language, and problematicCode
3. WHEN a deep dive request is received, THE Lesson_Generator SHALL verify the JWT token
4. WHEN the token is verified, THE Lesson_Generator SHALL call OpenRouter API using claude-opus-4-5 model
5. WHEN calling the AI, THE Lesson_Generator SHALL request a comprehensive explanation under 300 words covering what, why, harm, examples, and solution
6. WHEN the explanation is received, THE Lesson_Generator SHALL send the text to the TTS_Engine
7. WHEN audio is generated, THE Lesson_Generator SHALL push the deep lesson to the User via WebSocket with explanation and audioUrl
8. WHEN the deep lesson is received, THE Extension SHALL render the explanation and automatically play the audio


### Requirement 14: Concept Knowledge Base Seeding

**User Story:** As a system administrator, I want to seed the knowledge base with concept definitions, so that RAG can provide relevant context.

#### Acceptance Criteria

1. WHEN the seed script is executed, THE RAG_System SHALL iterate through the concept definitions
2. WHEN processing each concept, THE RAG_System SHALL generate an embedding using Google Gemini text-embedding-004 API
3. WHEN an embedding is generated, THE RAG_System SHALL create a document with conceptId, content, and embedding fields
4. WHEN the document is created, THE RAG_System SHALL index it in OpenSearch Serverless with index name "concept-embeddings"
5. WHEN indexing is complete, THE RAG_System SHALL log confirmation of the seeded concept
6. THE RAG_System SHALL seed at minimum these concepts: mutable-default, callback-hell, any-type, null-ref, n-plus-one, sql-injection, memory-leak, dry-violation, god-object, missing-usememo


### Requirement 15: OpenSearch Vector Index Configuration

**User Story:** As a system administrator, I want to configure the vector search index properly, so that semantic search works correctly.

#### Acceptance Criteria

1. WHEN creating the OpenSearch index, THE RAG_System SHALL enable k-NN search in index settings
2. WHEN defining the index mapping, THE RAG_System SHALL create a conceptId field with keyword type
3. WHEN defining the index mapping, THE RAG_System SHALL create a content field with text type
4. WHEN defining the index mapping, THE RAG_System SHALL create an embedding field with knn_vector type
5. WHEN configuring the embedding field, THE RAG_System SHALL set dimension to 768
6. WHEN configuring the embedding field, THE RAG_System SHALL use HNSW method with FAISS engine and innerproduct space type


### Requirement 16: Error Handling and Fallbacks

**User Story:** As a developer, I want the system to handle errors gracefully, so that temporary failures don't break my learning experience.

#### Acceptance Criteria

1. IF an OpenRouter API call returns a 429 rate limit error, THEN THE Lesson_Generator SHALL retry with openai/gpt-4o-mini model
2. IF Amazon Polly synthesis fails, THEN THE TTS_Engine SHALL return null and log the error
3. IF a WebSocket connection is closed, THEN THE Extension SHALL attempt reconnection after 5 seconds
4. IF JWT verification fails, THEN THE Lambda function SHALL return HTTP 401 status
5. IF JSON parsing fails for code fix, THEN THE Lesson_Generator SHALL use the problematicCode as both before and after values
6. IF DynamoDB conditional check fails on User creation, THEN THE Auth_Handler SHALL ignore the error and continue
7. IF a lesson push fails due to missing connectionId, THEN THE WebSocket_Manager SHALL log the error and continue


### Requirement 17: DynamoDB Data Storage

**User Story:** As a system administrator, I want all application data stored in DynamoDB, so that the system is serverless and scalable.

#### Acceptance Criteria

1. THE Extension SHALL store User records in the veda-users table with userId as partition key
2. THE Extension SHALL store Mistake records in the veda-mistakes table with mistakeId as partition key and userId global secondary index
3. THE Extension SHALL store Lesson records in the veda-lessons table with lessonId as partition key and userId global secondary index
4. THE Extension SHALL store learning profiles in the veda-profiles table with userId as partition key and language as sort key
5. THE Extension SHALL store WebSocket connections in the veda-ws-connections table with userId as partition key
6. THE Extension SHALL store rate limit locks in the veda-rate-limits table with lockKey as partition key and TTL attribute enabled
7. WHEN creating User records, THE Extension SHALL include userId, githubId, username, email, avatarUrl, skillScore, streakDays, lastActive, and createdAt fields
8. WHEN creating Mistake records, THE Extension SHALL include mistakeId, userId, language, conceptId, severity, problematicCode, lineNumber, confidence, mistakeType, and createdAt fields
9. WHEN creating Lesson records, THE Extension SHALL include lessonId, userId, mistakeId, explanation, codeFix, diagram, audioUrl, status, and createdAt fields


### Requirement 18: S3 Storage and Presigned URLs

**User Story:** As a developer, I want audio files stored securely and accessible via temporary URLs, so that my lessons can be played without exposing permanent storage.

#### Acceptance Criteria

1. WHEN audio is generated, THE TTS_Engine SHALL upload the MP3 file to the veda-learn-audio S3 bucket
2. WHEN uploading to S3, THE TTS_Engine SHALL use the key format "lessons/{lessonId}.mp3"
3. WHEN uploading to S3, THE TTS_Engine SHALL set ContentType to "audio/mpeg"
4. WHEN the file is uploaded, THE TTS_Engine SHALL generate a presigned URL with 1-hour expiration
5. THE S3 bucket SHALL have CORS configuration allowing GET requests from all origins
6. THE Extension SHALL store concept seed documents in the veda-learn-concepts S3 bucket


### Requirement 19: API Gateway Configuration

**User Story:** As a system administrator, I want REST and WebSocket APIs properly configured, so that the extension can communicate with Lambda functions.

#### Acceptance Criteria

1. THE Extension SHALL expose a REST API endpoint at POST /auth/github/callback for OAuth callbacks
2. THE Extension SHALL expose a REST API endpoint at POST /api/analyze for code analysis requests
3. THE Extension SHALL expose a REST API endpoint at POST /api/lesson for lesson generation requests
4. THE Extension SHALL expose a REST API endpoint at POST /api/quiz for quiz generation requests
5. THE Extension SHALL expose a REST API endpoint at GET /api/progress/{userId} for progress retrieval
6. THE Extension SHALL expose a REST API endpoint at POST /api/progress/update for progress updates
7. THE Extension SHALL expose a WebSocket API with $connect route for connection establishment
8. THE Extension SHALL expose a WebSocket API with $disconnect route for connection cleanup
9. WHEN deploying Lambda functions, THE Extension SHALL configure CORS to allow all origins for REST endpoints
10. WHEN configuring Lambda functions, THE Extension SHALL set appropriate timeout values: 30s for analyze, 60s for lesson, 15s for quiz


### Requirement 20: OpenRouter AI Model Selection

**User Story:** As a system administrator, I want to use appropriate AI models for each task, so that quality and cost are balanced.

#### Acceptance Criteria

1. WHEN classifying code patterns, THE Classifier SHALL use the anthropic/claude-haiku-4-5 model
2. WHEN generating lesson explanations, THE Lesson_Generator SHALL use the anthropic/claude-sonnet-4-5 model
3. WHEN generating code fixes, THE Lesson_Generator SHALL use the anthropic/claude-sonnet-4-5 model
4. WHEN generating diagrams, THE Lesson_Generator SHALL use the google/gemini-2.0-flash-001 model
5. WHEN generating quiz questions, THE Quiz_Engine SHALL use the anthropic/claude-haiku-4-5 model
6. WHEN generating deep dive explanations, THE Lesson_Generator SHALL use the anthropic/claude-opus-4-5 model
7. WHEN calling OpenRouter API, THE Extension SHALL include the API key in the Authorization header
8. WHEN calling OpenRouter API, THE Extension SHALL include HTTP-Referer and X-Title headers


### Requirement 21: VS Code Extension UI Components

**User Story:** As a developer, I want a clean and intuitive interface in VS Code, so that I can easily access lessons and track progress.

#### Acceptance Criteria

1. THE Extension SHALL register a custom activity bar view container with the mortar-board icon
2. THE Extension SHALL provide a webview sidebar panel for displaying lessons
3. THE Extension SHALL register a URI handler for the vscode://veda-learn.veda-learn/auth scheme
4. WHEN rendering lessons, THE Extension SHALL use staggered slide-in animations with 0ms, 150ms, and 300ms delays
5. WHEN displaying mistakes, THE Extension SHALL use color-coded badges: red for security, yellow for performance, orange for anti-pattern, blue for style
6. WHEN audio is playing, THE Extension SHALL display a waveform animation
7. WHEN the skill score is displayed, THE Extension SHALL animate the number counting up
8. THE Extension SHALL provide replay and mute buttons for audio control


### Requirement 22: Lambda Function Deployment

**User Story:** As a system administrator, I want to deploy all Lambda functions using Serverless Framework, so that infrastructure is managed as code.

#### Acceptance Criteria

1. THE Extension SHALL deploy Lambda functions using Serverless Framework version 3
2. WHEN deploying functions, THE Extension SHALL use Node.js 20.x runtime
3. WHEN deploying functions, THE Extension SHALL assign the veda-lambda-role IAM role to all functions
4. WHEN deploying functions, THE Extension SHALL inject environment variables for OPENROUTER_API_KEY, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET, OPENSEARCH_ENDPOINT, S3_AUDIO_BUCKET, and WS_API_ENDPOINT
5. THE Extension SHALL deploy functions to the us-east-1 region
6. THE Extension SHALL configure pay-per-request billing mode for all DynamoDB tables


### Requirement 23: Configuration Parser and Pretty Printer

**User Story:** As a system administrator, I want to parse and format configuration files correctly, so that settings are loaded and saved reliably.

#### Acceptance Criteria

1. WHEN a configuration file is provided, THE Extension SHALL parse it into a structured configuration object
2. WHEN parsing fails, THE Extension SHALL return a descriptive error message
3. THE Extension SHALL provide a pretty printer that formats configuration objects into valid configuration files
4. FOR ALL valid configuration objects, THE Extension SHALL ensure that parsing then printing then parsing produces an equivalent object (round-trip property)

