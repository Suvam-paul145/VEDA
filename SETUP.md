# Veda Learn Setup Guide

Complete step-by-step instructions for setting up Veda Learn from scratch.

## Prerequisites

- Node.js 20+
- VS Code 1.85+
- GitHub account
- Git installed

## Day 1 - Foundation Setup

### Task 1: Service Account Setup (30 minutes)

#### 1.1 OpenRouter Setup
1. Go to [openrouter.ai](https://openrouter.ai)
2. Sign up with your email
3. Navigate to "Keys" section
4. Click "Create Key"
5. Add $5 credit via "Credits" section
6. Copy your API key (starts with `sk-or-v1-`)

#### 1.2 Supabase Setup
1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub
3. Click "New Project"
4. Choose organization and project name
5. Set database password (save it!)
6. Select region (us-east-1 recommended)
7. Wait for project creation (~2 minutes)
8. Go to Settings → API
9. Copy:
   - Project URL (SUPABASE_URL)
   - anon/public key (SUPABASE_ANON_KEY)
   - service_role key (SUPABASE_SERVICE_ROLE_KEY)

#### 1.3 Railway Setup
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Connect your Veda Learn repository
6. Note your Railway URL (will be like `https://xxx.railway.app`)

#### 1.4 Upstash Redis Setup
1. Go to [upstash.com](https://upstash.com)
2. Sign up with email or GitHub
3. Click "Create Database"
4. Name: `veda-redis`
5. Region: `us-east-1`
6. Type: Regional
7. Click "Create"
8. Go to "REST API" tab
9. Copy:
   - UPSTASH_REDIS_REST_URL
   - UPSTASH_REDIS_REST_TOKEN

#### 1.5 GitHub OAuth App Setup
1. Go to [github.com/settings/applications/new](https://github.com/settings/applications/new)
2. Application name: `Veda Learn`
3. Homepage URL: Your Railway URL
4. Authorization callback URL: `https://xxx.railway.app/auth/github/callback`
5. Click "Register application"
6. Copy:
   - Client ID (GITHUB_CLIENT_ID)
   - Generate and copy Client Secret (GITHUB_CLIENT_SECRET)

#### 1.6 Create .env File
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your credentials.

### Task 2: Supabase Database Schema (30 minutes)

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Click "New Query"
4. Copy entire content from `backend/schema.sql`
5. Paste and click "Run"
6. Verify tables created

### Task 3: Backend Deployment (45 minutes)

#### 3.1 Local Testing
```bash
cd backend
npm install
npm run dev
```

Test endpoints:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/test/stream
```

#### 3.2 Deploy to Railway
1. Push code to GitHub
2. In Railway Dashboard, add environment variables
3. Click "Deploy"
4. Test production endpoint

### Task 4: VS Code Extension Setup (45 minutes)

#### 4.1 Configure Extension
Update `.vscode/settings.json`:
```json
{
  "veda.apiUrl": "https://your-railway-app.railway.app",
  "veda.demoMode": false
}
```

#### 4.2 Build Extension
```bash
npm install
npm run compile
```

#### 4.3 Test Extension
1. Press F5 to launch Extension Development Host
2. Open Veda Learn sidebar
3. Click "Login with GitHub"
4. Complete OAuth flow
5. Verify user profile appears

## Troubleshooting

### Backend won't start
- Check all environment variables are set
- Verify Supabase URL and keys are correct
- Check Railway logs for errors

### Extension won't activate
- Run `npm run compile` to rebuild
- Check VS Code Developer Tools
- Verify extension is activated

### GitHub OAuth fails
- Verify callback URL matches Railway URL exactly
- Check GitHub OAuth app settings
- Ensure credentials are correct

## Next Steps

After completing Day 1 setup:
1. Implement pattern classifier (Task 8)
2. Implement lesson generator (Task 9)
3. Build three-panel UI (Task 10)
4. Add voice narration (Task 13)
5. Implement RAG system (Task 14)
6. Add quiz engine (Task 16)

## Cost Monitoring

Monitor your costs:
- OpenRouter: Check dashboard for usage
- Supabase: Free tier includes 500MB database
- Railway: $5/month for hobby plan
- Upstash: Free tier includes 10K commands/day

Total expected cost for 4-day hackathon: $5-8
