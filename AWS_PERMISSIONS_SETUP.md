# AWS Permissions Setup Guide

## Issue
Your IAM user `vscode-cli-user` needs additional permissions to create AWS resources.

## Solution: Add Required Policies

### Option 1: Using AWS Console (Recommended)

1. **Go to IAM Console**
   - Open https://console.aws.amazon.com/iam/
   - Sign in with your AWS account

2. **Navigate to Your User**
   - Click "Users" in the left sidebar
   - Find and click on `vscode-cli-user`

3. **Attach Policies**
   - Click the "Permissions" tab
   - Click "Add permissions" → "Attach policies directly"
   - Search for and select these policies:
     - ✅ `AmazonDynamoDBFullAccess`
     - ✅ `AmazonS3FullAccess`
     - ✅ `AmazonOpenSearchServiceFullAccess` (for later)
     - ✅ `AmazonPollyFullAccess` (for text-to-speech)
     - ✅ `AmazonBedrockFullAccess` (for embeddings)
   - Click "Next" → "Add permissions"

4. **Verify Permissions**
   - You should see all 5 policies listed under "Permissions policies"

### Option 2: Using AWS CLI (Alternative)

Run these commands in PowerShell:

```powershell
# Attach DynamoDB permissions
aws iam attach-user-policy --user-name vscode-cli-user --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

# Attach S3 permissions
aws iam attach-user-policy --user-name vscode-cli-user --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Attach OpenSearch permissions
aws iam attach-user-policy --user-name vscode-cli-user --policy-arn arn:aws:iam::aws:policy/AmazonOpenSearchServiceFullAccess

# Attach Polly permissions
aws iam attach-user-policy --user-name vscode-cli-user --policy-arn arn:aws:iam::aws:policy/AmazonPollyFullAccess

# Attach Bedrock permissions
aws iam attach-user-policy --user-name vscode-cli-user --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
```

### Option 3: Create Custom Policy (Most Secure)

If you want minimal permissions, create a custom policy with only what's needed:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateTable",
        "dynamodb:DescribeTable",
        "dynamodb:UpdateTimeToLive",
        "dynamodb:TagResource",
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:034476915822:table/veda-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:PutBucketVersioning",
        "s3:PutBucketCORS",
        "s3:PutBucketTagging",
        "s3:PutBucketLifecycleConfiguration",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::veda-learn-*",
        "arn:aws:s3:::veda-learn-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "aoss:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "polly:SynthesizeSpeech"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    }
  ]
}
```

## After Adding Permissions

Once you've added the permissions, run the setup scripts again:

```powershell
# Create DynamoDB tables
.\create-dynamodb-tables.bat

# Create S3 buckets
.\create-s3-buckets.bat
```

## Verify Setup

Check that resources were created:

```powershell
# List DynamoDB tables
aws dynamodb list-tables --region us-east-1

# List S3 buckets
aws s3 ls | findstr veda-learn
```

## Next Steps

After resources are created:
1. Update `veda-learn-api/.env` with bucket names
2. Set up OpenSearch Serverless collection
3. Configure GitHub OAuth
4. Deploy Lambda functions
