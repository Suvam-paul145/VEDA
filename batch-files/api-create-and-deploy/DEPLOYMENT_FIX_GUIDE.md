# Serverless Deployment Fix Guide

## Issue Summary
Your deployment is failing because the IAM user `vscode-cli-user` lacks CloudFormation permissions required by the Serverless Framework.

## Error Details
```
User: arn:aws:iam::034476915822:user/vscode-cli-user is not authorized to perform: cloudformation:CreateChangeSet
```

## Solution Steps

### Step 1: Add Deployment Permissions
Run the batch file to add the necessary permissions:

```bash
./fix-deployment-permissions.bat
```

This will:
- Create a new IAM policy `VedaServerlessDeployment` with CloudFormation, Lambda, API Gateway, and CloudWatch permissions
- Attach the policy to your `vscode-cli-user`
- Verify the policy attachment

### Step 2: Verify Your Current Policies
After running the script, you should have these policies attached:
- `veda-access` (your existing OpenSearch policy)
- `VedaServerlessDeployment` (new deployment policy)

### Step 3: Deploy the Application
Navigate to the API directory and deploy:

```bash
cd veda-learn-api
npx serverless deploy
```

### Step 4: Update Environment Variables
After successful deployment, the output will show:
- REST API endpoint
- WebSocket API endpoint

Update your `.env` file with the WebSocket endpoint:
```
WS_API_ENDPOINT=wss://your-websocket-id.execute-api.us-east-1.amazonaws.com/prod
```

## What the New Policy Includes

### CloudFormation Permissions
- Create/update/delete stacks
- Manage change sets
- Describe stack resources

### Lambda Permissions  
- Create/update/delete functions
- Manage function configuration
- Add/remove permissions

### API Gateway Permissions
- Full API Gateway access for REST and WebSocket APIs

### CloudWatch Logs Permissions
- Create log groups and streams
- Put log events
- Manage retention policies

### S3 Deployment Permissions
- Access to Serverless deployment buckets (veda-learn-api-*)

### IAM Role Access
- Get and pass the `veda-lambda-role`

## Troubleshooting

### If Policy Creation Fails
The policy might already exist. Check with:
```bash
aws iam get-policy --policy-arn arn:aws:iam::034476915822:policy/VedaServerlessDeployment
```

### If You Hit the 10-Policy Limit
You currently have these policies:
1. `veda-access` (OpenSearch)
2. `VedaServerlessDeployment` (new)

If you need to add more policies later, consider:
- Consolidating policies into fewer, broader policies
- Using IAM groups instead of direct user policies
- Creating a custom role for deployment

### If Deployment Still Fails
Check for these common issues:
1. **Environment variables**: Ensure all required variables are in `.env`
2. **Role permissions**: Verify `veda-lambda-role` has the necessary permissions
3. **Region consistency**: All resources should be in `us-east-1`

## Next Steps After Deployment
1. Test the API endpoints
2. Update the VS Code extension configuration
3. Test the WebSocket connection
4. Verify the RAG system with OpenSearch

## Files Created/Modified
- `aws-serverless-deployment-policy.json` - IAM policy definition
- `fix-deployment-permissions.bat` - Automated setup script
- `veda-learn-api/serverless.yml` - Fixed timeout warnings
- `DEPLOYMENT_FIX_GUIDE.md` - This guide