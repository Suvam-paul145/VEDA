# Veda Learn - AWS Edition

AI-powered coding tutor that teaches you by detecting mistakes in real-time. Built with React, AWS Lambda, DynamoDB, and Claude AI.

## 🎯 Project Overview

Veda Learn is a web-based IDE that:
- Detects coding mistakes using Claude Haiku
- Generates voice lessons with Amazon Polly
- Creates adaptive quizzes to test understanding
- Tracks your learning progress in DynamoDB
- Integrates with GitHub repositories

## 📁 Project Structure

```
veda-learn/
├── veda-learn-api/          # AWS Lambda backend (Serverless Framework)
│   ├── handlers/            # Lambda function handlers
│   ├── lib/                 # Shared libraries
│   └── serverless.yml       # Serverless configuration
├── veda-learn-web/          # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand state management
│   │   └── lib/             # API client
│   └── package.json
├── external-policies/       # IAM policies for deployment
└── references/              # Design references and roadmap
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- AWS CLI configured
- GitHub OAuth App created
- OpenRouter API key

### 1. Backend Setup (Lambda)

```bash
cd veda-learn-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Deploy to AWS
npx serverless deploy
```

### 2. Frontend Setup (Web)

```bash
cd veda-learn-web

# Install dependencies
npm install

# Configure environment
# Create .env file (see veda-learn-web/README.md)

# Start development server
npm run dev
```

Visit http://localhost:5173

## 🔑 Environment Variables

### Backend (.env in veda-learn-api/)

```env
JWT_SECRET=your-jwt-secret
OPENROUTER_API_KEY=your-openrouter-key
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
WEB_APP_URL=http://localhost:5173
```

### Frontend (.env in veda-learn-web/)

```env
VITE_REST_URL=https://your-api-gateway-url/dev
VITE_WS_URL=wss://your-websocket-url/dev
VITE_GITHUB_CLIENT_ID=your-github-client-id
VITE_APP_URL=http://localhost:5173
VITE_DEMO_MODE=true
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VEDA LEARN SYSTEM                       │
│                                                             │
│  ┌──────────────┐         ┌──────────────────────────┐     │
│  │  React Web   │────────▶│   AWS API Gateway        │     │
│  │  (Vite)      │         │   REST + WebSocket       │     │
│  └──────────────┘         └──────────────────────────┘     │
│                                      │                      │
│                    ┌─────────────────┼─────────────────┐   │
│                    ▼                 ▼                 ▼    │
│           ┌────────────┐    ┌────────────┐   ┌──────────┐ │
│           │  Lambda    │    │  Lambda    │   │ Lambda   │ │
│           │  Analyze   │    │  Lesson    │   │ Quiz     │ │
│           └────────────┘    └────────────┘   └──────────┘ │
│                    │                 │                 │    │
│                    └─────────────────┼─────────────────┘   │
│                                      ▼                      │
│                    ┌──────────────────────────────┐        │
│                    │      DynamoDB Tables         │        │
│                    │  - Users                     │        │
│                    │  - Lessons                   │        │
│                    │  - Progress                  │        │
│                    │  - Quizzes                   │        │
│                    └──────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 Features

### For Learners

- **Live Error Detection**: 30-second debounce, Claude Haiku analysis
- **Voice Lessons**: Amazon Polly TTS with 3-panel interface
- **Adaptive Quizzes**: MCQ questions with XP rewards
- **Progress Tracking**: XP, streaks, concept mastery
- **GitHub Integration**: Browse and load files from repos

### For Developers

- **Serverless Architecture**: AWS Lambda + API Gateway
- **Real-time Updates**: WebSocket for lesson delivery
- **State Management**: Zustand for global state
- **Modern Stack**: React 19, Vite 7, Tailwind v4
- **Type Safety**: JSDoc comments throughout

## 📡 API Endpoints

### REST API

```
POST   /api/analyze              # Analyze code for mistakes
POST   /api/lesson               # Generate lesson
POST   /api/lesson/deep          # Deep dive lesson
POST   /api/quiz                 # Generate quiz
GET    /api/progress/:userId     # Get user progress
POST   /api/progress/update      # Update progress
GET    /auth/github/callback     # GitHub OAuth callback
```

### WebSocket API

```
wss://your-websocket-url/dev?token=JWT

Messages:
- { type: 'lesson', lesson: {...} }
- { type: 'error', message: '...' }
```

## 🗄️ Database Schema

### DynamoDB Tables

1. **veda-users**: User profiles and auth
2. **veda-lessons**: Generated lessons
3. **veda-progress**: Learning progress
4. **veda-quizzes**: Quiz questions and answers
5. **veda-mistakes**: Detected code mistakes
6. **veda-rate-limits**: Rate limiting

## 🚢 Deployment

### Backend (AWS Lambda)

```bash
cd veda-learn-api
npx serverless deploy --stage prod
```

### Frontend (Vercel)

```bash
cd veda-learn-web
npm run build
vercel --prod
```

## 🔐 Security

- JWT authentication for all API calls
- Rate limiting (30s cooldown between analyses)
- GitHub OAuth for user authentication
- CORS configured for web app domain
- Environment variables for secrets

## 📊 Monitoring

- CloudWatch Logs for Lambda functions
- API Gateway metrics
- DynamoDB metrics
- WebSocket connection tracking

## 🐛 Troubleshooting

### Lambda Deployment Issues

```bash
# Check IAM permissions
aws iam get-role --role-name veda-lambda-role

# View CloudWatch logs
aws logs tail /aws/lambda/veda-learn-api-dev-analyze --follow
```

### Frontend Issues

```bash
# Check environment variables
cat veda-learn-web/.env

# Clear cache and rebuild
rm -rf veda-learn-web/node_modules veda-learn-web/dist
cd veda-learn-web && npm install && npm run build
```

## 📝 Development Workflow

1. Make changes to Lambda handlers in `veda-learn-api/handlers/`
2. Test locally or deploy to dev: `npx serverless deploy`
3. Make changes to React components in `veda-learn-web/src/`
4. Test in browser: `npm run dev`
5. Deploy frontend: `vercel --prod`

## 🤝 Contributing

This is a hackathon project. Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT

## 🙏 Acknowledgments

- **Claude AI** (Anthropic) for code analysis
- **OpenRouter** for AI model access
- **AWS** for serverless infrastructure
- **Vercel** for frontend hosting
- **GitHub** for OAuth and repository integration

## 📧 Support

For issues and questions:
- Check the browser console and network tab
- Review CloudWatch logs for Lambda errors
- Verify environment variables are set correctly

---

Built with ❤️ by Suvam Paul
