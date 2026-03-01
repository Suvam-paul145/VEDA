# 🤖 VEDA — Voice-Enabled Debugging Assistant

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![VSCode](https://img.shields.io/badge/VSCode-Extension-blue?logo=visualstudiocode)](https://code.visualstudio.com)
[![Status](https://img.shields.io/badge/Status-In%20Development-yellow)](https://github.com/Suvam-paul145/VEDA)
[![AWS](https://img.shields.io/badge/AWS-Bedrock%20%2B%20Lambda-orange?logo=amazonaws)](https://aws.amazon.com/bedrock/)
[![GCP](https://img.shields.io/badge/GCP-Gemini%202.0%20Flash-4285F4?logo=google)](https://aistudio.google.com)

> **Your AI companion that talks, debugs & visualizes code errors in real-time.**
> Built for the AWS Bharat Hackathon.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🎤 **Voice Interaction** | Speak to your code — get spoken explanations back |
| 👁️ **Visual Bug Diagrams** | See exactly how errors flow through your code |
| 🛠️ **One-Click Fixes** | AI-generated fixes with diff preview and instant apply |
| 🧠 **Companion Mode** | Real-time analysis as you type |

---

## 🏗️ Architecture

```
VSCode Extension (WebView)
        │
        ▼
API Gateway (us-east-1)
        │
        ▼
Lambda: veda-brain
        │
   ┌────┴────────────────────────────────────┐
   │  companion  →  GCP Gemini 2.0 Flash     │ ~400ms, free
   │  analyze    →  Claude 3.5 Sonnet (CRIS) │ ~1.5s, best quality
   │  diagram    →  Claude 3.5 Haiku (CRIS)  │ ~600ms, fast
   │  deep       →  Claude 3 Opus (CRIS)     │ ~3-5s, max reasoning
   └─────────────────────────────────────────┘
```

**CRIS** = Cross-Region Inference (`us.` prefix) → 3× Bedrock quota for free.

---

## 📁 Structure

```
VEDA/
├── .github/workflows/validate-lambda.yml
├── .kiro/                    ← design, requirements, ppt docs
├── lambda/
│   └── veda-brain/
│       ├── index.mjs         ← Main Lambda handler
│       ├── package.json
│       ├── .env.example
│       └── test/run-local.mjs
└── README.md
```

---

## ⚡ AWS Services

| Service | Role |
|---|---|
| Amazon Bedrock | Claude 3.5 Sonnet / Haiku / Opus via CRIS |
| AWS Lambda | Serverless AI routing engine |
| API Gateway | REST API with API key auth |
| IAM | Least-privilege execution role |
| CloudWatch | Logging and monitoring |

---

## 🚀 Quick Setup

```bash
# 1. Enable Bedrock models in us-east-1 (Claude 3.5 Sonnet v2, Haiku, Opus)
# 2. Create IAM role: AmazonBedrockFullAccess + AWSLambdaBasicExecutionRole
# 3. Get free Gemini key: https://aistudio.google.com/app/apikey

cd lambda/veda-brain
npm install
zip -r veda-brain.zip index.mjs package.json node_modules/
# Upload zip in Lambda Console, set GEMINI_API_KEY env var
```

See [lambda/veda-brain/README.md](lambda/veda-brain/README.md) for full setup.

---

## 🗓️ Progress

- [x] Day 1 — Lambda + Bedrock CRIS + Gemini + API Gateway
- [ ] Day 2 — VSCode extension scaffold
- [ ] Day 3 — WebView + Voice I/O
- [ ] Day 4 — Companion mode + diagnostics
- [ ] Day 5 — Fix application
- [ ] Day 6 — Polish
- [ ] Day 7 — Submit

*AWS Bharat Hackathon | VEDA v1.0*
