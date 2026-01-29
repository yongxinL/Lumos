/**
 * AI Provider Types
 *
 * Common types for AI provider abstraction layer.
 * Enables multiple AI providers (Ollama, OpenAI, Anthropic) with unified API.
 *
 * Design Decisions:
 * - Provider-agnostic types that work across all implementations
 * - Capabilities interface to describe what each provider supports
 * - Common response formats with optional provider-specific metadata
 * - Extensible via provider-specific options
 */

/**
 * Supported AI provider types
 */
export type AIProviderType = 'ollama' | 'openai' | 'anthropic';

/**
 * Common provider configuration
 */
export interface AIProviderConfig {
  /**
   * Provider type identifier
   */
  type: AIProviderType;

  /**
   * Provider display name
   */
  name: string;

  /**
   * Provider-specific configuration
   */
  config: Record<string, unknown>;

  /**
   * Request timeout in milliseconds (default: 120000 = 120 seconds)
   */
  timeout?: number;

  /**
   * Maximum number of retries for transient failures (default: 3)
   */
  maxRetries?: number;

  /**
   * Initial retry delay in milliseconds for exponential backoff (default: 1000)
   */
  retryDelay?: number;
}

/**
 * Provider capabilities descriptor
 */
export interface AIProviderCapabilities {
  /**
   * Supports streaming responses
   */
  streaming: boolean;

  /**
   * Supports constrained JSON decoding (JSON Schema)
   */
  constrainedDecoding: boolean;

  /**
   * Supports function calling / tool use
   */
  functionCalling: boolean;

  /**
   * Supports conversation context/history
   */
  conversationContext: boolean;

  /**
   * Supports vision/image inputs
   */
  vision: boolean;

  /**
   * Maximum context window in tokens
   */
  maxContextTokens: number;

  /**
   * Supports model management (list, pull, delete)
   */
  modelManagement: boolean;
}

/**
 * Common generation options (provider-agnostic)
 */
export interface GenerateOptions {
  /**
   * Model name/identifier
   */
  model: string;

  /**
   * Prompt text to generate from
   */
  prompt: string;

  /**
   * Optional system prompt (instructions)
   */
  system?: string;

  /**
   * Temperature (0.0 = deterministic, 1.0 = creative) (default: 0.7)
   */
  temperature?: number;

  /**
   * Maximum tokens to generate (default: provider-specific)
   */
  maxTokens?: number;

  /**
   * Stop sequences (generation stops when any is encountered)
   */
  stopSequences?: string[];

  /**
   * Top-p sampling (nucleus sampling) (default: 0.9)
   */
  topP?: number;

  /**
   * Top-k sampling (higher = more diverse)
   */
  topK?: number;

  /**
   * Repeat penalty to discourage repetition (default: 1.1)
   */
  repeatPenalty?: number;

  /**
   * Presence penalty (default: 0.0)
   */
  presencePenalty?: number;

  /**
   * Frequency penalty (default: 0.0)
   */
  frequencyPenalty?: number;

  /**
   * Output format: 'json' for JSON output, or JSON Schema string for constrained decoding
   */
  format?: 'json' | string;

  /**
   * Context from previous generation (for conversation history)
   * Provider-specific format
   */
  context?: unknown;

  /**
   * Provider-specific options (passed through to underlying client)
   */
  providerOptions?: Record<string, unknown>;
}

/**
 * Common generation response (non-streaming)
 */
export interface GenerateResponse {
  /**
   * Provider type that generated this response
   */
  provider: AIProviderType;

  /**
   * Model name that was used
   */
  model: string;

  /**
   * Generated text response
   */
  text: string;

  /**
   * Generation timestamp (ISO8601)
   */
  timestamp: string;

  /**
   * Context for use in next generation (provider-specific format)
   */
  context?: unknown;

  /**
   * Usage statistics
   */
  usage?: {
    /**
     * Number of tokens in prompt
     */
    promptTokens?: number;

    /**
     * Number of tokens generated
     */
    completionTokens?: number;

    /**
     * Total tokens (prompt + completion)
     */
    totalTokens?: number;
  };

  /**
   * Timing information (in milliseconds)
   */
  timing?: {
    /**
     * Total duration
     */
    total?: number;

    /**
     * Time to load model
     */
    modelLoad?: number;

    /**
     * Time to evaluate prompt
     */
    promptEval?: number;

    /**
     * Time to generate tokens
     */
    completion?: number;
  };

  /**
   * Provider-specific metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Common streaming response chunk
 */
export interface StreamChunk {
  /**
   * Provider type
   */
  provider: AIProviderType;

  /**
   * Model name
   */
  model: string;

  /**
   * Text chunk (partial response)
   */
  text: string;

  /**
   * Whether this is the final chunk
   */
  done: boolean;

  /**
   * Timestamp of chunk (ISO8601)
   */
  timestamp: string;

  /**
   * Context (only in final chunk, provider-specific format)
   */
  context?: unknown;

  /**
   * Usage statistics (only in final chunk)
   */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };

  /**
   * Timing info (only in final chunk)
   */
  timing?: {
    total?: number;
    modelLoad?: number;
    promptEval?: number;
    completion?: number;
  };
}

/**
 * Model information (common across providers)
 */
export interface ModelInfo {
  /**
   * Provider type
   */
  provider: AIProviderType;

  /**
   * Model identifier
   */
  id: string;

  /**
   * Model display name
   */
  name: string;

  /**
   * Model description
   */
  description?: string;

  /**
   * Model size in bytes
   */
  size?: number;

  /**
   * Parameter count (e.g., "7B", "13B")
   */
  parameters?: string;

  /**
   * Last modified timestamp (ISO8601)
   */
  modifiedAt?: string;

  /**
   * Model capabilities
   */
  capabilities?: {
    vision?: boolean;
    functionCalling?: boolean;
    maxTokens?: number;
  };

  /**
   * Provider-specific metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Health check response
 */
export interface ProviderHealthCheck {
  /**
   * Provider type
   */
  provider: AIProviderType;

  /**
   * Health status
   */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /**
   * Check timestamp (ISO8601)
   */
  timestamp: string;

  /**
   * Optional status message
   */
  message?: string;

  /**
   * Response time in milliseconds
   */
  responseTime?: number;

  /**
   * Available models count
   */
  availableModels?: number;
}
