# AWS Infrastructure Deployment Guide

This directory contains CloudFormation templates for deploying Youman.ai on AWS.

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. AWS account with permissions to create:
   - VPC, Subnets, Security Groups
   - RDS, DocumentDB, ElastiCache
   - S3 Buckets
   - IAM Roles
   - ECS/Fargate (if using containerized backend)

## Cost Estimates

### Monthly Costs (Development/Staging)
- **RDS PostgreSQL (db.t3.micro)**: ~$12/month
- **DocumentDB (db.t3.medium)**: ~$37/month
- **ElastiCache Redis (cache.t3.micro)**: ~$12/month
- **S3 Storage**: ~$0.023/GB/month (first 50TB)
- **Data Transfer**: ~$0.09/GB (outbound)
- **Bedrock**: Pay-per-use (see pricing below)
- **ECS Fargate**: ~$0.04/vCPU-hour + $0.004/GB-hour

**Total Base Infrastructure**: ~$61/month + usage

### AWS Bedrock Pricing (as of 2024)
- **Claude 3 Haiku**: $0.25/$1.25 per 1M tokens (input/output)
- **Claude 3.5 Sonnet**: $3/$15 per 1M tokens
- **Claude 3 Opus**: $15/$75 per 1M tokens
- **Llama 3.1 70B**: $0.65/$0.65 per 1M tokens

## Deployment Steps

### 1. Create S3 Bucket for CloudFormation Templates (optional)

```bash
aws s3 mb s3://youman-cf-templates-$(aws sts get-caller-identity --query Account --output text)
```

### 2. Deploy Infrastructure

```bash
cd aws/infrastructure

# Create stack
aws cloudformation create-stack \
  --stack-name youman-ai-production \
  --template-body file://cloudformation-template.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=DomainName,ParameterValue=droidver130.com \
    ParameterKey=Subdomain,ParameterValue=youman \
    ParameterKey=S3BucketName,ParameterValue=youman-ai-documents \
    ParameterKey=DatabasePassword,ParameterValue=YOUR_SECURE_PASSWORD \
  --capabilities CAPABILITY_NAMED_IAM

# Wait for stack creation
aws cloudformation wait stack-create-complete --stack-name youman-ai-production
```

### 3. Get Output Values

```bash
aws cloudformation describe-stacks \
  --stack-name youman-ai-production \
  --query 'Stacks[0].Outputs'
```

### 4. Update Environment Variables

Use the output values to configure your backend environment:

```bash
# Database
DATABASE_URL=postgresql://postgres:PASSWORD@<DatabaseEndpoint>:5432/ai_humanizer
MONGODB_URI=mongodb://postgres:PASSWORD@<DocumentDBEndpoint>:27017/ai_humanizer?tls=true
REDIS_URL=redis://<RedisEndpoint>:6379

# S3
S3_BUCKET=<S3BucketName>
S3_REGION=us-east-1
# Use IAM role credentials (no access keys needed)
```

### 5. Enable Bedrock Models

1. Go to AWS Console > Bedrock > Model access
2. Enable the models you want to use:
   - Claude 3 Haiku (recommended for cost)
   - Claude 3.5 Sonnet (recommended for quality)
   - Claude 3 Opus (for premium users)

### 6. Deploy Backend

#### Option A: ECS Fargate (Recommended)

```bash
# Build and push Docker image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com
docker build -t youman-backend:latest packages/backend
docker tag youman-backend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/youman-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/youman-backend:latest
```

#### Option B: Elastic Beanstalk

```bash
eb init -p docker youman-backend --region us-east-1
eb create youman-backend-production
```

## Cost Optimization Tips

1. **Use Reserved Instances** for RDS/DocumentDB (save up to 40%)
2. **Enable Auto Scaling** for ECS tasks
3. **Use S3 Lifecycle Policies** (already configured)
4. **Monitor Bedrock Usage** and use Haiku for basic operations
5. **Use CloudWatch Alarms** to monitor costs
6. **Consider Spot Instances** for non-critical workloads

## Monitoring

Set up CloudWatch dashboards to monitor:
- Database connections and performance
- Bedrock API usage and costs
- S3 storage and transfer
- Application logs and errors

## Cleanup

To delete all resources:

```bash
aws cloudformation delete-stack --stack-name youman-ai-production
```

Note: This will delete all data. Make sure to backup before deletion.

