/**
 * Test AWS Bedrock Access
 * Run this script to verify Bedrock is configured correctly
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

async function testBedrock() {
  console.log('Testing AWS Bedrock access...\n');

  // Test 1: Check AWS credentials
  console.log('1. Checking AWS credentials...');
  try {
    const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
    const stsClient = new STSClient({ region: 'us-east-1' });
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    console.log('✓ AWS credentials valid');
    console.log(`  Account: ${identity.Account}`);
    console.log(`  User/Role: ${identity.Arn}\n`);
  } catch (error) {
    console.error('✗ AWS credentials error:', error);
    console.error('\nPlease configure AWS credentials:');
    console.error('  - Run: aws configure');
    console.error('  - Or set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY\n');
    process.exit(1);
  }

  // Test 2: Try to list foundation models
  console.log('2. Testing Bedrock API access...');
  try {
    const { BedrockClient, ListFoundationModelsCommand } = await import('@aws-sdk/client-bedrock');
    const bedrockClient = new BedrockClient({ region: 'us-east-1' });
    const models = await bedrockClient.send(new ListFoundationModelsCommand({}));
    console.log('✓ Bedrock API accessible');
    console.log(`  Found ${models.modelSummaries?.length || 0} foundation models\n`);
  } catch (error: any) {
    if (error.name === 'AccessDeniedException' || error.message?.includes('not enabled')) {
      console.error('✗ Bedrock is not enabled in your AWS account');
      console.error('\nTo enable Bedrock:');
      console.error('  1. Go to AWS Console > Bedrock');
      console.error('  2. Enable the models you want to use');
      console.error('  3. Or use: aws bedrock put-model-invocation-logging-configuration\n');
    } else {
      console.error('✗ Bedrock API error:', error.message);
    }
    process.exit(1);
  }

  // Test 3: Try to invoke a model (Claude Haiku - cheapest)
  console.log('3. Testing model invocation (Claude 3 Haiku)...');
  try {
    const runtimeClient = new BedrockRuntimeClient({ region: 'us-east-1' });
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Say "Hello, Bedrock!"',
          },
        ],
      }),
    });

    const response = await runtimeClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('✓ Model invocation successful');
    console.log(`  Response: ${responseBody.content[0].text}\n`);
  } catch (error: any) {
    if (error.name === 'AccessDeniedException') {
      console.error('✗ Model access denied');
      console.error('  You may need to enable this model in AWS Bedrock console\n');
    } else if (error.name === 'ValidationException') {
      console.error('✗ Model validation error:', error.message);
      console.error('  The model ID might be incorrect\n');
    } else {
      console.error('✗ Model invocation error:', error.message);
    }
    process.exit(1);
  }

  console.log('✅ All Bedrock tests passed!');
  console.log('\nBedrock is ready to use in the application.');
}

testBedrock().catch(console.error);

