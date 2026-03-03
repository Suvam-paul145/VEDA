# Veda Learn OpenRouter Migration Plan

## Overview

This document outlines the migration plan from AWS-based architecture (Bedrock, Lambda, DynamoDB, Cognito) to a simplified OpenRouter-based stack optimized for rapid 4-day hackathon implementation.

## Key Changes

### Architecture Migration

**From (AWS-based):**
- AWS Bedrock for AI inference
- AWS Lambda for backend
- DynamoDB for data storage
- AWS Cognito for authentication
- API Gateway for routing

**To (OpenRouter-based):**
- OpenRouter API for unified AI access (Claude, Gemini, GPT)
- Express.js on Railway.app for backend
- Supabase PostgreSQL with pgvector for data + semantic search
- GitHub OAuth + JWT for authentication
- Direct HTTPS endpoints

### Benefits

1. **Simplicity**: Single API key for all AI models, no AWS service orchestration
2. **Cost Efficiency**: $5-8 total for 4-day hackathon vs AWS complexity
3. **Speed**: Parallel AI calls, 30-second debounce, streaming responses
4. **Developer Experience**: GitHub OAuth, JWT tokens, clear error messages
5. **Semantic Search**: pgvector-powered RAG system for concept documentation

## Implementation Timeline

### Day 1 - Foundation (5 hours)
- Service account setup (OpenRouter, Supabase, Railway, Upstash, GitHub OAuth)
- Database schema creation
- Express backend with GitHub OAuth
- VS Code extension scaffold
- First OpenRouter streaming call

### Day 2 - Intelligence (5 hours)
- Passive code watcher with 30-second debounce
- Pattern classifier with Claude Haiku
- Lesson generator with 3 parallel calls
- Three-panel sidebar UI
- Integration testing

### Day 3 - Emotion (5 hours)
- Web Speech API voice narration
- RAG system with pgvector
- Progress tracker with streak counter
- Quiz engine with confetti
- Rate limiting and error hardening

### Day 4 - Victory (5 hours)
- Demo path hardening
- UI polish
- Pitch deck creation
- Backup demo video
- GitHub README and documentation

## Technology Stack

### Backend
- Node.js 20+
- Express.js
- TypeScript
- OpenRouter API
- Supabase (PostgreSQL + pgvector)
- Upstash Redis
- Railway.app (deployment)

### Frontend
- VS Code Extension API
- TypeScript
- WebView API
- Web Speech API
- Mermaid.js (diagrams)
- Highlight.js (syntax highlighting)
- Canvas Confetti (animations)

### AI Models (via OpenRouter)
- Claude Haiku 4.5: Pattern classification, quiz generation
- Claude Sonnet 4.5: Lesson explanations, code fixes
- Gemini Flash 2.0: Mermaid diagram generation
- Text Embedding 3 Small: RAG embeddings (1536 dimensions)

## Cost Breakdown

### 4-Day Hackathon
- Pattern Classification: $1.60
- Lesson Generation: $3.00
- Diagrams: $0.03
- Embeddings: $0.01
- Quizzes: $0.16
- **Total: $4.80 - $8.00**

### Production (100 users/month)
- Estimated: ~$20/month

## Success Criteria

1. All Day 1-4 checkpoint criteria met
2. Demo runs 5/5 times without errors
3. All required features functional
4. Total OpenRouter cost under $10
5. Complete documentation
6. Pitch deck and demo video ready

## Next Steps

1. Review and approve this migration plan
2. Set up service accounts
3. Begin Day 1 implementation
4. Follow 4-day timeline
5. Test and iterate
6. Prepare for demo/pitch
