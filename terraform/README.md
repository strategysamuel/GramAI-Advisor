# GramAI Advisor - AWS Infrastructure

This directory contains Terraform configuration for deploying GramAI Advisor on AWS.

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.0 installed
3. Node.js 18.x installed (for Lambda packaging)

## Deployment Steps

### Step 1: Initialize Terraform

```bash
cd terraform
terraform init
```

### Step 2: Review the Plan

```bash
terraform plan
```

### Step 3: Apply Infrastructure

```bash
terraform apply -auto-approve
```

This will create:
- S3 bucket: `gramai-storage-prod`
- DynamoDB table: `gramai-farmers`
- Lambda function: `gramai-advisory-handler`
- API Gateway HTTP API
- IAM roles and policies
- CloudWatch log groups

### Step 4: Package and Deploy Lambda Code

```bash
cd ../lambda
npm install
npm run package
```

### Step 5: Upload Data Files to S3

```bash
aws s3 cp data/market-prices.json s3://gramai-storage-prod/market-data/prices.json
aws s3 cp data/schemes.json s3://gramai-storage-prod/scheme-data/schemes.json
```

### Step 6: Test the Deployment

```bash
# Get the API endpoint from Terraform outputs
terraform output api_endpoint

# Test with curl
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

## Infrastructure Components

### S3 Bucket
- **Name**: gramai-storage-prod
- **Features**: Versioning, encryption, public access blocked
- **Usage**: Stores images, reports, and reference data

### DynamoDB Table
- **Name**: gramai-farmers
- **Keys**: farmerId (partition), requestId (sort)
- **Billing**: On-demand
- **Features**: TTL enabled, encryption at rest, point-in-time recovery

### Lambda Function
- **Name**: gramai-advisory-handler
- **Runtime**: Node.js 18.x
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Permissions**: Bedrock, Translate, DynamoDB, S3, CloudWatch

### API Gateway
- **Type**: HTTP API
- **Route**: POST /advisory
- **Features**: CORS enabled, access logging

## Outputs

After deployment, Terraform will output:
- `api_endpoint`: The API Gateway endpoint URL
- `s3_bucket_name`: S3 bucket name
- `dynamodb_table_name`: DynamoDB table name
- `lambda_function_arn`: Lambda function ARN
- `lambda_role_name`: IAM role name

## Cost Estimation

For hackathon usage (moderate traffic):
- **Lambda**: ~$0.20/day (10,000 requests)
- **DynamoDB**: ~$0.25/day (on-demand)
- **S3**: ~$0.02/day (1GB storage)
- **API Gateway**: ~$0.10/day (10,000 requests)
- **Bedrock**: ~$2.00/day (Claude 3 Haiku usage)
- **Translate**: ~$0.50/day (moderate usage)

**Total**: ~$3-5/day or ~$90-150/month

## Cleanup

To destroy all resources:

```bash
terraform destroy -auto-approve
```

## Security Notes

- All data is encrypted at rest
- IAM roles follow least-privilege principle
- No public access to S3 bucket
- CloudWatch logging enabled for audit trail
- API Gateway has CORS configured

## Troubleshooting

### Lambda Errors
Check CloudWatch logs:
```bash
aws logs tail /aws/lambda/gramai-advisory-handler --follow
```

### DynamoDB Issues
Verify table exists:
```bash
aws dynamodb describe-table --table-name gramai-farmers
```

### S3 Access Issues
Check bucket policy and IAM role permissions

### Bedrock Access
Ensure Bedrock model access is enabled in your AWS account:
- Go to AWS Bedrock console
- Request access to Claude 3 Haiku model
- Wait for approval (usually instant)

## Support

For issues or questions, refer to the main project README or AWS documentation.
