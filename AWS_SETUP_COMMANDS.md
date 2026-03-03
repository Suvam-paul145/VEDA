# AWS Setup Commands - Quick Reference

This file contains all AWS CLI commands needed to set up the infrastructure for Veda Learn. Run these commands in order.

## Prerequisites

```bash
# Verify AWS CLI is installed
aws --version

# Configure AWS CLI (if not already done)
aws configure
```

## 1. DynamoDB Tables

### Users Table
```bash
aws dynamodb create-table \
  --table-name veda-users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Mistakes Table
```bash
aws dynamodb create-table \
  --table-name veda-mistakes \
  --attribute-definitions \
    AttributeName=mistakeId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=mistakeId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName": "userId-index",
    "KeySchema": [{"AttributeName":"userId","KeyType":"HASH"}],
    "Projection": {"ProjectionType":"ALL"}
  }]' \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Lessons Table
```bash
aws dynamodb create-table \
  --table-name veda-lessons \
  --attribute-definitions \
    AttributeName=lessonId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=lessonId,KeyType=HASH \
  --global-secondary-indexes '[{
    "IndexName": "userId-index",
    "KeySchema": [{"AttributeName":"userId","KeyType":"HASH"}],
    "Projection": {"ProjectionType":"ALL"}
  }]' \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Learning Profiles Table
```bash
aws dynamodb create-table \
  --table-name veda-profiles \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=language,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=language,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### WebSocket Connections Table
```bash
aws dynamodb create-table \
  --table-name veda-ws-connections \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Rate Limits Table
```bash
aws dynamodb create-table \
  --table-name veda-rate-limits \
  --attribute-definitions AttributeName=lockKey,AttributeType=S \
  --key-schema AttributeName=lockKey,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Enable TTL
aws dynamodb update-time-to-live \
  --table-name veda-rate-limits \
  --time-to-live-specification "Enabled=true, AttributeName=ttl" \
  --region us-east-1
```

## 2. S3 Buckets

### Audio Bucket
```bash
aws s3api create-bucket \
  --bucket veda-learn-audio \
  --region us-east-1

# Set CORS
aws s3api put-bucket-cors \
  --bucket veda-learn-audio \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["*"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET"],
      "MaxAgeSeconds": 3000
    }]
  }'
```

### Concepts Bucket
```bash
aws s3api create-bucket \
  --bucket veda-learn-concepts \
  --region us-east-1
```

## 3. OpenSearch Serverless

**⚠️ IMPORTANT: Replace `YOUR_ACCOUNT_ID` with your actual AWS account ID**

### Encryption Policy
```bash
aws opensearchserverless create-security-policy \
  --name veda-encryption \
  --type encryption \
  --policy '{"Rules":[{"Resource":["collection/veda-concepts"],"ResourceType":"collection"}],"AWSOwnedKey":true}' \
  --region us-east-1
```

### Network Policy
```bash
aws opensearchserverless create-security-policy \
  --name veda-network \
  --type network \
  --policy '[{"Rules":[{"Resource":["collection/veda-concepts"],"ResourceType":"collection"},{"Resource":["collection/veda-concepts"],"ResourceType":"dashboard"}],"AllowFromPublic":true}]' \
  --region us-east-1
```

### Data Access Policy
```bash
aws opensearchserverless create-access-policy \
  --name veda-access \
  --type data \
  --policy '[{"Description":"Lambda access","Rules":[{"Resource":["collection/veda-concepts"],"Permission":["aoss:*"],"ResourceType":"collection"},{"Resource":["index/veda-concepts/*"],"Permission":["aoss:*"],"ResourceType":"index"}],"Principal":["arn:aws:iam::YOUR_ACCOUNT_ID:role/veda-lambda-role"]}]' \
  --region us-east-1
```

### Create Collection
```bash
aws opensearchserverless create-collection \
  --name veda-concepts \
  --type VECTORSEARCH \
  --region us-east-1
```

### Get Collection Endpoint
```bash
# Wait ~2 minutes for collection to become ACTIVE
aws opensearchserverless list-collections --region us-east-1
```

## 4. Verification Commands

### Check DynamoDB Tables
```bash
aws dynamodb list-tables --region us-east-1
```

### Check S3 Buckets
```bash
aws s3 ls
```

### Check OpenSearch Collections
```bash
aws opensearchserverless list-collections --region us-east-1
```

### Check Table Status
```bash
aws dynamodb describe-table --table-name veda-users --region us-east-1 | grep TableStatus
```

## 5. Cleanup Commands (Use with Caution!)

### Delete DynamoDB Tables
```bash
aws dynamodb delete-table --table-name veda-users --region us-east-1
aws dynamodb delete-table --table-name veda-mistakes --region us-east-1
aws dynamodb delete-table --table-name veda-lessons --region us-east-1
aws dynamodb delete-table --table-name veda-profiles --region us-east-1
aws dynamodb delete-table --table-name veda-ws-connections --region us-east-1
aws dynamodb delete-table --table-name veda-rate-limits --region us-east-1
```

### Delete S3 Buckets
```bash
# Empty buckets first
aws s3 rm s3://veda-learn-audio --recursive
aws s3 rm s3://veda-learn-concepts --recursive

# Then delete
aws s3api delete-bucket --bucket veda-learn-audio --region us-east-1
aws s3api delete-bucket --bucket veda-learn-concepts --region us-east-1
```

### Delete OpenSearch Collection
```bash
aws opensearchserverless delete-collection --id <collection-id> --region us-east-1
```

## 6. Useful Monitoring Commands

### Check Lambda Logs
```bash
aws logs tail /aws/lambda/veda-learn-api-dev-analyze --follow
```

### Check DynamoDB Item Count
```bash
aws dynamodb scan --table-name veda-users --select COUNT --region us-east-1
```

### Check S3 Bucket Size
```bash
aws s3 ls s3://veda-learn-audio --recursive --human-readable --summarize
```

### Get OpenSearch Collection Details
```bash
aws opensearchserverless batch-get-collection --names veda-concepts --region us-east-1
```

## 7. Cost Monitoring

### Get Current Month Costs
```bash
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

### Set Up Billing Alert
```bash
# Create SNS topic for billing alerts
aws sns create-topic --name billing-alerts --region us-east-1

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:billing-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com
```

## Notes

- All commands use `us-east-1` region
- DynamoDB tables use `PAY_PER_REQUEST` billing mode (no capacity planning needed)
- S3 bucket names must be globally unique - add a suffix if needed
- OpenSearch collection takes ~2 minutes to become ACTIVE
- Always verify commands completed successfully before proceeding

## Troubleshooting

### "Table already exists" error
This is normal if you're re-running commands. The table was created successfully.

### "Access Denied" error
Check your AWS credentials and IAM permissions.

### "Bucket name already taken"
S3 bucket names are globally unique. Add a suffix: `veda-learn-audio-yourname`

### OpenSearch collection not ACTIVE
Wait 2-3 minutes and check again with:
```bash
aws opensearchserverless list-collections --region us-east-1
```
