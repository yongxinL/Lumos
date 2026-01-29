/**
 * AI Provider Interface
 *
 * Abstract interface for AI providers (Ollama, OpenAI, Anthropic).
 * Defines common operations that all providers must implement.
 *
 * Design Decisions:
 * - Provider-agnostic interface for text generation and streaming
 * - Unified API across local (Ollama) and cloud (OpenAI, Anthropic) providers
 * - Capabilities descriptor to indicate what each provider supports
 * - Health check and availability detection
 * - Model management abstraction (where supported)
 */

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

/**
 * AI Provider Interface
 *
 * All AI providers must implement this interface to ensure consistent API.
 */
export interface IAIProvider {
  /**
   * Provider type identifier
   */
  readonly type: AIProviderType;

  /**
   * Provider display name
   */
  readonly name: string;

  /**
   * Provider capabilities
   */
  readonly capabilities: AIProviderCapabilities;

  /**
   * Provider configuration
   */
  readonly config: AIProviderConfig;

  /**
   * Generate text completion (non-streaming)
   * @param options - Generation options
   * @returns Generated text and metadata
   * @throws AIProviderError on failure
   */
  generate(options: GenerateOptions): Promise<GenerateResponse>;

  /**
   * Generate text completion with streaming chunks
   * @param options - Generation options
   * @param onChunk - Callback invoked for each text chunk
   * @returns Complete generated text and metadata
   * @throws AIProviderError on failure
   */
  generateStream(
    options: GenerateOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<GenerateResponse>;

  /**
   * Check if provider is available and healthy
   * @returns Health check result
   */
  checkHealth(): Promise<ProviderHealthCheck>;

  /**
   * Check if provider is currently available
   * @returns true if provider is reachable
   */
  isAvailable(): Promise<boolean>;

  /**
   * List available models (if supported)
   * @returns Array of model information
   * @throws ProviderUnsupportedFeatureError if not supported
   */
  listModels(): Promise<ModelInfo[]>;

  /**
   * Get information about a specific model (if supported)
   * @param modelId - Model identifier
   * @returns Model information
   * @throws ProviderModelNotFoundError if model not found
   * @throws ProviderUnsupportedFeatureError if not supported
   */
  getModelInfo(modelId: string): Promise<ModelInfo>;

  /**
   * Pull/download a model (if supported, e.g., Ollama)
   * @param modelId - Model identifier
   * @param onProgress - Optional progress callback
   * @throws ProviderUnsupportedFeatureError if not supported
   */
  pullModel(modelId: string, onProgress?: (progress: number) => void): Promise<void>;
}

/**
 * Provider factory function signature
 * Used by provider registry to instantiate providers
 */
export type ProviderFactory = (config: AIProviderConfig) => IAIProvider;

/**
 * Provider registration entry
 */
export interface ProviderRegistration {
  /**
   * Provider type
   */
  type: AIProviderType;

  /**
   * Provider display name
   */
  name: string;

  /**
   * Factory function to create provider instance
   */
  factory: ProviderFactory;

  /**
   * Default capabilities for this provider type
   */
  defaultCapabilities: AIProviderCapabilities;
}
