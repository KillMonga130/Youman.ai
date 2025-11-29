# AWS Native Deployment Guide for Youman.ai

This guide walks you through deploying Youman.ai fully on AWS using AWS-native services.

## Overview

This deployment uses:
- **AWS Bedrock** for all LLM operations (replaces OpenAI/Anthropic/Google)
- **S3** for document storage
- **RDS PostgreSQL** for relational data
- **DocumentDB** for MongoDB-compatible document storage
- **ElastiCache Redis** for caching
- **AWS Amplify** for frontend hosting
- **ECS Fargate** or **Elastic Beanstalk** for backend hosting

## Prerequisites

1. ✅ AWS CLI configured (`aws configure`)
2. ✅ AWS account with appropriate permissions
3. ✅ Domain `droidver130.com` managed in Squarespace
4. ✅ Bedrock models enabled in AWS Console

## Step 1: Enable AWS Bedrock Models

1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Click **"Model access"** in the left sidebar
3. Enable the following models (cost-optimized selection):
   - ✅ **Claude 3 Haiku** - For free/basic users ($0.25/$1.25 per 1M tokens)
   - ✅ **Claude 3.5 Sonnet** - For standard users ($3/$15 per 1M tokens)
   - ✅ **Claude 3 Opus** - For premium users ($15/$75 per 1M tokens)
   - ✅ **Llama 3.1 70B** - Alternative option ($0.65/$0.65 per 1M tokens)

4. Click **"Save changes"**

## Step 2: Deploy AWS Infrastructure

Run the deployment script:

```bash
cd aws
./deploy.sh production
```

Or manually:

```bash
aws cloudformation deploy \
  --template-file aws/infrastructure/cloudformation-template.yaml \
  --stack-name youman-ai-production \
  --parameter-overrides \
    Environment=production \
    DomainName=droidver130.com \
    Subdomain=youman \
    S3BucketName=youman-ai-documents \
    DatabasePassword=YOUR_SECURE_PASSWORD \
  --capabilities CAPABILITY_NAMED_IAM
```

This creates:
- S3 bucket with lifecycle policies
- RDS PostgreSQL database
- DocumentDB cluster
- ElastiCache Redis
- VPC and networking
- Security groups
- IAM roles with Bedrock and S3 permissions

**Estimated time**: 15-20 minutes

## Step 3: Get Infrastructure Outputs

```bash
aws cloudformation describe-stacks \
  --stack-name youman-ai-production \
  --query 'Stacks[0].Outputs'
```

Save these values for the next step.

## Step 4: Configure Backend Environment

Create `.env` file in `packages/backend/`:

```env
# Environment
NODE_ENV=production
PORT=3001

# Database (from CloudFormation outputs)
DATABASE_URL=postgresql://postgres:PASSWORD@<DatabaseEndpoint>:5432/ai_humanizer
MONGODB_URI=mongodb://postgres:PASSWORD@<DocumentDBEndpoint>:27017/ai_humanizer?tls=true&replicaSet=rs0
REDIS_URL=redis://<RedisEndpoint>:6379

# AWS S3 (from CloudFormation outputs)
S3_BUCKET=<S3BucketName>
S3_REGION=us-east-1
# No access keys needed - uses IAM role

# AWS Bedrock (uses AWS credentials automatically)
AWS_REGION=us-east-1
AWS_BEDROCK_ENABLED=true

# JWT
JWT_SECRET=YOUR_SECURE_JWT_SECRET

# CORS (update after Amplify deployment)
CORS_ORIGINS=https://youman.droidver130.com,https://main.AMPLIFY_APP_ID.amplifyapp.com
```

**Note**: When running on ECS/Fargate, the IAM role will automatically provide credentials for S3 and Bedrock.

## Step 5: Deploy Frontend to AWS Amplify

### Option A: Using AWS Console (Recommended)

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"New app"** > **"Host web app"**
3. Connect your Git repository (GitHub, GitLab, Bitbucket)
4. Select your repository and branch
5. Amplify will auto-detect the build settings from `amplify.yml`
6. Review and click **"Save and deploy"**

### Option B: Using Amplify CLI

```bash
npm install -g @aws-amplify/cli
amplify init
amplify add hosting
amplify publish
```

### Get Amplify App URL

After deployment, you'll get a URL like:
```
https://main.d12345abcdef.amplifyapp.com
```

Save this URL for domain configuration.

## Step 6: Configure Domain (Subdomain Setup)

### Step 6.1: Configure AWS Amplify Domain

1. In Amplify Console, go to your app
2. Click **"Domain management"** in the left sidebar
3. Click **"Add domain"**
4. Enter: `droidver130.com`
5. Click **"Configure domain"**
6. **Uncheck** the root domain (`droidver130.com`)
7. **Uncheck** the `www` subdomain
8. **Add subdomain**: `youman`
9. Click **"Save"**
10. Copy the **CNAME value** (e.g., `d12345abcdef.cloudfront.net`)

### Step 6.2: Configure Squarespace DNS

1. Log in to Squarespace
2. Go to **Settings** > **Domains**
3. Click on `droidver130.com`
4. Click **"DNS Settings"**
5. Scroll to **"Custom Records"** and click **"Add Record"**
6. Configure:
   - **Type**: CNAME
   - **Host**: `youman`
   - **Data**: Paste the CNAME value from Amplify (e.g., `d12345abcdef.cloudfront.net`)
7. Click **"Save"**

**Note**: DNS propagation can take up to 48 hours, but usually completes within a few minutes.

### Step 6.3: SSL Certificate (Automatic)

AWS Amplify automatically provisions and manages SSL certificates via AWS Certificate Manager. No action needed.

## Step 7: Deploy Backend

### Option A: ECS Fargate (Recommended for Production)

1. **Create ECR Repository**:
```bash
aws ecr create-repository --repository-name youman-backend --region us-east-1
```

2. **Build and Push Docker Image**:
```bash
# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -t youman-backend:latest packages/backend

# Tag and push
docker tag youman-backend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/youman-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/youman-backend:latest
```

3. **Create ECS Task Definition** (see `aws/ecs/task-definition.json`)

4. **Create ECS Service**:
```bash
aws ecs create-service \
  --cluster youman-cluster \
  --service-name youman-backend \
  --task-definition youman-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Option B: Elastic Beanstalk (Easier Setup)

```bash
cd packages/backend
eb init -p docker youman-backend --region us-east-1
eb create youman-backend-production
eb setenv \
  DATABASE_URL="postgresql://..." \
  MONGODB_URI="mongodb://..." \
  REDIS_URL="redis://..." \
  S3_BUCKET="youman-ai-documents-production" \
  AWS_REGION="us-east-1" \
  AWS_BEDROCK_ENABLED="true" \
  JWT_SECRET="YOUR_SECRET" \
  CORS_ORIGINS="https://youman.droidver130.com"
eb deploy
```

## Step 8: Update Frontend API URL

Update `packages/frontend/.env.production`:

```env
VITE_API_URL=https://your-backend-url.com
```

Or if using API Gateway/ALB, update accordingly.

## Step 9: Verify Deployment

1. **Test Frontend**: Visit `https://youman.droidver130.com`
2. **Test Backend**: 
   ```bash
   curl https://your-backend-url.com/api/v1/health
   ```
3. **Test Bedrock**: 
   ```bash
   cd packages/backend
   npm run test:bedrock
   ```

## Cost Optimization

### Monthly Base Costs (~$61/month)
- RDS PostgreSQL (db.t3.micro): ~$12/month
- DocumentDB (db.t3.medium): ~$37/month
- ElastiCache Redis (cache.t3.micro): ~$12/month
- S3 Storage: ~$0.023/GB/month
- ECS Fargate: ~$15-30/month (depending on usage)

### Usage-Based Costs
- **AWS Bedrock**: Pay per token
  - Claude Haiku: $0.25/$1.25 per 1M tokens
  - Claude Sonnet: $3/$15 per 1M tokens
  - Claude Opus: $15/$75 per 1M tokens
- **Data Transfer**: $0.09/GB outbound
- **Amplify**: Free tier includes 15GB storage, 5GB bandwidth

### Cost Savings Tips

1. **Use Reserved Instances** for RDS/DocumentDB (save 40%)
2. **Enable Auto Scaling** to scale down during low usage
3. **Use S3 Lifecycle Policies** (already configured)
4. **Monitor Bedrock Usage** - use Haiku for basic operations
5. **Set up CloudWatch Billing Alarms**
6. **Use Spot Instances** for non-critical workloads

## Monitoring

### CloudWatch Dashboards

Create dashboards to monitor:
- Database connections and performance
- Bedrock API usage and costs
- S3 storage and transfer
- Application logs and errors
- ECS task health

### Set Up Billing Alarms

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name youman-monthly-billing \
  --alarm-description "Alert when monthly costs exceed $200" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 200 \
  --comparison-operator GreaterThanThreshold
```

## Troubleshooting

### Bedrock Access Denied
- Ensure models are enabled in Bedrock Console
- Check IAM role has `bedrock:InvokeModel` permission
- Verify AWS region matches (us-east-1)

### Database Connection Issues
- Check security groups allow traffic from backend
- Verify database endpoint and credentials
- Check VPC/subnet configuration

### S3 Access Issues
- Verify IAM role has S3 permissions
- Check bucket policy allows access
- Ensure bucket name matches environment variable

### Domain Not Resolving
- Wait for DNS propagation (up to 48 hours)
- Verify CNAME record in Squarespace DNS
- Check Amplify domain configuration

## Next Steps

1. ✅ Set up CI/CD pipeline (GitHub Actions, CodePipeline)
2. ✅ Configure monitoring and alerting
3. ✅ Set up automated backups
4. ✅ Enable CloudFront for CDN (if needed)
5. ✅ Configure WAF for security
6. ✅ Set up staging environment

## Support

For issues or questions:
- Check AWS CloudWatch Logs
- Review CloudFormation stack events
- Consult AWS documentation
- Check application logs in ECS/EB

---

**Deployment Complete!** 🎉

Your Youman.ai application is now fully deployed on AWS using native services.

