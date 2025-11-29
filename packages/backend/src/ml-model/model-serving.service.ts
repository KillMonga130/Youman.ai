/**
 * Model Serving Service
 * Provides infrastructure for serving custom trained ML models
 * Supports TensorFlow Serving, TorchServe, and cloud ML services
 * Phase 3: Model Serving Infrastructure
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { Deployment } from './types';
import { HumanizationLevel, TransformStrategy } from '../transform/types';

export type ServingBackend = 'tensorflow-serving' | 'torchserve' | 'sagemaker' | 'custom';

export interface ModelServingConfig {
  backend: ServingBackend;
  endpoint: string;
  timeout?: number;
  apiKey?: string;
  healthCheckPath?: string;
}

export interface ModelInferenceRequest {
  text: string;
  level: HumanizationLevel;
  strategy: TransformStrategy;
  features?: Record<string, unknown>;
}

export interface ModelInferenceResult {
  humanizedText: string;
  latencyMs: number;
  modelVersion?: string;
  confidence?: number;
  features?: Record<string, unknown>;
}

/**
 * Model Serving Service
 * Handles inference requests to deployed ML models
 */
export class ModelServingService {
  private httpClient: AxiosInstance;
  private configs: Map<string, ModelServingConfig> = new Map();

  constructor() {
    this.httpClient = axios.create({
      timeout: 30000, // 30 second default timeout
    });
  }

  /**
   * Registers a model serving configuration
   */
  registerModel(modelId: string, config: ModelServingConfig): void {
    this.configs.set(modelId, config);
    logger.info(`Registered model serving config for ${modelId}`, { backend: config.backend });
  }

  /**
   * Gets serving configuration for a model
   */
  getConfig(modelId: string): ModelServingConfig | undefined {
    return this.configs.get(modelId);
  }

  /**
   * Performs inference using a deployed model
   */
  async infer(
    modelId: string,
    deployment: Deployment,
    request: ModelInferenceRequest
  ): Promise<ModelInferenceResult> {
    const config = this.configs.get(modelId);
    if (!config) {
      // Try to infer config from deployment
      const inferredConfig = this.inferConfigFromDeployment(deployment);
      if (!inferredConfig) {
        throw new Error(`No serving configuration found for model ${modelId}`);
      }
      return this.performInference(inferredConfig, request);
    }

    return this.performInference(config, request);
  }

  /**
   * Infers serving configuration from deployment
   */
  private inferConfigFromDeployment(deployment: Deployment): ModelServingConfig | null {
    // In a real implementation, this would extract endpoint from deployment metadata
    // For now, return null to require explicit registration
    return null;
  }

  /**
   * Performs inference based on serving backend
   */
  private async performInference(
    config: ModelServingConfig,
    request: ModelInferenceRequest
  ): Promise<ModelInferenceResult> {
    const startTime = Date.now();

    try {
      switch (config.backend) {
        case 'tensorflow-serving':
          return await this.inferWithTensorFlowServing(config, request, startTime);
        case 'torchserve':
          return await this.inferWithTorchServe(config, request, startTime);
        case 'sagemaker':
          return await this.inferWithSageMaker(config, request, startTime);
        case 'custom':
          return await this.inferWithCustomEndpoint(config, request, startTime);
        default:
          throw new Error(`Unsupported serving backend: ${config.backend}`);
      }
    } catch (error) {
      logger.error('Model inference failed', { 
        backend: config.backend, 
        endpoint: config.endpoint,
        error 
      });
      throw error;
    }
  }

  /**
   * Inference with TensorFlow Serving
   */
  private async inferWithTensorFlowServing(
    config: ModelServingConfig,
    request: ModelInferenceRequest,
    startTime: number
  ): Promise<ModelInferenceResult> {
    // TensorFlow Serving uses REST API with specific format
    const payload = {
      instances: [{
        text: request.text,
        level: request.level,
        strategy: request.strategy,
        ...request.features,
      }],
    };

    const response = await this.httpClient.post(
      `${config.endpoint}/v1/models/model:predict`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
        },
        timeout: config.timeout ?? 30000,
      }
    );

    const predictions = response.data.predictions;
    const humanizedText = predictions[0]?.text || request.text;
    const latencyMs = Date.now() - startTime;

    return {
      humanizedText,
      latencyMs,
      confidence: predictions[0]?.confidence,
      features: predictions[0]?.features,
    };
  }

  /**
   * Inference with TorchServe
   */
  private async inferWithTorchServe(
    config: ModelServingConfig,
    request: ModelInferenceRequest,
    startTime: number
  ): Promise<ModelInferenceResult> {
    // TorchServe uses specific endpoint format
    const payload = {
      text: request.text,
      level: request.level,
      strategy: request.strategy,
      ...request.features,
    };

    const response = await this.httpClient.post(
      `${config.endpoint}/predictions/model`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
        },
        timeout: config.timeout ?? 30000,
      }
    );

    const result = response.data;
    const latencyMs = Date.now() - startTime;

    return {
      humanizedText: result.humanized_text || result.text || request.text,
      latencyMs,
      confidence: result.confidence,
      features: result.features,
    };
  }

  /**
   * Inference with AWS SageMaker
   */
  private async inferWithSageMaker(
    config: ModelServingConfig,
    request: ModelInferenceRequest,
    startTime: number
  ): Promise<ModelInferenceResult> {
    // SageMaker endpoint format
    const payload = {
      text: request.text,
      level: request.level,
      strategy: request.strategy,
      ...request.features,
    };

    const response = await this.httpClient.post(
      config.endpoint,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
        },
        timeout: config.timeout ?? 30000,
      }
    );

    const result = response.data;
    const latencyMs = Date.now() - startTime;

    return {
      humanizedText: result.humanized_text || result.text || request.text,
      latencyMs,
      confidence: result.confidence,
      modelVersion: result.model_version,
    };
  }

  /**
   * Inference with custom endpoint
   */
  private async inferWithCustomEndpoint(
    config: ModelServingConfig,
    request: ModelInferenceRequest,
    startTime: number
  ): Promise<ModelInferenceResult> {
    const payload = {
      text: request.text,
      level: request.level,
      strategy: request.strategy,
      ...request.features,
    };

    const response = await this.httpClient.post(
      config.endpoint,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
        },
        timeout: config.timeout ?? 30000,
      }
    );

    const result = response.data;
    const latencyMs = Date.now() - startTime;

    return {
      humanizedText: result.humanizedText || result.humanized_text || result.text || request.text,
      latencyMs,
      confidence: result.confidence,
      modelVersion: result.modelVersion || result.model_version,
      features: result.features,
    };
  }

  /**
   * Checks if a model endpoint is healthy
   */
  async healthCheck(modelId: string): Promise<boolean> {
    const config = this.configs.get(modelId);
    if (!config) {
      return false;
    }

    try {
      const healthPath = config.healthCheckPath || '/health';
      const response = await this.httpClient.get(`${config.endpoint}${healthPath}`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      logger.warn(`Health check failed for model ${modelId}`, { error });
      return false;
    }
  }

  /**
   * Gets all registered model IDs
   */
  getRegisteredModels(): string[] {
    return Array.from(this.configs.keys());
  }
}

// Singleton instance
let modelServingServiceInstance: ModelServingService | null = null;

/**
 * Gets the singleton model serving service instance
 */
export function getModelServingService(): ModelServingService {
  if (!modelServingServiceInstance) {
    modelServingServiceInstance = new ModelServingService();
  }
  return modelServingServiceInstance;
}

