/**
 * AWS Bedrock Service
 * Integrates with AWS Bedrock for LLM inference
 * Cost-aware implementation with usage tracking
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface BedrockModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'amazon' | 'meta' | 'mistral' | 'cohere';
  modelId: string;
  region: string;
  inputCostPer1KTokens: number; // Cost in USD per 1K input tokens
  outputCostPer1KTokens: number; // Cost in USD per 1K output tokens
  maxTokens: number;
  supportsStreaming: boolean;
  tier: 'basic' | 'standard' | 'premium';
}

// Available Bedrock models with cost information (as of 2024)
export const BEDROCK_MODELS: BedrockModel[] = [
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    region: 'us-east-1',
    inputCostPer1KTokens: 0.003, // $3 per 1M tokens
    outputCostPer1KTokens: 0.015, // $15 per 1M tokens
    maxTokens: 8192,
    supportsStreaming: true,
    tier: 'premium',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    modelId: 'anthropic.claude-3-opus-20240229-v1:0',
    region: 'us-east-1',
    inputCostPer1KTokens: 0.015, // $15 per 1M tokens
    outputCostPer1KTokens: 0.075, // $75 per 1M tokens
    maxTokens: 4096,
    supportsStreaming: true,
    tier: 'premium',
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
    region: 'us-east-1',
    inputCostPer1KTokens: 0.00025, // $0.25 per 1M tokens
    outputCostPer1KTokens: 0.00125, // $1.25 per 1M tokens
    maxTokens: 8192,
    supportsStreaming: true,
    tier: 'basic',
  },
  {
    id: 'llama-3-1-70b',
    name: 'Llama 3.1 70B',
    provider: 'meta',
    modelId: 'meta.llama-3-1-70b-instruct-v1:0',
    region: 'us-east-1',
    inputCostPer1KTokens: 0.00065, // $0.65 per 1M tokens
    outputCostPer1KTokens: 0.00065, // $0.65 per 1M tokens
    maxTokens: 8192,
    supportsStreaming: true,
    tier: 'standard',
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'mistral',
    modelId: 'mistral.mistral-large-2402-v1:0',
    region: 'us-east-1',
    inputCostPer1KTokens: 0.002, // $2 per 1M tokens
    outputCostPer1KTokens: 0.006, // $6 per 1M tokens
    maxTokens: 8192,
    supportsStreaming: true,
    tier: 'standard',
  },
];

export interface BedrockInvokeOptions {
  modelId: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  region?: string;
}

export interface BedrockInvokeResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number; // Cost in USD
  model: string;
}

/**
 * Get Bedrock client for a specific region
 */
function getBedrockClient(region: string = 'us-east-1'): BedrockRuntimeClient {
  // AWS credentials should be configured via AWS CLI or environment variables
  // AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN
  return new BedrockRuntimeClient({
    region,
    // Credentials will be automatically picked up from:
    // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    // 2. AWS credentials file (~/.aws/credentials)
    // 3. IAM role (if running on EC2/ECS/Lambda)
  });
}

/**
 * Estimate cost for a Bedrock invocation
 */
export function estimateBedrockCost(
  model: BedrockModel,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): number {
  const inputCost = (estimatedInputTokens / 1000) * model.inputCostPer1KTokens;
  const outputCost = (estimatedOutputTokens / 1000) * model.outputCostPer1KTokens;
  return inputCost + outputCost;
}

/**
 * Invoke a Bedrock model
 */
export async function invokeBedrockModel(
  options: BedrockInvokeOptions
): Promise<BedrockInvokeResult> {
  const model = BEDROCK_MODELS.find(m => m.modelId === options.modelId || m.id === options.modelId);
  
  if (!model) {
    throw new Error(`Model not found: ${options.modelId}`);
  }

  const region = options.region || model.region;
  const client = getBedrockClient(region);

  // Prepare request based on provider
  let requestBody: any;
  let responsePath: string[];

  if (model.provider === 'anthropic') {
    requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: options.maxTokens || model.maxTokens,
      messages: [
        {
          role: 'user',
          content: options.prompt,
        },
      ],
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.topP !== undefined && { top_p: options.topP }),
    };
    responsePath = ['content', '0', 'text'];
  } else if (model.provider === 'meta') {
    requestBody = {
      prompt: options.prompt,
      max_gen_len: options.maxTokens || model.maxTokens,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 0.9,
    };
    responsePath = ['generation'];
  } else {
    // Default format for other providers
    requestBody = {
      prompt: options.prompt,
      max_tokens: options.maxTokens || model.maxTokens,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 0.9,
    };
    responsePath = ['completion'];
  }

  try {
    const command = new InvokeModelCommand({
      modelId: model.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract content based on provider
    let content = '';
    let current = responseBody;
    for (const key of responsePath) {
      current = current?.[key];
    }
    content = current || responseBody.text || responseBody.content || '';

    // Estimate token counts (rough approximation: 1 token ≈ 4 characters)
    const inputTokens = Math.ceil(options.prompt.length / 4);
    const outputTokens = Math.ceil(content.length / 4);

    const estimatedCost = estimateBedrockCost(model, inputTokens, outputTokens);

    logger.info('Bedrock invocation completed', {
      model: model.name,
      inputTokens,
      outputTokens,
      estimatedCost,
    });

    return {
      content,
      inputTokens,
      outputTokens,
      estimatedCost,
      model: model.name,
    };
  } catch (error) {
    logger.error('Bedrock invocation failed:', error);
    throw new Error(`Bedrock invocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List available Bedrock models
 */
export function listBedrockModels(): BedrockModel[] {
  return BEDROCK_MODELS;
}

/**
 * Get model by ID
 */
export function getBedrockModel(modelId: string): BedrockModel | undefined {
  return BEDROCK_MODELS.find(m => m.id === modelId || m.modelId === modelId);
}

