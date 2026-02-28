# AWS Credentials Setup Guide

## Quick Setup (5 minutes)

### Step 1: Get AWS Credentials

1. Log into AWS Console: https://console.aws.amazon.com
2. Go to IAM → Users → Your User → Security Credentials
3. Click "Create Access Key"
4. Choose "Command Line Interface (CLI)"
5. Download or copy:
   - Access Key ID
   - Secret Access Key

### Step 2: Configure AWS CLI

Open PowerShell and run:

```powershell
aws configure
```

Enter when prompted:
- AWS Access Key ID: [paste your access key]
- AWS Secret Access Key: [paste your secret key]
- Default region name: `ap-south-1`
- Default output format: `json`

### Step 3: Verify Configuration

```powershell
aws sts get-caller-identity
```

You should see your AWS account details.

### Step 4: Enable Bedrock Access

1. Go to AWS Console → Bedrock
2. Navigate to "Model access" in left sidebar
3. Click "Manage model access"
4. Enable "Claude 3 Haiku" by Anthropic
5. Click "Save changes"
6. Wait 2-3 minutes for access to be granted

### Step 5: Deploy GramAI Advisor

```powershell
cd "D:\SAMUEL\Kiro-Projects\GramAI Advisor"
chmod +x deploy.sh
./deploy.sh
```

## Troubleshooting

### Error: "InvalidClientTokenId"
- Your credentials are not configured
- Run `aws configure` again

### Error: "Access Denied" for Bedrock
- Enable model access in Bedrock console
- Wait a few minutes after enabling

### Error: "Terraform not found"
- Install Terraform: https://www.terraform.io/downloads
- Or use Chocolatey: `choco install terraform`

### Error: "Node.js not found"
- Install Node.js 18.x: https://nodejs.org/
- Verify: `node --version`

## What Gets Deployed

1. **S3 Bucket**: gramai-storage-prod
2. **DynamoDB Table**: gramai-farmers
3. **Lambda Function**: gramai-advisory-handler
4. **API Gateway**: HTTP API endpoint
5. **IAM Role**: Lambda execution role with minimal permissions

## Cost Estimate

- Hackathon usage (10,000 requests/day): ~$3/day
- Free tier eligible for first month

## After Deployment

1. Get API endpoint:
   ```powershell
   cd terraform
   terraform output api_endpoint
   ```

2. Test API:
   ```powershell
   ./test-api.sh
   ```

3. View logs:
   ```powershell
   aws logs tail /aws/lambda/gramai-advisory-handler --follow
   ```

## Security Notes

- Never commit AWS credentials to Git
- Use IAM roles in production
- Enable MFA on your AWS account
- Rotate access keys regularly

## Need Help?

- AWS Documentation: https://docs.aws.amazon.com/
- Terraform AWS Provider: https://registry.terraform.io/providers/hashicorp/aws/
- GramAI Deployment Guide: See AWS-DEPLOYMENT-GUIDE.md
