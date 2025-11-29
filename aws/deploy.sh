#!/bin/bash
# AWS Deployment Script for Youman.ai

set -e

ENVIRONMENT=${1:-production}
STACK_NAME="youman-ai-${ENVIRONMENT}"

echo "🚀 Deploying Youman.ai to AWS (${ENVIRONMENT})..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

echo "✅ AWS credentials configured"

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "us-east-1")

echo "📦 Account: ${ACCOUNT_ID}, Region: ${REGION}"

# Prompt for database password
read -sp "Enter database password (min 8 chars): " DB_PASSWORD
echo ""

if [ ${#DB_PASSWORD} -lt 8 ]; then
    echo "❌ Password must be at least 8 characters"
    exit 1
fi

# Deploy CloudFormation stack
echo "📋 Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file aws/infrastructure/cloudformation-template.yaml \
  --stack-name ${STACK_NAME} \
  --parameter-overrides \
    Environment=${ENVIRONMENT} \
    DomainName=droidver130.com \
    Subdomain=youman \
    S3BucketName=youman-ai-documents \
    DatabasePassword=${DB_PASSWORD} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${REGION}

# Get stack outputs
echo "📊 Getting stack outputs..."
OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --query 'Stacks[0].Outputs' \
  --region ${REGION})

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Stack Outputs:"
echo "${OUTPUTS}"
echo ""
echo "🔧 Next steps:"
echo "1. Update backend .env with database endpoints from outputs above"
echo "2. Enable Bedrock models in AWS Console > Bedrock > Model access"
echo "3. Deploy backend to ECS/Elastic Beanstalk"
echo "4. Configure Amplify for frontend deployment"

