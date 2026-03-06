# GitHub OAuth - Dual App Setup (Recommended)

## Problem
GitHub's callback URL field can be tricky with multiple URLs. Let's create two separate OAuth apps instead.

## Solution: Create Two OAuth Apps

### 1. Production OAuth App (Keep Current)
- **Name**: VEDA (Production)
- **Client ID**: `Ov23liUfaTgayCi8bO5n` (current)
- **Homepage URL**: `https://talk-with-veda.vercel.app`
- **Callback URL**: `https://talk-with-veda.vercel.app/auth/callback`

### 2. Create New Development OAuth App
Go to [GitHub Developer Settings](https://github.com/settings/developers) and click "New OAuth App":

- **Application name**: `VEDA (Development)`
- **Homepage URL**: `http://localhost:5174`
- **Authorization callback URL**: `http://localhost:5174/auth/callback`
- **Application description**: `Veda Learn - Local Development`

## Update Environment Variables

After creating the development OAuth app, you'll get a new Client ID. Update your files:

### Frontend (.env) - Add Development Client ID
```env
# Production
VITE_REST_URL=https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
VITE_WS_URL=wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
VITE_GITHUB_CLIENT_ID=Ov23liUfaTgayCi8bO5n
VITE_APP_URL=https://talk-with-veda.vercel.app
VITE_DEMO_MODE=false

# Development (add these)
VITE_GITHUB_CLIENT_ID_DEV=[NEW_DEV_CLIENT_ID]
VITE_APP_URL_DEV=http://localhost:5174
```

### Backend (.env) - Add Development Credentials
```env
# Production GitHub OAuth
GITHUB_CLIENT_ID=Ov23liUfaTgayCi8bO5n
GITHUB_CLIENT_SECRET=1422e7e4485c2a930c3dbc7f1d522e24c22550dc

# Development GitHub OAuth (add these)
GITHUB_CLIENT_ID_DEV=[NEW_DEV_CLIENT_ID]
GITHUB_CLIENT_SECRET_DEV=[NEW_DEV_CLIENT_SECRET]

# Web App URLs
WEB_APP_URL=https://talk-with-veda.vercel.app
WEB_APP_URL_LOCAL=http://localhost:5174
```

## Benefits of This Approach
- ✅ No confusion with multiple callback URLs
- ✅ Better security separation
- ✅ Easier to manage and debug
- ✅ Industry standard practice
- ✅ No GitHub interface issues

## Next Steps
1. Create the new development OAuth app
2. Copy the new Client ID and Secret
3. Update the environment variables
4. Test both environments separately

This approach is much cleaner and avoids the GitHub interface issues you're experiencing.