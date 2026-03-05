# Debug OAuth Flow - Step by Step

## Current Issue Analysis

Your extension is loading correctly, but the GitHub OAuth flow might have configuration issues. Let's debug this systematically.

## Step 1: Test the Auth Endpoint Directly

First, let's test if your auth endpoint is working:

```bash
# Test the auth callback endpoint (should return "Missing code")
curl "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/auth/github/callback"
```

**Expected Response**: `Missing code` (this confirms the endpoint is working)

## Step 2: Check GitHub OAuth App Configuration

Your GitHub OAuth app needs these exact settings:

1. **Go to GitHub**: https://github.com/settings/applications/2736893
2. **Verify these settings**:
   - **Application name**: Veda Learn (or any name)
   - **Homepage URL**: `https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev`
   - **Authorization callback URL**: `https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/auth/github/callback`

## Step 3: Test Manual OAuth Flow

1. **Open this URL in your browser** (replace with your actual client_id):
```
https://github.com/login/oauth/authorize?client_id=Ov23liUfaTgayCi8bO5n&redirect_uri=https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/auth/github/callback&scope=user:email
```

2. **What should happen**:
   - GitHub login page appears
   - You authorize the app
   - GitHub redirects to your callback URL
   - Your Lambda function processes the code
   - You get redirected to VS Code with: `vscode://veda-learn.veda-learn/auth?token=JWT_TOKEN`

## Step 4: Check VS Code URI Handler

The extension should handle the `vscode://veda-learn.veda-learn/auth?token=...` URI.

## Step 5: Debug Extension OAuth

If the manual flow works but the extension doesn't, the issue is in the extension's OAuth initiation.

## Common Issues & Solutions

### Issue 1: GitHub OAuth App Not Configured
**Solution**: Update GitHub OAuth app settings with correct callback URL

### Issue 2: VS Code URI Handler Not Working
**Solution**: Check extension manifest and URI handler registration

### Issue 3: CORS Issues
**Solution**: Verify API Gateway CORS configuration

### Issue 4: Environment Variables
**Solution**: Check if GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set correctly

## Testing Commands

```bash
# 1. Test auth endpoint
curl "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/auth/github/callback"

# 2. Check environment variables are loaded
aws logs tail /aws/lambda/veda-learn-api-dev-authCallback --follow

# 3. Test with a fake code (should show GitHub API error)
curl "https://afwwdtnwob.execute-api.us-east-1.amazonaws.com/dev/auth/github/callback?code=fake"
```

## Next Steps

1. Run the manual OAuth test first
2. Check GitHub OAuth app configuration
3. Monitor CloudWatch logs during OAuth flow
4. Test VS Code URI handling

Let me know what happens with each step!