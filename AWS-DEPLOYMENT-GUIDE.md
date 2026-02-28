# GramAI Advisor - AWS Deployment Guide

Complete guide for deploying GramAI Advisor on AWS using Terraform and Lambda.

## Architecture Overview

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   API Gateway       │
│   (HTTP API)        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   Lambda Function   │
│   (Node.js 18.x)    │
│                     │
│   Services:         │
│   - Language        │
│   - Profile         │
│   - Image           │
│   - Market          │
│   - Scheme          │
│   - Advisory        │
│   - Storage         │
└──────┬──────────────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌─────────────┐    ┌─────────────┐
│  DynamoDB   │    │     S3      │
│  (Farmers)  │    │  (Storage)  │
└─────────────┘    └─────────────┘
       │                  │
       └──────────┬───────┘
                  │
       ┌──────────┴───────────┐
       │                      │
       ▼                      ▼
┌─────────────┐    ┌─────────────┐
│   Bedrock   │    │  Translate  │
│  (Claude)   │    │             │
└─────────────┘    └─────────────┘
```

## Prerequisites

### 1. AWS Account Setup
- Active AWS account
- AWS CLI installed and configured
- Appropriate IAM permissions for:
  - Lambda
  - API Gateway
  - DynamoDB
  - S3
  - IAM
  - CloudWatch
  - Bedrock
  - Translate

### 2. Enable Bedrock Access
1. Go to AWS Bedrock console (ap-south-1 region)
2. Navigate to "Model access"
3. Request access to "Claude 3 Haiku" model
4. Wait for approval (usually instant)

### 3. Local Tools
- Terraform >= 1.0
- Node.js >= 18.x
- AWS CLI >= 2.0
- jq (for JSON parsing in tests)
- bash (for deployment scripts)

## Quick Start Deployment

### Option 1: Automated Deployment (Recommended)

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

This script will:
1. Initialize and apply Terraform configuration
2. Package Lambda function
3. Deploy Lambda code
4. Upload data files to S3
5. Test the deployment

### Option 2: Manual Step-by-Step Deployment

#### Step 1: Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply -auto-approve
```

#### Step 2: Package Lambda Function

```bash
cd ../lambda
npm install --production
npm run package
```

#### Step 3: Deploy Lambda Code

```bash
aws lambda update-function-code \
    --function-name gramai-advisory-handler \
    --zip-file fileb://deployment.zip \
    --region ap-south-1
```

#### Step 4: Upload Data Files

```bash
aws s3 cp data/market-prices.json s3://gramai-storage-prod/market-data/prices.json
aws s3 cp data/schemes.json s3://gramai-storage-prod/scheme-data/schemes.json
```

#### Step 5: Get API Endpoint

```bash
cd ../terraform
terraform output api_endpoint
```

## Testing the Deployment

### Test 1: Basic Query

```bash
curl -X POST <API_ENDPOINT> \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "F123",
    "query": "My paddy leaves are turning yellow",
    "state": "Tamil Nadu",
    "district": "Thanjavur",
    "crop": "Paddy",
    "season": "Kharif"
  }'
```

### Test 2: With Image Analysis

```bash
# Convert image to base64
IMAGE_BASE64=$(base64 -w 0 path/to/image.jpg)

curl -X POST <API_ENDPOINT> \
  -H "Content-Type: application/json" \
  -d "{
    \"farmerId\": \"F124\",
    \"query\": \"What is wrong with my crop?\",
    \"state\": \"Tamil Nadu\",
    \"district\": \"Thanjavur\",
    \"crop\": \"Paddy\",
    \"season\": \"Kharif\",
    \"imageBase64\": \"$IMAGE_BASE64\"
  }"
```

### Test 3: Multilingual Query

```bash
curl -X POST <API_ENDPOINT> \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "F125",
    "query": "मेरे गेहूं की फसल में कीड़े लग गए हैं",
    "state": "Uttar Pradesh",
    "district": "Agra",
    "crop": "Wheat",
    "season": "Rabi",
    "language": "hi"
  }'
```

### Automated Test Suite

```bash
chmod +x test-api.sh
./test-api.sh
```

## API Reference

### Endpoint
```
POST <API_ENDPOINT>/advisory
```

### Request Body

```json
{
  "farmerId": "string (required)",
  "query": "string (required)",
  "state": "string (optional)",
  "district": "string (optional)",
  "crop": "string (optional)",
  "season": "string (optional)",
  "imageBase64": "string (optional)",
  "language": "string (optional, default: 'en')"
}
```

### Response

```json
{
  "requestId": "string",
  "farmerId": "string",
  "detectedLanguage": "string",
  "advisory": {
    "diagnosis": "string",
    "treatment": "string",
    "riskLevel": "Low|Medium|High",
    "marketInsight": "string",
    "schemeSuggestion": "string",
    "explanation": "string",
    "confidence": number
  },
  "marketInsights": {
    "crop": "string",
    "currentPrice": number,
    "unit": "string",
    "demand": "string",
    "trend": "string"
  },
  "relevantSchemes": [
    {
      "name": "string",
      "description": "string",
      "benefits": []
    }
  ],
  "imageAnalysis": {
    "summary": "string",
    "confidence": number
  },
  "timestamp": "string"
}
```

## Monitoring and Logs

### View Lambda Logs

```bash
aws logs tail /aws/lambda/gramai-advisory-handler --follow
```

### View API Gateway Logs

```bash
aws logs tail /aws/apigateway/gramai-advisor --follow
```

### Check Lambda Metrics

```bash
aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Invocations \
    --dimensions Name=FunctionName,Value=gramai-advisory-handler \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Sum
```

## Cost Estimation

### Hackathon Usage (Moderate Traffic)

| Service | Usage | Cost/Day | Cost/Month |
|---------|-------|----------|------------|
| Lambda | 10,000 requests | $0.20 | $6.00 |
| DynamoDB | On-demand | $0.25 | $7.50 |
| S3 | 1GB storage | $0.02 | $0.60 |
| API Gateway | 10,000 requests | $0.10 | $3.00 |
| Bedrock (Claude 3 Haiku) | 10,000 requests | $2.00 | $60.00 |
| Translate | Moderate usage | $0.50 | $15.00 |
| **Total** | | **$3.07** | **$92.10** |

### Production Usage (High Traffic)

| Service | Usage | Cost/Day | Cost/Month |
|---------|-------|----------|------------|
| Lambda | 100,000 requests | $2.00 | $60.00 |
| DynamoDB | On-demand | $2.50 | $75.00 |
| S3 | 10GB storage | $0.20 | $6.00 |
| API Gateway | 100,000 requests | $1.00 | $30.00 |
| Bedrock (Claude 3 Haiku) | 100,000 requests | $20.00 | $600.00 |
| Translate | High usage | $5.00 | $150.00 |
| **Total** | | **$30.70** | **$921.00** |

## Troubleshooting

### Issue: Lambda Timeout

**Symptom**: Requests taking longer than 30 seconds

**Solution**:
```bash
cd terraform
# Edit variables.tf to increase lambda_timeout
terraform apply -auto-approve
```

### Issue: Bedrock Access Denied

**Symptom**: Error: "Access denied to Bedrock model"

**Solution**:
1. Go to AWS Bedrock console
2. Enable model access for Claude 3 Haiku
3. Wait for approval
4. Redeploy Lambda

### Issue: DynamoDB Throttling

**Symptom**: "ProvisionedThroughputExceededException"

**Solution**: Already using on-demand billing, check for hot partitions

### Issue: S3 Access Denied

**Symptom**: "Access Denied" when uploading/downloading from S3

**Solution**: Check IAM role permissions in terraform/main.tf

### Issue: API Gateway 502 Error

**Symptom**: API returns 502 Bad Gateway

**Solution**:
1. Check Lambda logs for errors
2. Verify Lambda function is deployed
3. Check Lambda execution role permissions

## Security Best Practices

1. **IAM Roles**: Use least-privilege policies
2. **Encryption**: All data encrypted at rest (S3, DynamoDB)
3. **API Security**: Consider adding API keys or Cognito auth
4. **Logging**: All requests logged to CloudWatch
5. **VPC**: Consider deploying Lambda in VPC for production
6. **Secrets**: Use AWS Secrets Manager for sensitive data

## Cleanup

To destroy all resources:

```bash
cd terraform
terraform destroy -auto-approve
```

**Warning**: This will delete all data including:
- DynamoDB table and all records
- S3 bucket and all files
- Lambda function
- API Gateway
- CloudWatch logs

## Next Steps

1. **Add Authentication**: Integrate AWS Cognito or API keys
2. **Add Caching**: Use API Gateway caching or ElastiCache
3. **Add CDN**: Use CloudFront for global distribution
4. **Add Monitoring**: Set up CloudWatch alarms and dashboards
5. **Add CI/CD**: Automate deployment with GitHub Actions or CodePipeline
6. **Add Testing**: Implement integration and load tests
7. **Add Documentation**: Generate API documentation with Swagger

## Support

For issues or questions:
- Check CloudWatch logs
- Review Terraform state
- Consult AWS documentation
- Contact AWS support

## License

See LICENSE file in the project root.
