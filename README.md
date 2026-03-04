# Veda Learn - AWS Edition

> **AI-powered code education that teaches you why, not just fixes**

Veda Learn is a VS Code extension that acts as a passive AI mentor, watching your code and teaching you about mistakes, anti-patterns, and best practices in real-time. Unlike tools that just fix your code, Veda explains the underlying concepts through interactive lessons with voice narration, visual diagrams, and quizzes.

![Veda Learn Demo](https://via.placeholder.com/800x400?text=Veda+Learn+Demo)

## 🎯 What Makes Veda Different

- **Passive Learning**: Watches your code silently, only intervening when it detects a teachable moment
- **Multi-Modal Education**: Combines text explanations, code diffs, Mermaid diagrams, and voice narration
- **Real-Time Delivery**: Lessons pushed via WebSocket for immediate feedback
- **Gamification**: Skill scores, streak tracking, and quiz validation
- **Fully Serverless**: Built on AWS Lambda, scales automatically

## 🏗️ Architecture

```
VS Code Extension (TypeScript)
         ↓
API Gateway (REST + WebSocket)
         ↓
AWS Lambda Functions (Node.js 20.x)
         ↓
┌─────────────┬──────────────┬─────────────┬──────────────┐
│  DynamoDB   │  OpenSearch  │    Polly    │  OpenRouter  │
│  6 Tables   │  Serverless  │  Gen TTS    │     API      │
└─────────────┴──────────────┴─────────────┴──────────────┘
```

## 🚀 Quick Start

### Prerequisites

- AWS Account with billing enabled
- Node.js 20.x or higher
- VS Code 1.80.0 or higher
- OpenRouter API account ($10 credit recommended)
- GitHub account for OAuth

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/veda-learn.git
cd veda-learn
```

2. **Follow the complete setup guide**

See [SETUP.md](./SETUP.md) for detailed step-by-step instructions covering:
- AWS infrastructure setup (IAM, DynamoDB, S3, OpenSearch, Bedrock)
- Lambda backend deployment
- VS Code extension installation
- Testing and troubleshooting

3. **Quick setup summary**

```bash
# Set up AWS infrastructure (see SETUP.md for commands)
# ...

# Deploy Lambda backend
cd veda-learn-api
npm install
cp .env.example .env
# Edit .env with your credentials
npx serverless deploy

# Install VS Code extension
cd ../veda-learn-extension
npm install
npm run compile
# Press F5 in VS Code to test
```

## 📚 Features

### 🧠 Intelligent Code Analysis

- Detects 5 categories: Anti-patterns, Bugs, Security, Performance, Style
- Uses Claude Haiku 4.5 for fast classification (confidence threshold: 0.85)
- 30-second debounce to avoid interrupting your flow

### 📖 Interactive Lessons

- **Three-panel layout**: Explanation, code diff, visual diagram
- **Voice narration**: Amazon Polly Generative TTS (Ruth voice)
- **RAG-enhanced**: Context from OpenSearch vector database
- **Parallel generation**: 3 AI calls simultaneously for speed

### 🎮 Gamification

- **Skill Score**: 0-100 rating based on lessons completed
- **Streak Tracking**: Consecutive days of learning
- **Quiz Validation**: 2 MCQ questions after each lesson
- **Confetti Animation**: Celebrate correct answers

### 🔒 Security

- GitHub OAuth 2.0 authentication
- Stateless JWT tokens (30-day expiration)
- Rate limiting: 20 requests/minute per user
- HTTPS-only API Gateway

## 🛠️ Tech Stack

### Frontend
- **VS Code Extension API** (TypeScript)
- **WebSocket Client** (ws library)
- **Webview** for lesson rendering

### Backend
- **AWS Lambda** (Node.js 20.x)
- **API Gateway** (REST + WebSocket)
- **Serverless Framework** v3

### Data Storage
- **DynamoDB** (6 tables, pay-per-request)
- **S3** (audio files, concept documents)
- **OpenSearch Serverless** (vector embeddings)

### AI Services
- **OpenRouter API** (Claude Haiku, Sonnet, Opus; Gemini Flash)
- **Google Gemini** (text-embedding-004 for vector embeddings - FREE tier)
- **Amazon Polly** (Generative TTS)

## 📊 Cost Estimate

**4-Day Hackathon Budget:**
- OpenSearch Serverless: ~$2-5
- OpenRouter API: ~$5-8
- Google Gemini Embeddings: FREE (1,500 req/day)
- Lambda, DynamoDB, S3, Polly: Free tier
- **Total: ~$7-13**

## 🧪 Testing

```bash
# Run unit tests
cd veda-learn-api
npm test

# Run with coverage
npm run test:coverage

# Test extension
cd veda-learn-extension
npm test
```

## 📖 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide
- **[requirements.md](./.kiro/specs/veda-learn-aws-edition/requirements.md)** - Detailed requirements
- **[design.md](./.kiro/specs/veda-learn-aws-edition/design.md)** - System design
- **[tasks.md](./.kiro/specs/veda-learn-aws-edition/tasks.md)** - Implementation tasks
- **[veda-learn-aws-roadmap.md](./references/veda-learn-aws-roadmap.md)** - 4-day build plan
- **[veda-system-design.html](./references/veda-system-design.html)** - Interactive architecture diagram

## 🎯 Roadmap

### ✅ Built (MVP)
- [x] GitHub OAuth authentication
- [x] Real-time code analysis
- [x] Interactive lessons with TTS
- [x] Quiz system
- [x] Progress tracking
- [x] WebSocket delivery

### 🚧 Coming Soon
- [ ] Team/organization features
- [ ] Custom concept definitions
- [ ] Interview prep mode
- [ ] Cognitive debt scoring
- [ ] Multi-IDE support

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenRouter** for unified AI API access
- **AWS** for serverless infrastructure
- **Anthropic** for Claude models
- **Google** for Gemini Flash
- **VS Code** for extension platform

## 📧 Contact

- **GitHub Issues**: For bug reports and feature requests
- **Email**: your-email@example.com
- **Twitter**: @yourusername

---

**Built with ❤️ for developers who want to learn, not just code faster.**
