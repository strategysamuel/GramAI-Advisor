# GramAI Advisor - Deployment Checklist

## Pre-Deployment Checklist

### AWS Account Setup
- [ ] AWS account created and active
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS credentials configured (`aws configure`)
- [ ] Correct region set to `ap-south-1`
- [ ] IAM user has required permissions:
  - [ ] Lambda full access
  - [ ] API Gateway full access
  - [ ] DynamoDB full access
  - [ ] S3 full access
  - [ ] IAM role creation
  - [ ] CloudWatch logs access
  - [ ] Bedrock access
  - [ ] Translate access

### Bedrock Model Access
- [ ] Navigate to AWS Bedrock console (ap-south-1)
- [ ] Go to "Model access" section
- [ ] Request access to "Claude 3 Haiku" model
- [ ] Wait for approval (usually instant)
- [ ] Verify model access is "Available"

### Local Environment
- [ ] Terraform installed (`terraform version`)
- [ ] Node.js 18.x installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] jq installed (for testing) (`jq --version`)
- [ ] bash available (for scripts)
- [ ] Git repository cloned

## Deployment Steps

### Step 1: Infrastructure Deployment
- [ ] Navigate to project root
- [ ] Review `terraform/variables.tf` for any customizations
- [ ] Run `cd terraform`
- [ ] Run `terraform init`
- [ ] Run `terraform plan` (review output)
- [ ] Run `terraform apply -auto-approve`
- [ ] Verify no errors in output
- [ ] Note the API endpoint from outputs
- [ ] Run `cd ..`

### Step 2: Lambda Code Deployment
- [ ] Navigate to `lambda` directory
- [ ] Run `npm install --production`
- [ ] Verify no installation errors
- [ ] Run `npm run package`
- [ ] Verify `deployment.zip` is created
- [ ] Deploy to Lambda:
  ```bash
  aws lambda update-function-code \
    --function-name gramai-advisory-handler \
    --zip-file fileb://deployment.zip \
    --region ap-south-1
  ```
- [ ] Verify successful deployment message

### Step 3: Data Files Upload
- [ ] Upload market data:
  ```bash
  aws s3 cp data/market-prices.json s3://gramai-storage-prod/market-data/prices.json
  ```
- [ ] Upload schemes data:
  ```bash
  aws s3 cp data/schemes.json s3://gramai-storage-prod/scheme-data/schemes.json
  ```
- [ ] Verify files in S3:
  ```bash
  aws s3 ls s3://gramai-storage-prod/ --recursive
  ```

### Step 4: Testing
- [ ] Get API endpoint:
  ```bash
  cd terraform && terraform output api_endpoint
  ```
- [ ] Test basic query:
  ```bash
  curl -X POST <API_ENDPOINT> \
    -H "Content-Type: application/json" \
    -d '{"farmerId":"F123","query":"My paddy leaves are turning yellow","state":"Tamil Nadu","district":"Thanjavur","crop":"Paddy","season":"Kharif"}'
  ```
- [ ] Verify response contains `requestId`
- [ ] Verify response contains `advisory` object
- [ ] Run test suite: `./test-api.sh`
- [ ] All tests pass

### Step 5: Verification
- [ ] Check DynamoDB table:
  ```bash
  aws dynamodb scan --table-name gramai-farmers --limit 5
  ```
- [ ] Check S3 bucket:
  ```bash
  aws s3 ls s3://gramai-storage-prod/reports/ --recursive
  ```
- [ ] Check Lambda logs:
  ```bash
  aws logs tail /aws/lambda/gramai-advisory-handler --follow
  ```
- [ ] Verify no errors in logs

## Post-Deployment Checklist

### Monitoring Setup
- [ ] CloudWatch dashboard created (optional)
- [ ] CloudWatch alarms configured (optional)
- [ ] Log retention verified (7 days)
- [ ] Metrics collection enabled

### Documentation
- [ ] API endpoint documented
- [ ] Sample requests documented
- [ ] Team members have access
- [ ] Deployment guide shared

### Security Review
- [ ] IAM roles follow least-privilege
- [ ] S3 bucket has no public access
- [ ] DynamoDB encryption enabled
- [ ] CloudWatch logging enabled
- [ ] API Gateway CORS configured correctly

### Cost Monitoring
- [ ] AWS Cost Explorer enabled
- [ ] Budget alerts configured (optional)
- [ ] Daily cost tracking started
- [ ] Resource tagging verified

## Troubleshooting Checklist

### If Terraform Fails
- [ ] Check AWS credentials
- [ ] Verify IAM permissions
- [ ] Check region is ap-south-1
- [ ] Review error message
- [ ] Check Terraform state
- [ ] Try `terraform destroy` and redeploy

### If Lambda Fails
- [ ] Check CloudWatch logs
- [ ] Verify Lambda role permissions
- [ ] Check environment variables
- [ ] Verify deployment package
- [ ] Check Lambda timeout settings
- [ ] Verify Node.js version

### If API Returns Errors
- [ ] Check Lambda logs
- [ ] Verify API Gateway integration
- [ ] Check request format
- [ ] Verify Lambda permissions
- [ ] Check Bedrock model access
- [ ] Verify DynamoDB table exists

### If Bedrock Fails
- [ ] Verify model access enabled
- [ ] Check IAM role permissions
- [ ] Verify region is ap-south-1
- [ ] Check model ID is correct
- [ ] Review Bedrock quotas
- [ ] Check request format

## Cleanup Checklist (When Done)

### Before Cleanup
- [ ] Export important data from DynamoDB
- [ ] Download reports from S3
- [ ] Save CloudWatch logs (if needed)
- [ ] Document lessons learned

### Cleanup Steps
- [ ] Run `cd terraform`
- [ ] Run `terraform destroy -auto-approve`
- [ ] Verify all resources deleted
- [ ] Check AWS console for orphaned resources
- [ ] Verify no ongoing charges

## Success Criteria

Your deployment is successful when ALL of these are true:

- ✅ Terraform apply completed without errors
- ✅ Lambda function is active and deployed
- ✅ API endpoint returns valid JSON responses
- ✅ DynamoDB table contains request records
- ✅ S3 bucket contains uploaded files
- ✅ CloudWatch shows Lambda execution logs
- ✅ Test suite passes all tests
- ✅ No errors in CloudWatch logs
- ✅ API response time < 10 seconds
- ✅ Bedrock returns AI-generated advice

## Quick Reference Commands

```bash
# Get API endpoint
cd terraform && terraform output api_endpoint

# View Lambda logs
aws logs tail /aws/lambda/gramai-advisory-handler --follow

# Check DynamoDB
aws dynamodb scan --table-name gramai-farmers --limit 5

# List S3 files
aws s3 ls s3://gramai-storage-prod/ --recursive

# Test API
./test-api.sh

# Redeploy Lambda
cd lambda && npm run deploy

# Destroy infrastructure
cd terraform && terraform destroy -auto-approve
```

## Support Contacts

- AWS Support: https://console.aws.amazon.com/support/
- Terraform Docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Bedrock Docs: https://docs.aws.amazon.com/bedrock/
- Project Issues: Check CloudWatch logs first

---

**Ready to deploy?** Start with the Pre-Deployment Checklist and work your way down! 🚀
