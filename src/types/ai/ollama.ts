/**
 * Ollama AI Service Types
 *
 * Type definitions for Ollama HTTP client service.
 * Includes configuration, request/response types, and model management interfaces.
 *
 * Design Decisions:
 * - Separate config from request types for flexibility
 * - Use interfaces for all object shapes (extensible)
 * - Optional fields for Ollama parameters (forward-compatible)
 * - ModelOptions as separate interface for reuse
 */

/**
 * Ollama client configuration
 */
export interface OllamaConfig {
  /**
   * Base URL for Ollama server (default: http://localhost:11434)
   */
  baseUrl: string;

  /**
   * Request timeout in milliseconds (default: 120000 = 120 seconds)
   */
  timeout: number;

  /**
   * Maximum number of retries for transient failures (default: 3)
   */
  maxRetries: number;

  /**
   * Initial retry delay in milliseconds for exponential backoff (default: 1000)
   * Actual delay: retryDelay * 2^attempt
   */
  retryDelay: number;
}

/**
 * Text generation request parameters
 */
export interface GenerateRequest {
  /**
   * Model name (e.g., "llama3.2", "qwen3-vl-4b")
   */
  model: string;

  /**
   * Prompt text to generate from
   */
  prompt: string;

  /**
   * Optional system prompt
   */
  system?: string;

  /**
   * Optional template for model
   */
  template?: string;

  /**
   * Context from previous generation (for conversation history)
   */
  context?: number[];

  /**
   * Enable streaming response (default: false)
   */
  stream?: boolean;

  /**
   * Raw mode (don't format) (default: false)
   */
  raw?: boolean;

  /**
   * Output format: 'json' for JSON output, or JSON Schema string for constrained decoding
   */
  format?: 'json' | string;

  /**
   * Generation options (temperature, top_k, top_p, etc.)
   */
  options?: ModelOptions;
}

/**
 * Generation model options
 */
export interface ModelOptions {
  /**
   * Temperature (0.0 = deterministic, 1.0 = creative) (default: 0.7)
   */
  temperature?: number;

  /**
   * Top-k sampling (higher = more diverse) (default: 40)
   */
  top_k?: number;

  /**
   * Top-p sampling (nucleus sampling) (default: 0.9)
   */
  top_p?: number;

  /**
   * Number of tokens to predict (default: 128)
   */
  num_predict?: number;

  /**
   * Stop sequences (generation stops when any is encountered)
   */
  stop?: string[];

  /**
   * Repeat penalty to discourage repetition (default: 1.1)
   */
  repeat_penalty?: number;

  /**
   * Presence penalty (default: 0.0)
   */
  presence_penalty?: number;

  /**
   * Frequency penalty (default: 0.0)
   */
  frequency_penalty?: number;
}

/**
 * Text generation response (non-streaming)
 */
export interface GenerateResponse {
  /**
   * Model name that was used
   */
  model: string;

  /**
   * Generation timestamp (ISO8601)
   */
  created_at: string;

  /**
   * Generated text response
   */
  response: string;

  /**
   * Whether generation is complete
   */
  done: boolean;

  /**
   * Context for use in next generation (for conversation)
   */
  context?: number[];

  /**
   * Total duration in nanoseconds
   */
  total_duration?: number;

  /**
   * Time to load model in nanoseconds
   */
  load_duration?: number;

  /**
   * Number of tokens in prompt
   */
  prompt_eval_count?: number;

  /**
   * Time to evaluate prompt in nanoseconds
   */
  prompt_eval_duration?: number;

  /**
   * Number of tokens generated
   */
  eval_count?: number;

  /**
   * Time to generate tokens in nanoseconds
   */
  eval_duration?: number;
}

/**
 * Streaming response chunk (NDJSON format)
 */
export interface GenerateStreamChunk {
  /**
   * Model name
   */
  model: string;

  /**
   * Timestamp of chunk (ISO8601)
   */
  created_at: string;

  /**
   * Text chunk (partial response)
   */
  response: string;

  /**
   * Whether this is the final chunk
   */
  done: boolean;

  /**
   * Context (only in final chunk)
   */
  context?: number[];

  /**
   * Timing info (only in final chunk)
   */
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Information about an installed model
 */
export interface ModelInfo {
  /**
   * Model name (e.g., "llama3.2:latest")
   */
  name: string;

  /**
   * Last modified timestamp (ISO8601)
   */
  modified_at: string;

  /**
   * Model size in bytes
   */
  size: number;

  /**
   * Model digest/hash
   */
  digest: string;

  /**
   * Model details
   */
  details: ModelDetails;
}

/**
 * Detailed model information
 */
export interface ModelDetails {
  /**
   * Model format (e.g., "gguf")
   */
  format: string;

  /**
   * Model family (e.g., "llama")
   */
  family: string;

  /**
   * Alternative family names
   */
  families?: string[];

  /**
   * Model parameter size (e.g., "7B", "13B")
   */
  parameter_size: string;

  /**
   * Quantization level (e.g., "Q4_0", "Q5_K_M")
   */
  quantization_level: string;
}

/**
 * Response from list models endpoint
 */
export interface ListModelsResponse {
  /**
   * Array of installed models
   */
  models: ModelInfo[];
}

/**
 * Model pull progress information
 */
export interface PullProgress {
  /**
   * Status message (e.g., "downloading", "verifying")
   */
  status: string;

  /**
   * Model digest/hash
   */
  digest?: string;

  /**
   * Total bytes to download
   */
  total?: number;

  /**
   * Bytes downloaded so far
   */
  completed?: number;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  /**
   * Health status: 'ok' or 'error'
   */
  status: 'ok' | 'error';

  /**
   * Optional error message
   */
  message?: string;
}
