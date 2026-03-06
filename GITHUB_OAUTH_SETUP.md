# GitHub OAuth App Configuration

## Current Configuration
- **Client ID**: `Ov23liUfaTgayCi8bO5n`
- **Production URL**: `https://talk-with-veda.vercel.app`
- **Local Development URL**: `http://localhost:5174`

## Required GitHub OAuth App Settings

Go to [GitHub Developer Settings](https://github.com/settings/developers) and update your OAuth app with **BOTH** callback URLs:

### Homepage URL:
```
https://talk-with-veda.vercel.app
```

### Authorization callback URLs (ADD BOTH):
```
https://talk-with-veda.vercel.app/auth/callback
http://localhost:5174/auth/callback
```

**IMPORTANT**: You must add BOTH callback URLs to your GitHub OAuth app. GitHub allows multiple callback URLs, and our backend will automatically detect which one to use based on the request origin.

## How It Works

The backend auth handler (`handlers/auth.js`) now intelligently detects the request origin:

- **Local Development**: If the request comes from `localhost`, it redirects to `http://localhost:5174/auth/callback`
- **Production**: If the request comes from production, it redirects to `https://talk-with-veda.vercel.app/auth/callback`

## Environment Variables Updated

### Backend (.env)
```env
WEB_APP_URL=https://talk-with-veda.vercel.app
WEB_APP_URL_LOCAL=http://localhost:5174
```

### Frontend (.env) - No changes needed
```env
VITE_APP_URL=https://talk-with-veda.vercel.app
```

## Testing Both Environments

### Local Development Testing:
1. Start local server: `cd veda-learn-web && npm run dev`
2. Visit: `http://localhost:5174`
3. Click "Sign in with GitHub"
4. Should redirect back to: `http://localhost:5174/auth/callback?token=...`

### Production Testing:
1. Deploy to Vercel: `https://talk-with-veda.vercel.app`
2. Visit the production URL
3. Click "Sign in with GitHub"  
4. Should redirect back to: `https://talk-with-veda.vercel.app/auth/callback?token=...`

## Deployment Commands

Deploy the updated backend:
```bash
cd veda-learn-api
npx serverless deploy
```

## Troubleshooting

**If you still see "Be careful!" warning:**
1. Double-check that BOTH callback URLs are added to your GitHub OAuth app
2. Make sure there are no typos in the URLs
3. Ensure the GitHub OAuth app is using the correct Client ID: `Ov23liUfaTgayCi8bO5n`

**If OAuth redirect fails:**
- Check browser network tab for the actual redirect URL
- Verify the backend logs in AWS CloudWatch
- Ensure both environment variables are set correctly