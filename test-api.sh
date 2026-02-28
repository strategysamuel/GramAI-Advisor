#!/bin/bash

# Test script for GramAI Advisor API

# Get API endpoint from Terraform
cd terraform
API_ENDPOINT=$(terraform output -raw api_endpoint 2>/dev/null)
cd ..

if [ -z "$API_ENDPOINT" ]; then
    echo "Error: Could not get API endpoint. Make sure Terraform is deployed."
    exit 1
fi

echo "Testing GramAI Advisor API"
echo "API Endpoint: $API_ENDPOINT"
echo ""

# Test 1: Basic Query
echo "Test 1: Basic paddy query..."
curl -X POST $API_ENDPOINT \
    -H "Content-Type: application/json" \
    -d '{
        "farmerId": "F123",
        "query": "My paddy leaves are turning yellow",
        "state": "Tamil Nadu",
        "district": "Thanjavur",
        "crop": "Paddy",
        "season": "Kharif"
    }' | jq '.'

echo ""
echo "---"
echo ""

# Test 2: Query with Language
echo "Test 2: Query with Hindi language..."
curl -X POST $API_ENDPOINT \
    -H "Content-Type: application/json" \
    -d '{
        "farmerId": "F124",
        "query": "मेरे गेहूं की फसल में कीड़े लग गए हैं",
        "state": "Uttar Pradesh",
        "district": "Agra",
        "crop": "Wheat",
        "season": "Rabi",
        "language": "hi"
    }' | jq '.'

echo ""
echo "---"
echo ""

# Test 3: Cotton Query
echo "Test 3: Cotton pest query..."
curl -X POST $API_ENDPOINT \
    -H "Content-Type: application/json" \
    -d '{
        "farmerId": "F125",
        "query": "Cotton plants showing white spots on leaves",
        "state": "Gujarat",
        "district": "Ahmedabad",
        "crop": "Cotton",
        "season": "Kharif"
    }' | jq '.'

echo ""
echo "---"
echo ""

# Test 4: Market Price Query
echo "Test 4: Market price query..."
curl -X POST $API_ENDPOINT \
    -H "Content-Type: application/json" \
    -d '{
        "farmerId": "F126",
        "query": "What is the current market price for tomatoes?",
        "state": "Maharashtra",
        "district": "Pune",
        "crop": "Tomato",
        "season": "Kharif"
    }' | jq '.'

echo ""
echo "Tests completed!"
