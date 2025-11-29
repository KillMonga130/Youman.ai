/**
 * LLM Inference Service
 * Provides integration with OpenAI GPT, Anthropic Claude, and Google Gemini for text humanization
 * Phase 1: Quick win LLM API integration
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { HumanizationLevel, TransformStrategy } from '../transform/types';
import { SubscriptionTier } from '../subscription/types';

export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

export interface LLMInferenceOptions {
  provider?: LLMProvider;
  model?: string;
  level: HumanizationLevel;
  strategy: TransformStrategy;
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  userTier?: SubscriptionTier;
}

export interface LLMInferenceResult {
  humanizedText: string;
  provider: LLMProvider;
  model: string;
  latencyMs: number;
  tokensUsed?: number;
  cost?: number;
}

/**
 * LLM Inference Service
 * Handles text humanization using OpenAI GPT and Anthropic Claude
 */
export class LLMInferenceService {
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private geminiClient: GoogleGenerativeAI | null = null;
  private enabledProviders: Set<LLMProvider> = new Set();

  constructor() {
    this.initializeClients();
  }

  /**
   * Initializes LLM API clients
   */
  private initializeClients(): void {
    // Initialize OpenAI
    if (config.externalApis.openai) {
      try {
        this.openaiClient = new OpenAI({
          apiKey: config.externalApis.openai,
        });
        this.enabledProviders.add('openai');
        logger.info('OpenAI client initialized');
      } catch (error) {
        logger.error('Failed to initialize OpenAI client:', error);
      }
    }

    // Initialize Anthropic
    if (config.externalApis.anthropic) {
      try {
        this.anthropicClient = new Anthropic({
          apiKey: config.externalApis.anthropic,
        });
        this.enabledProviders.add('anthropic');
        logger.info('Anthropic client initialized');
      } catch (error) {
        logger.error('Failed to initialize Anthropic client:', error);
      }
    }

    // Initialize Google Gemini
    if (config.externalApis.google) {
      try {
        this.geminiClient = new GoogleGenerativeAI(config.externalApis.google);
        this.enabledProviders.add('gemini');
        logger.info('Google Gemini client initialized');
      } catch (error) {
        logger.error('Failed to initialize Gemini client:', error);
      }
    }
  }

  /**
   * Gets available providers
   */
  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.enabledProviders);
  }

  /**
   * Checks if a provider is available
   */
  isProviderAvailable(provider: LLMProvider): boolean {
    return this.enabledProviders.has(provider);
  }

  /**
   * Humanizes text using LLM
   */
  async humanize(
    text: string,
    options: LLMInferenceOptions
  ): Promise<LLMInferenceResult> {
    const provider = this.selectProvider(options.provider);
    const model = this.selectModel(provider, options.model, options.userTier);

    const startTime = Date.now();

    try {
      switch (provider) {
        case 'openai':
          return await this.humanizeWithOpenAI(text, model, options, startTime);
        case 'anthropic':
          return await this.humanizeWithAnthropic(text, model, options, startTime);
        case 'gemini':
          return await this.humanizeWithGemini(text, model, options, startTime);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      logger.error(`LLM inference failed with ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Selects the best available provider
   */
  private selectProvider(preferredProvider?: LLMProvider): LLMProvider {
    if (preferredProvider && this.enabledProviders.has(preferredProvider)) {
      return preferredProvider;
    }

    // Provider selection priority: OpenAI > Gemini > Anthropic
    // Gemini is prioritized over Anthropic for better cost-effectiveness
    if (this.enabledProviders.has('openai')) {
      return 'openai';
    }

    if (this.enabledProviders.has('gemini')) {
      return 'gemini';
    }

    if (this.enabledProviders.has('anthropic')) {
      return 'anthropic';
    }

    throw new Error('No LLM providers available. Please configure API keys.');
  }

  /**
   * Selects the appropriate model based on user tier
   */
  private selectModel(
    provider: LLMProvider,
    preferredModel?: string,
    userTier?: SubscriptionTier
  ): string {
    if (preferredModel) {
      return preferredModel;
    }

    // Model selection based on tier
    switch (provider) {
      case 'openai':
        // GPT-4o is the latest and most cost-effective (50% cheaper than GPT-4 Turbo)
        // Use it for all tiers for best balance of quality, speed, and cost
        // Model ID: 'gpt-4o' or 'gpt-4o-2024-08-06' (with date for versioning)
        return 'gpt-4o'; // Latest optimized model - better quality, faster, cheaper
      case 'anthropic':
        // Claude 3.5 Sonnet is the latest and improved version (30% faster, better quality)
        // Use latest for all tiers for consistent quality
        // Model ID format: 'claude-3-5-sonnet-YYYYMMDD'
        return 'claude-3-5-sonnet-20241022'; // Latest version - better than 3.0 Sonnet
      case 'gemini':
        // Gemini 2.0 Flash is extremely cost-effective ($0.000075 per 1K tokens)
        // Use for Basic tier or high-volume processing
        // For Professional/Enterprise, can use Gemini 1.5 Pro for longer context
        if (userTier === 'ENTERPRISE' || userTier === 'PROFESSIONAL') {
          return 'gemini-1.5-pro'; // Better for complex/long documents (2M context)
        }
        return 'gemini-2.0-flash-exp'; // Best cost efficiency, 1M context
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Humanizes text using OpenAI
   */
  private async humanizeWithOpenAI(
    text: string,
    model: string,
    options: LLMInferenceOptions,
    startTime: number
  ): Promise<LLMInferenceResult> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const prompt = this.buildHumanizationPrompt(text, options);

    const temperature = options.temperature ?? this.calculateTemperature(options.level);
    const maxTokens = options.maxTokens ?? this.calculateMaxTokens(text.length);

    const response = await this.openaiClient.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt(options),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const humanizedText = response.choices[0]?.message?.content || text;
    const latencyMs = Date.now() - startTime;

    return {
      humanizedText,
      provider: 'openai',
      model,
      latencyMs,
      tokensUsed: response.usage?.total_tokens,
      cost: this.calculateCost('openai', model, response.usage?.total_tokens ?? 0),
    };
  }

  /**
   * Humanizes text using Anthropic Claude
   */
  private async humanizeWithAnthropic(
    text: string,
    model: string,
    options: LLMInferenceOptions,
    startTime: number
  ): Promise<LLMInferenceResult> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const prompt = this.buildHumanizationPrompt(text, options);
    const systemPrompt = this.buildSystemPrompt(options);

    const temperature = options.temperature ?? this.calculateTemperature(options.level);
    const maxTokens = options.maxTokens ?? this.calculateMaxTokens(text.length);

    const response = await this.anthropicClient.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const humanizedText =
      response.content[0]?.type === 'text' ? response.content[0].text : text;
    const latencyMs = Date.now() - startTime;

    return {
      humanizedText,
      provider: 'anthropic',
      model,
      latencyMs,
      tokensUsed: response.usage?.input_tokens && response.usage?.output_tokens
        ? response.usage.input_tokens + response.usage.output_tokens
        : undefined,
      cost: this.calculateCost(
        'anthropic',
        model,
        (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
      ),
    };
  }

  /**
   * Humanizes text using Google Gemini
   */
  private async humanizeWithGemini(
    text: string,
    model: string,
    options: LLMInferenceOptions,
    startTime: number
  ): Promise<LLMInferenceResult> {
    if (!this.geminiClient) {
      throw new Error('Gemini client not initialized');
    }

    const systemPrompt = this.buildSystemPrompt(options);
    const prompt = this.buildHumanizationPrompt(text, options);
    
    // Combine system prompt and user prompt for Gemini
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const temperature = options.temperature ?? this.calculateTemperature(options.level);
    const maxTokens = options.maxTokens ?? this.calculateMaxTokens(text.length);

    try {
      const geminiModel = this.geminiClient.getGenerativeModel({ 
        model,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      });

      const result = await geminiModel.generateContent(fullPrompt);
      const response = result.response;
      const humanizedText = response.text() || text;
      const latencyMs = Date.now() - startTime;

      // Gemini provides token usage in a different format
      const usageMetadata = result.response.usageMetadata;
      const tokensUsed = usageMetadata 
        ? (usageMetadata.promptTokenCount || 0) + (usageMetadata.candidatesTokenCount || 0)
        : undefined;

      return {
        humanizedText,
        provider: 'gemini',
        model,
        latencyMs,
        tokensUsed,
        cost: this.calculateCost('gemini', model, tokensUsed || 0),
      };
    } catch (error) {
      logger.error('Gemini API error:', error);
      throw error;
    }
  }

  /**
   * Builds the system prompt for humanization
   */
  private buildSystemPrompt(options: LLMInferenceOptions): string {
    const strategyInstructions = this.getStrategyInstructions(options.strategy);
    const levelInstructions = this.getLevelInstructions(options.level);

    return `You are an expert text humanizer specializing in transforming AI-generated content to appear naturally human-written.

Your goal is to:
1. Maintain the original meaning and key information
2. Make the text sound natural and human-like
3. Avoid AI detection patterns (repetitive structures, overly formal tone, etc.)
4. Apply appropriate ${options.strategy} writing style
5. Apply ${levelInstructions} level of transformation

${strategyInstructions}

Guidelines:
- Use natural variations in sentence length and structure
- Incorporate casual expressions and contractions where appropriate
- Vary vocabulary and phrasing
- Add subtle imperfections that humans naturally include
- Preserve technical terms and proper nouns exactly
- Maintain the original tone and intent

Return ONLY the humanized text without explanations or commentary.`;
  }

  /**
   * Builds the user prompt with the text to humanize
   */
  private buildHumanizationPrompt(
    text: string,
    options: LLMInferenceOptions
  ): string {
    return `Please humanize the following text. Make it sound naturally written by a human while preserving all key information and meaning.

Text to humanize:
${text}

Apply ${options.strategy} style with level ${options.level} humanization.`;
  }

  /**
   * Gets strategy-specific instructions
   */
  private getStrategyInstructions(strategy: TransformStrategy): string {
    switch (strategy) {
      case 'casual':
        return 'Writing Style: Casual and conversational. Use contractions, casual vocabulary, and friendly tone.';
      case 'professional':
        return 'Writing Style: Professional and business-appropriate. Maintain formality while being natural.';
      case 'academic':
        return 'Writing Style: Academic and scholarly. Use sophisticated vocabulary, hedging phrases, and formal structure.';
      case 'auto':
        return 'Writing Style: Auto-detect the most appropriate style based on content.';
      default:
        return 'Writing Style: Natural and human-like.';
    }
  }

  /**
   * Gets level-specific instructions
   */
  private getLevelInstructions(level: HumanizationLevel): string {
    switch (level) {
      case 1:
        return 'minimal';
      case 2:
        return 'light';
      case 3:
        return 'moderate';
      case 4:
        return 'substantial';
      case 5:
        return 'extensive';
      default:
        return 'moderate';
    }
  }

  /**
   * Calculates temperature based on humanization level
   */
  private calculateTemperature(level: HumanizationLevel): number {
    // Higher level = more variation (higher temperature)
    // Range: 0.5 to 1.0
    return 0.5 + (level * 0.1);
  }

  /**
   * Calculates max tokens based on input length
   */
  private calculateMaxTokens(inputLength: number): number {
    // Allow up to 1.5x the input length for output
    return Math.min(Math.ceil(inputLength * 1.5), 4000);
  }

  /**
   * Estimates cost based on provider, model, and tokens
   */
  private calculateCost(
    provider: LLMProvider,
    model: string,
    tokens: number
  ): number {
    // Cost estimates per 1K tokens (updated as of 2024/2025)
    const costPer1K: Record<string, number> = {
      // OpenAI Models
      'openai-gpt-4': 0.03,
      'openai-gpt-4-turbo-preview': 0.01,
      'openai-gpt-4o': 0.005, // Latest: 50% cheaper than GPT-4 Turbo
      'openai-gpt-3.5-turbo': 0.0015,
      
      // Anthropic Models (Claude 3.5 is latest)
      'anthropic-claude-3-opus-20240229': 0.015,
      'anthropic-claude-3-sonnet-20240229': 0.003,
      'anthropic-claude-3-5-sonnet-20241022': 0.003, // Latest version (same price, better quality)
      'anthropic-claude-3-haiku-20240307': 0.00025,
      
      // Google Gemini Models (extremely cost-effective)
      'gemini-gemini-2.0-flash-exp': 0.000075, // Cheapest option - $0.000075 per 1K tokens
      'gemini-gemini-1.5-pro': 0.00125, // For long documents (2M context)
      'gemini-gemini-1.5-flash': 0.000075, // Fast and cheap
    };

    const key = `${provider}-${model}`;
    const costPer1KTokens = costPer1K[key] ?? 0.01;
    return (tokens / 1000) * costPer1KTokens;
  }
}

// Singleton instance
let llmInferenceServiceInstance: LLMInferenceService | null = null;

/**
 * Gets the singleton LLM inference service instance
 */
export function getLLMInferenceService(): LLMInferenceService {
  if (!llmInferenceServiceInstance) {
    llmInferenceServiceInstance = new LLMInferenceService();
  }
  return llmInferenceServiceInstance;
}

