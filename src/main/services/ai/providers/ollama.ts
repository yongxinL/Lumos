/**
 * Ollama AI Provider Implementation
 *
 * Wraps OllamaClient to implement the IAIProvider interface.
 * Provides local LLM inference via Ollama with provider abstraction.
 *
 * Design Decisions:
 * - Delegates to existing OllamaClient for actual API communication
 * - Maps Ollama-specific errors to provider-agnostic errors
 * - Converts Ollama types to common provider types
 * - Supports all Ollama features: streaming, JSON mode, model management
 */

import { EventEmitter } from 'events';
import type { OllamaConfig, ModelInfo as OllamaModelInfo } from '@/types/ai/ollama';
import type {
  AIProviderType,
  AIProviderConfig,
  AIProviderCapabilities,
  GenerateOptions,
  GenerateResponse,
  StreamChunk,
  ModelInfo,
  ProviderHealthCheck,
} from '@/types/ai/provider';
import { OllamaClient } from '../ollamaClient';
import {
  OllamaError,
  OllamaConnectionError,
  OllamaTimeoutError,
  OllamaModelNotFoundError,
  OllamaAPIError,
  OllamaInvalidResponseError,
} from '../ollamaErrors';
import {
  AIProviderError,
  ProviderConnectionError,
  ProviderTimeoutError,
  ProviderModelNotFoundError,
  ProviderAPIError,
  ProviderInvalidResponseError,
} from './errors';
import type { IAIProvider } from './types';

/**
 * Ollama provider capabilities
 */
export const OLLAMA_CAPABILITIES: AIProviderCapabilities = {
  streaming: true,
  constrainedDecoding: true,
  functionCalling: false,
  conversationContext: true,
  vision: true, // Some Ollama models support vision (e.g., llava)
  maxContextTokens: 128000, // Depends on model, using conservative default
  modelManagement: true,
};

/**
 * Ollama AI Provider
 *
 * Implements IAIProvider interface using OllamaClient for local inference.
 */
export class OllamaProvider extends EventEmitter implements IAIProvider {
  public readonly type: AIProviderType = 'ollama';
  public readonly name: string;
  public readonly capabilities: AIProviderCapabilities;
  public readonly config: AIProviderConfig;

  private client: OllamaClient;

  constructor(config: AIProviderConfig) {
    super();

    if (config.type !== 'ollama') {
      throw new Error(`Invalid provider type for OllamaProvider: ${config.type}`);
    }

    this.config = config;
    this.name = config.name || 'Ollama';
    this.capabilities = { ...OLLAMA_CAPABILITIES };

    // Extract Ollama-specific config
    const ollamaConfig: Partial<OllamaConfig> = {
      baseUrl: (config.config.baseUrl as string) || 'http://localhost:11434',
      timeout: config.timeout || 120000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    };

    this.client = new OllamaClient(ollamaConfig);

    // Forward events from OllamaClient
    this.client.on('pull:progress', (progress) => {
      this.emit('pull:progress', progress);
    });
    this.client.on('generate:chunk', (chunk) => {
      this.emit('generate:chunk', chunk);
    });
  }

  /**
   * Generate text completion (non-streaming)
   */
  public async generate(options: GenerateOptions): Promise<GenerateResponse> {
    try {
      const startTime = Date.now();

      const text = await this.client.generate({
        model: options.model,
        prompt: options.prompt,
        system: options.system,
        format: options.format,
        context: options.context as number[] | undefined,
        options: {
          temperature: options.temperature,
          top_k: options.topK,
          top_p: options.topP,
          num_predict: options.maxTokens,
          stop: options.stopSequences,
          repeat_penalty: options.repeatPenalty,
          presence_penalty: options.presencePenalty,
          frequency_penalty: options.frequencyPenalty,
        },
      });

      const endTime = Date.now();

      return {
        provider: this.type,
        model: options.model,
        text,
        timestamp: new Date().toISOString(),
        timing: {
          total: endTime - startTime,
        },
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Generate text completion with streaming chunks
   */
  public async generateStream(
    options: GenerateOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<GenerateResponse> {
    try {
      const startTime = Date.now();

      const text = await this.client.generateStream(
        {
          model: options.model,
          prompt: options.prompt,
          system: options.system,
          format: options.format,
          context: options.context as number[] | undefined,
          options: {
            temperature: options.temperature,
            top_k: options.topK,
            top_p: options.topP,
            num_predict: options.maxTokens,
            stop: options.stopSequences,
            repeat_penalty: options.repeatPenalty,
            presence_penalty: options.presencePenalty,
            frequency_penalty: options.frequencyPenalty,
          },
        },
        (textChunk: string) => {
          // OllamaClient only provides text chunks, not full metadata
          // We create StreamChunk with minimal info
          const commonChunk: StreamChunk = {
            provider: this.type,
            model: options.model,
            text: textChunk,
            done: false, // We don't know when it's done from the chunk
            timestamp: new Date().toISOString(),
          };

          onChunk(commonChunk);
        }
      );

      // Send final chunk with done=true
      const finalChunk: StreamChunk = {
        provider: this.type,
        model: options.model,
        text: '',
        done: true,
        timestamp: new Date().toISOString(),
      };
      onChunk(finalChunk);

      const endTime = Date.now();

      return {
        provider: this.type,
        model: options.model,
        text,
        timestamp: new Date().toISOString(),
        timing: {
          total: endTime - startTime,
        },
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Check if Ollama is available and healthy
   */
  public async checkHealth(): Promise<ProviderHealthCheck> {
    const startTime = Date.now();

    try {
      const isHealthy: boolean = await this.client.checkHealth();
      const endTime = Date.now();

      let modelsCount: number | undefined;
      try {
        const ollamaModels = (await this.client.listModels()) as unknown as OllamaModelInfo[];
        modelsCount = ollamaModels.length;
      } catch {
        // Ignore error, models count is optional
      }

      return {
        provider: this.type,
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: endTime - startTime,
        availableModels: modelsCount,
      };
    } catch (error) {
      const endTime = Date.now();

      return {
        provider: this.type,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: endTime - startTime,
      };
    }
  }

  /**
   * Check if Ollama is currently available
   */
  public async isAvailable(): Promise<boolean> {
    try {
      const health: boolean = await this.client.checkHealth();
      return health;
    } catch {
      return false;
    }
  }

  /**
   * List available models from Ollama
   */
  public async listModels(): Promise<ModelInfo[]> {
    try {
      const ollamaModels = (await this.client.listModels()) as unknown as OllamaModelInfo[];

      return ollamaModels.map((model) => ({
        provider: this.type,
        id: model.name,
        name: model.name,
        size: model.size,
        parameters: model.details.parameter_size,
        modifiedAt: model.modified_at,
        metadata: {
          digest: model.digest,
          format: model.details.format,
          family: model.details.family,
          quantization: model.details.quantization_level,
        },
      }));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Get information about a specific model
   */
  public async getModelInfo(modelId: string): Promise<ModelInfo> {
    try {
      const ollamaModel = (await this.client.getModelInfo(
        modelId
      )) as unknown as OllamaModelInfo | null;

      if (!ollamaModel) {
        throw new ProviderModelNotFoundError(this.type, modelId);
      }

      return {
        provider: this.type,
        id: ollamaModel.name,
        name: ollamaModel.name,
        size: ollamaModel.size,
        parameters: ollamaModel.details.parameter_size,
        modifiedAt: ollamaModel.modified_at,
        metadata: {
          digest: ollamaModel.digest,
          format: ollamaModel.details.format,
          family: ollamaModel.details.family,
          quantization: ollamaModel.details.quantization_level,
        },
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Pull/download a model from Ollama
   */
  public async pullModel(modelId: string, onProgress?: (progress: number) => void): Promise<void> {
    try {
      // OllamaClient already provides progress as percentage number
      await this.client.pullModel(modelId, onProgress);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Map Ollama-specific errors to provider-agnostic errors
   */
  private mapError(error: unknown): AIProviderError {
    if (error instanceof OllamaConnectionError) {
      return new ProviderConnectionError(this.type, error.message, error.cause);
    }

    if (error instanceof OllamaTimeoutError) {
      return new ProviderTimeoutError(this.type, error.timeoutMs, error.cause);
    }

    if (error instanceof OllamaModelNotFoundError) {
      return new ProviderModelNotFoundError(this.type, error.modelName);
    }

    if (error instanceof OllamaAPIError) {
      return new ProviderAPIError(
        this.type,
        error.statusCode,
        error.statusText,
        error.responseBody,
        error.cause
      );
    }

    if (error instanceof OllamaInvalidResponseError) {
      return new ProviderInvalidResponseError(this.type, error.message, error.cause);
    }

    if (error instanceof OllamaError) {
      return new AIProviderError(this.type, error.message, error.cause);
    }

    // Unknown error
    if (error instanceof Error) {
      return new AIProviderError(this.type, error.message, error);
    }

    return new AIProviderError(this.type, 'Unknown error occurred');
  }
}

/**
 * Factory function for creating Ollama provider instances
 */
export function createOllamaProvider(config: AIProviderConfig): OllamaProvider {
  return new OllamaProvider(config);
}
