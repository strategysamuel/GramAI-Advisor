#!/bin/bash

# GramAI Advisor - Complete Deployment Script
# This script automates the entire deployment process

set -e  # Exit on error

echo "=========================================="
echo "GramAI Advisor - AWS Deployment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Error: Terraform is not installed${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Step 1: Deploy Infrastructure
echo -e "${YELLOW}Step 1: Deploying AWS Infrastructure with Terraform...${NC}"
cd terraform

if [ ! -d ".terraform" ]; then
    echo "Initializing Terraform..."
    terraform init
fi

echo "Applying Terraform configuration..."
terraform apply -auto-approve

echo -e "${GREEN}✓ Infrastructure deployed${NC}"
echo ""

# Get outputs
API_ENDPOINT=$(terraform output -raw api_endpoint)
S3_BUCKET=$(terraform output -raw s3_bucket_name)
LAMBDA_FUNCTION=$(terraform output -raw lambda_function_name)

cd ..

# Step 2: Package Lambda Code
echo -e "${YELLOW}Step 2: Packaging Lambda function...${NC}"
cd lambda

echo "Installing dependencies..."
npm install --production

echo "Creating deployment package..."
zip -r deployment.zip src/ node_modules/ package.json > /dev/null

echo -e "${GREEN}✓ Lambda packaged${NC}"
echo ""

# Step 3: Deploy Lambda Code
echo -e "${YELLOW}Step 3: Deploying Lambda code...${NC}"

aws lambda update-function-code \
    --function-name $LAMBDA_FUNCTION \
    --zip-file fileb://deployment.zip \
    --region ap-south-1

echo -e "${GREEN}✓ Lambda code deployed${NC}"
echo ""

cd ..

# Step 4: Upload Data Files
echo -e "${YELLOW}Step 4: Uploading data files to S3...${NC}"

aws s3 cp lambda/data/market-prices.json s3://$S3_BUCKET/market-data/prices.json
aws s3 cp lambda/data/schemes.json s3://$S3_BUCKET/scheme-data/schemes.json

echo -e "${GREEN}✓ Data files uploaded${NC}"
echo ""

# Step 5: Test Deployment
echo -e "${YELLOW}Step 5: Testing deployment...${NC}"

TEST_RESPONSE=$(curl -s -X POST $API_ENDPOINT \
    -H "Content-Type: application/json" \
    -d '{
        "farmerId": "F123",
        "query": "My paddy leaves are turning yellow",
        "state": "Tamil Nadu",
        "district": "Thanjavur",
        "crop": "Paddy",
        "season": "Kharif"
    }')

if echo "$TEST_RESPONSE" | grep -q "requestId"; then
    echo -e "${GREEN}✓ Deployment test successful${NC}"
else
    echo -e "${RED}✗ Deployment test failed${NC}"
    echo "Response: $TEST_RESPONSE"
fi

echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "API Endpoint: $API_ENDPOINT"
echo "S3 Bucket: $S3_BUCKET"
echo "Lambda Function: $LAMBDA_FUNCTION"
echo ""
echo "Test the API with:"
echo "curl -X POST $API_ENDPOINT \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"farmerId\": \"F123\", \"query\": \"My paddy leaves are turning yellow\", \"state\": \"Tamil Nadu\", \"district\": \"Thanjavur\", \"crop\": \"Paddy\", \"season\": \"Kharif\"}'"
echo ""
echo "View logs:"
echo "aws logs tail /aws/lambda/$LAMBDA_FUNCTION --follow"
echo ""
