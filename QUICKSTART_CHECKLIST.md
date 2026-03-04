# Veda Learn - Quick Start Checklist

Use this checklist to track your setup progress. Check off each item as you complete it.

## Phase 1: Prerequisites (15 minutes)

- [ ] AWS account created and billing enabled
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS CLI configured (`aws configure`)
- [ ] Node.js 20.x installed (`node --version`)
- [ ] VS Code 1.80+ installed
- [ ] Git installed
- [ ] GitHub account ready
- [ ] OpenRouter account created

## Phase 2: AWS Infrastructure (60 minutes)

### IAM Setup
- [ ] Created IAM role `veda-lambda-role`
- [ ] Attached all 8 required policies
- [ ] Copied Role ARN for serverless.yml

### DynamoDB Tables
- [ ] Created `veda-users` table
- [ ] Created `veda-mistakes` table with userId GSI
- [ ] Created `veda-lessons` table with userId GSI
- [ ] Created `veda-profiles` table (composite key)
- [ ] Created `veda-ws-connections` table
- [ ] Created `veda-rate-limits` table
- [ ] Enabled TTL on `veda-rate-limits` table
- [ ] Verified all tables are ACTIVE

### S3 Buckets
- [ ] Created `veda-learn-audio` bucket
- [ ] Created `veda-learn-concepts` bucket
- [ ] Set CORS on audio bucket
- [ ] Verified buckets exist

### OpenSearch Serverless
- [ ] Created encryption policy
- [ ] Created network policy
- [ ] Created data access policy (with correct IAM role ARN)
- [ ] Created `veda-concepts` collection
- [ ] Waited for collection to become ACTIVE (~2 min)
- [ ] Copied collection endpoint URL
- [ ] Created vector index with Python script
- [ ] Verified index exists

### Bedrock
- [ ] Enabled Titan Text Embeddings V2 model access
- [ ] Verified access granted

## Phase 3: API Keys and OAuth (15 minutes)

### OpenRouter
- [ ] Signed up at openrouter.ai
- [ ] Added $10 credit
- [ ] Created API key
- [ ] Copied API key (starts with `sk-or-v1-`)

### GitHub OAuth
- [ ] Created OAuth app at github.com/settings/applications/new
- [ ] Named it "Veda Learn"
- [ ] Set placeholder URLs (will update after deployment)
- [ ] Copied Client ID
- [ ] Generated and copied Client Secret

### JWT Secret
- [ ] Generated random 64-character string
- [ ] Saved for .env file

## Phase 4: Lambda Backend Setup (20 minutes)

### Project Setup
- [ ] Cloned/created project directory
- [ ] Navigated to `veda-learn-api/`
- [ ] Ran `npm install`
- [ ] Copied `.env.example` to `.env`

### Environment Configuration
- [ ] Added `OPENROUTER_API_KEY` to .env
- [ ] Added `GITHUB_CLIENT_ID` to .env
- [ ] Added `GITHUB_CLIENT_SECRET` to .env
- [ ] Added `JWT_SECRET` to .env
- [ ] Added `AWS_REGION=us-east-1` to .env
- [ ] Added AWS credentials to .env
- [ ] Added `OPENSEARCH_ENDPOINT` to .env
- [ ] Added S3 bucket names to .env
- [ ] Left `WS_API_ENDPOINT` empty (will fill after deployment)

### Serverless Configuration
- [ ] Opened `serverless.yml`
- [x] ✅ AWS Account ID already configured: `034476915822`
- [x] ✅ IAM role ARN is correct: `veda-lambda-role`

### First Deployment
- [ ] Ran `npx serverless deploy`
- [ ] Deployment succeeded
- [ ] Copied REST API endpoint URL
- [ ] Copied WebSocket API endpoint URL

### Post-Deployment Configuration
- [ ] Updated `.env` with `WS_API_ENDPOINT`
- [ ] Updated GitHub OAuth app URLs with REST API endpoint
- [ ] Ran `npx serverless deploy` again

## Phase 5: VS Code Extension Setup (15 minutes)

### Project Setup
- [ ] Navigated to `veda-learn-extension/`
- [ ] Ran `npm install`
- [ ] Created `src/config.ts` with API endpoints

### Compilation
- [ ] Ran `npm run compile`
- [ ] No TypeScript errors

### Testing
- [ ] Opened extension folder in VS Code
- [ ] Pressed F5 to launch Extension Development Host
- [ ] New VS Code window opened with extension loaded

## Phase 6: End-to-End Testing (20 minutes)

### Authentication Test
- [ ] Opened Command Palette in Extension Development Host
- [ ] Ran "Veda: Sign in with GitHub"
- [ ] Browser opened with GitHub OAuth
- [ ] Approved application
- [ ] VS Code showed "✅ Veda Learn — Logged in!"
- [ ] Veda sidebar appeared in activity bar

### Code Analysis Test
- [ ] Created new Python file `test.py`
- [ ] Typed mutable default bug code
- [ ] Waited 30 seconds (or 5 seconds in demo mode)
- [ ] Lesson appeared in sidebar
- [ ] All three panels rendered (explanation, diff, diagram)
- [ ] Polly audio played automatically

### Quiz Test
- [ ] Clicked "Got it ✓" button
- [ ] Waited 30 seconds
- [ ] Quiz appeared with 2 questions
- [ ] Clicked correct answer
- [ ] Confetti animation played

### Progress Test
- [ ] Opened Progress tab in sidebar
- [ ] Skill score displayed
- [ ] Streak days displayed
- [ ] Language stats displayed

## Phase 7: Implementation (Follow tasks.md)

### Day 1: Foundation
- [ ] Task 1: AWS Infrastructure Setup ✓ (completed above)
- [ ] Task 2: Serverless Framework Configuration ✓ (completed above)
- [ ] Task 3: GitHub OAuth and JWT
- [ ] Task 4: VS Code Extension Scaffold ✓ (completed above)
- [ ] Task 5: Shared Library Components
- [ ] Task 6: Day 1 Checkpoint

### Day 2: Intelligence
- [ ] Task 7: Code Change Monitoring
- [ ] Task 8: Code Mistake Detection
- [ ] Task 9: Lesson Generation with Polly
- [ ] Task 10: Three-Panel Sidebar UI
- [ ] Task 11: Integration Testing
- [ ] Task 12: Day 2 Checkpoint

### Day 3: Depth
- [ ] Task 13: RAG System with Titan Embeddings
- [ ] Task 14: Progress Tracking and Streaks
- [ ] Task 15: Quiz Generation
- [ ] Task 16: Deep Dive Explanations
- [ ] Task 17: Rate Limiting and Error Handling
- [ ] Task 18: Day 3 Checkpoint

### Day 4: Victory
- [ ] Task 19: Demo Path Hardening
- [ ] Task 20: UI Polish and Animations
- [ ] Task 21: Pitch Deck and Documentation
- [ ] Task 22: Backup Demo Video
- [ ] Task 23: GitHub README and Submission
- [ ] Task 24: Final Checkpoint

## Troubleshooting Checklist

If something doesn't work, check these:

### Lambda Deployment Issues
- [ ] IAM role ARN is correct in serverless.yml
- [ ] All environment variables are set in .env
- [ ] AWS credentials are valid
- [ ] Region is set to us-east-1

### WebSocket Connection Issues
- [ ] WS_API_ENDPOINT is correct in .env
- [ ] JWT token is stored in VS Code SecretStorage
- [ ] wsConnect Lambda has correct permissions
- [ ] Check CloudWatch Logs for errors

### Lesson Not Appearing
- [ ] 30-second debounce timer completed
- [ ] OpenRouter API key is valid
- [ ] Rate limit not active (wait 30 seconds)
- [ ] Check CloudWatch Logs for analyze Lambda

### Audio Not Playing
- [ ] S3 bucket CORS is configured
- [ ] Polly has permissions in IAM role
- [ ] Presigned URL is valid (1-hour expiration)
- [ ] Check browser console for errors

### OpenSearch Issues
- [ ] Collection is ACTIVE status
- [ ] Data access policy includes correct IAM role
- [ ] Vector index was created successfully
- [ ] Titan Embeddings model access is enabled

## Cost Monitoring

- [ ] Set up AWS billing alerts
- [ ] Monitor OpenSearch Serverless costs (~$0.24/OCU-hr)
- [ ] Monitor OpenRouter API usage
- [ ] Expected total: ~$7-13 for 4 days

## Documentation References

- [ ] Read SETUP.md for detailed instructions
- [ ] Review AWS_SETUP_COMMANDS.md for CLI commands
- [ ] Check PROJECT_STRUCTURE.md for file organization
- [ ] Follow tasks.md for implementation steps
- [ ] Reference requirements.md for specifications
- [ ] Review design.md for architecture details

## Next Steps After Setup

1. **Implement Lambda Handlers** - Follow tasks.md Day 1-3
2. **Build Extension UI** - Create webview components
3. **Add Testing** - Write unit and integration tests
4. **Seed Knowledge Base** - Run concept seeding script
5. **Polish UI** - Add animations and styling
6. **Create Demo** - Record demo video
7. **Deploy to Production** - Use `--stage prod`

## Success Criteria

✅ You're ready to start implementing when:
- All AWS infrastructure is provisioned
- Lambda backend deploys successfully
- VS Code extension loads without errors
- Authentication flow works end-to-end
- You can see the Veda sidebar in VS Code

## Support

If you get stuck:
1. Check the Troubleshooting section above
2. Review CloudWatch Logs for Lambda errors
3. Check browser console for extension errors
4. Verify all environment variables are set correctly
5. Ensure AWS services are in us-east-1 region

---

**Good luck building Veda Learn! 🚀**
