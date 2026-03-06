# GitHub OAuth App Configuration for Production

## Current Configuration
- **Client ID**: `Ov23liUfaTgayCi8bO5n`
- **Production URL**: `https://talk-with-veda.vercel.app`

## Required Updates

### 1. Update GitHub OAuth App Settings

Go to [GitHub Developer Settings](https://github.com/settings/developers) and update your OAuth app:

**Homepage URL:**
```
https://talk-with-veda.vercel.app
```

**Authorization callback URL:**
```
https://talk-with-veda.vercel.app/auth/callback
```

### 2. Environment Variables Status

✅ **Frontend (.env)** - Updated
- `VITE_APP_URL=https://talk-with-veda.vercel.app`
- `VITE_DEMO_MODE=false`

✅ **Backend (.env)** - Updated
- `WEB_APP_URL=https://talk-with-veda.vercel.app`
- `VEDA_DEMO_MODE=false`

✅ **Serverless Config** - Updated
- Added `WEB_APP_URL` environment variable

✅ **Auth Handler** - Updated
- Now redirects to `${WEB_APP_URL}/auth/callback?token=${token}`

### 3. Deployment Commands

Run the production deployment script:
```bash
DEPLOY_PRODUCTION.bat
```

Or manually:
```bash
# Deploy backend
cd veda-learn-api
npm install
npx serverless deploy

# Build frontend
cd ../veda-learn-web
npm install
npm run build
```

### 4. OAuth Flow Testing

After deployment, test the OAuth flow:

1. Visit: `https://talk-with-veda.vercel.app`
2. Click "Sign in with GitHub"
3. Authorize the app
4. Should redirect to: `https://talk-with-veda.vercel.app/auth/callback?token=...`
5. Frontend should handle the token and log you in

### 5. Troubleshooting

**If OAuth redirect fails:**
- Verify GitHub app callback URL matches exactly
- Check browser network tab for redirect responses
- Verify backend logs in AWS CloudWatch

**If CORS errors occur:**
- Ensure `WEB_APP_URL` is set correctly in backend
- Check API Gateway CORS configuration
- Verify frontend is making requests to correct API endpoints

## API Endpoints

**REST API:**
```
https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev
```

**WebSocket API:**
```
wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
```

**GitHub OAuth Callback:**
```
https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/auth/github/callback
```