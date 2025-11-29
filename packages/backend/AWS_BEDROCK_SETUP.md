# AWS Bedrock Setup Guide

## Prerequisites

1. **AWS Account** with Bedrock access
2. **AWS CLI configured** with valid credentials
3. **Bedrock enabled** in your AWS account

## Step 1: Verify AWS Configuration

```bash
# Check AWS credentials
aws configure list

# Verify your identity
aws sts get-caller-identity
```

## Step 2: Enable Bedrock in AWS Console

1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Navigate to "Model access" in the left sidebar
3. Enable the models you want to use:
   - **Anthropic Claude 3.5 Sonnet** (`anthropic.claude-3-5-sonnet-20241022-v2:0`)
   - **Anthropic Claude 3 Haiku** (`anthropic.claude-3-haiku-20240307-v1:0`)
   - **Meta Llama 3.1 70B** (`meta.llama-3-1-70b-instruct-v1:0`)
   - **Mistral Large** (`mistral.mistral-large-2402-v1:0`)

## Step 3: Test Bedrock Access

Run the test script:

```bash
cd packages/backend
npm run test:bedrock
```

This will:
1. Verify AWS credentials
2. Test Bedrock API access
3. Test model invocation with Claude 3 Haiku

## Step 4: Verify Models are Available

You can also manually test:

```bash
# List available foundation models
aws bedrock list-foundation-models --region us-east-1

# Test Claude 3 Haiku invocation
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-haiku-20240307-v1:0 \
  --region us-east-1 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}' \
  --cli-binary-format raw-in-base64-out \
  output.json
```

## Troubleshooting

### Error: "Bedrock is not enabled"
- Go to AWS Console > Bedrock > Model access
- Enable the models you need
- Wait a few minutes for activation

### Error: "AccessDeniedException"
- Check IAM permissions - you need `bedrock:InvokeModel` permission
- Add this policy to your IAM user/role:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:ListFoundationModels"
      ],
      "Resource": "*"
    }
  ]
}
```

### Error: "Model not found"
- Verify the model ID is correct
- Check the region (default is `us-east-1`)
- Some models may not be available in all regions

## Cost Information

Current pricing (as of 2024):
- **Claude 3.5 Sonnet**: $3/$15 per 1M tokens (input/output)
- **Claude 3 Opus**: $15/$75 per 1M tokens (input/output)
- **Claude 3 Haiku**: $0.25/$1.25 per 1M tokens (input/output)
- **Llama 3.1 70B**: $0.65/$0.65 per 1M tokens (input/output)
- **Mistral Large**: $2/$6 per 1M tokens (input/output)

The application shows cost estimates before humanization if cost > $0.01.

## Environment Variables (Optional)

If you prefer environment variables over AWS CLI:

```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1
```

The Bedrock service will automatically use these if AWS CLI is not configured.

