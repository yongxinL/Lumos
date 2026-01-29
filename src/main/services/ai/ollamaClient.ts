/**
 * Ollama Client Service
 *
 * HTTP client for communicating with local Ollama server.
 * Provides text generation (streaming and non-streaming), model management,
 * health checks, and retry logic with exponential backoff.
 *
 * Design Decisions:
 * - Extends EventEmitter for progress events (pull:progress, generate:chunk)
 * - Singleton pattern via getOllamaClient() factory function
 * - No external HTTP dependencies (uses Node.js 22 built-in fetch)
 * - Custom error classes for user-friendly error handling
 * - Retry logic with exponential backoff for transient failures
 * - NDJSON streaming support for real-time response chunks
 */

import { EventEmitter } from 'events';
import type {
  OllamaConfig,
  GenerateRequest,
  GenerateResponse,
  GenerateStreamChunk,
  ModelInfo,
  ListModelsResponse,
  PullProgress,
} from '@/types';
import {
  OllamaError,
  OllamaConnectionError,
  OllamaTimeoutError,
  OllamaModelNotFoundError,
  OllamaAPIError,
  OllamaInvalidResponseError,
} from './ollamaErrors';

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  timeout: 120000, // 120 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second, exponential backoff
};

/**
 * Ollama client for local LLM inference
 */
export class OllamaClient extends EventEmitter {
  private config: OllamaConfig;

  constructor(config?: Partial<OllamaConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate text completion (non-streaming)
   * @param request - Generation request with model, prompt, etc.
   * @returns Complete generated text
   * @throws OllamaError on failure
   */
  public async generate(request: GenerateRequest): Promise<string> {
    const url = `${this.config.baseUrl}/api/generate`;

    try {
      const response = await this.fetchWithRetry<GenerateResponse>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: false }),
      });

      if (!response.response) {
        throw new OllamaInvalidResponseError('Missing response field in API response');
      }

      return response.response;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Generate text completion with streaming chunks
   * @param request - Generation request with model, prompt, etc.
   * @param onChunk - Callback invoked for each text chunk
   * @returns Complete generated text (concatenated chunks)
   * @throws OllamaError on failure
   */
  public async generateStream(
    request: GenerateRequest,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const url = `${this.config.baseUrl}/api/generate`;

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new OllamaAPIError(response.status, response.statusText, body);
      }

      if (!response.body) {
        throw new OllamaInvalidResponseError('No response body from server');
      }

      // Parse NDJSON stream
      return await this.parseStreamingResponse(response, onChunk);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * List all installed models
   * @returns Array of installed models with metadata
   * @throws OllamaError on failure
   */
  public async listModels(): Promise<ModelInfo[]> {
    const url = `${this.config.baseUrl}/api/tags`;

    try {
      const response = await this.fetchWithRetry<ListModelsResponse>(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      return response.models || [];
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Get information about a specific model
   * @param model - Model name (e.g., "llama3.2:latest")
   * @returns Model information or null if not found
   * @throws OllamaError on failure (other than model not found)
   */
  public async getModelInfo(model: string): Promise<ModelInfo | null> {
    const url = `${this.config.baseUrl}/api/show`;

    try {
      const response = await this.fetchWithRetry<ModelInfo>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model }),
      });

      return response;
    } catch (error) {
      // Model not found is expected error case, return null
      if (error instanceof OllamaModelNotFoundError) {
        return null;
      }
      throw this.mapError(error);
    }
  }

  /**
   * Pull (download) a model from Ollama registry
   * Emits 'pull:progress' events during download
   * @param model - Model name (e.g., "llama3.2")
   * @param onProgress - Optional callback for progress updates (0-100)
   * @throws OllamaError on failure
   */
  public async pullModel(model: string, onProgress?: (progress: number) => void): Promise<void> {
    const url = `${this.config.baseUrl}/api/pull`;

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new OllamaAPIError(response.status, response.statusText, body);
      }

      if (!response.body) {
        throw new OllamaInvalidResponseError('No response body from server');
      }

      // Parse pull progress NDJSON
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let totalSize = 0;
      let completedSize = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              const progress = JSON.parse(line) as PullProgress;

              // Track progress
              if (progress.total) {
                totalSize = progress.total;
              }
              if (progress.completed) {
                completedSize = progress.completed;
              }

              // Emit progress event and callback
              const progressPercent =
                totalSize > 0 ? Math.round((completedSize / totalSize) * 100) : 0;

              this.emit('pull:progress', { ...progress, percentage: progressPercent });

              if (onProgress) {
                onProgress(progressPercent);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Check if Ollama server is healthy and accessible
   * @returns true if server is healthy, false otherwise
   */
  public async checkHealth(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/`, {
        method: 'GET',
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get current configuration
   * @returns Current client configuration (read-only copy)
   */
  public getConfig(): Readonly<OllamaConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime
   * @param config - Partial config to merge with existing
   */
  public updateConfig(config: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // =====================================================================
  // Private methods
  // =====================================================================

  /**
   * Fetch with automatic timeout handling
   * Uses AbortController to enforce timeout threshold
   * @param url - Target URL
   * @param options - Fetch options
   * @returns Response object
   * @throws OllamaTimeoutError on timeout
   */
  private async fetchWithTimeout(
    url: string,
    // Fetch options (RequestInit type not available in this context)

    options: any
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OllamaTimeoutError(this.config.timeout);
      }

      // Network error
      if (error instanceof TypeError) {
        throw new OllamaConnectionError('Network request failed', error);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch with automatic retry and exponential backoff
   * Retries on 5xx errors and timeouts, not on 4xx errors
   * @param url - Target URL
   * @param options - Fetch options
   * @param attempt - Current attempt number (0-based)
   * @returns Parsed JSON response
   * @throws OllamaError on failure
   */
  private async fetchWithRetry<T>(
    url: string,

    options: any,
    attempt: number = 0
  ): Promise<T> {
    try {
      const response = await this.fetchWithTimeout(url, options);

      // Check for retryable errors (5xx, 429)
      if ((response.status >= 500 || response.status === 429) && attempt < this.config.maxRetries) {
        const delay = this.calculateBackoff(attempt);
        console.warn(
          `Ollama request failed with status ${response.status}, retrying in ${delay}ms...`
        );
        await this.sleep(delay);
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      // Handle non-retryable errors
      if (!response.ok) {
        const body = await response.text();
        throw new OllamaAPIError(response.status, response.statusText, body);
      }

      return (await response.json()) as T;
    } catch (error) {
      // Retry on connection errors and timeouts
      if (attempt < this.config.maxRetries && this.isRetryableError(error)) {
        const delay = this.calculateBackoff(attempt);
        console.warn(`Ollama request failed, retrying in ${delay}ms...`, error);
        await this.sleep(delay);
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay
   * Delay = retryDelay * 2^attempt
   * @param attempt - Attempt number (0-based)
   * @returns Delay in milliseconds
   */
  private calculateBackoff(attempt: number): number {
    return this.config.retryDelay * Math.pow(2, attempt);
  }

  /**
   * Check if error is retryable
   * Retryable: timeouts, connection errors
   * Non-retryable: API errors (4xx), invalid responses
   * @param error - Error to check
   * @returns true if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    return (
      error instanceof OllamaTimeoutError ||
      error instanceof OllamaConnectionError ||
      (error instanceof TypeError && error.message.includes('Failed to fetch'))
    );
  }

  /**
   * Parse streaming NDJSON response
   * Each line is a separate JSON object (GenerateStreamChunk)
   * @param response - Response object with body ReadableStream
   * @param onChunk - Callback for each chunk
   * @returns Full concatenated response
   * @throws OllamaInvalidResponseError on parse error
   */
  private async parseStreamingResponse(
    response: Response,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines (NDJSON format)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line) as GenerateStreamChunk;

              // Emit chunk text via callback
              if (chunk.response) {
                onChunk(chunk.response);
                fullResponse += chunk.response;
              }

              // Emit progress event
              this.emit('generate:chunk', chunk);

              // Stop when generation is complete
              if (chunk.done) {
                return fullResponse;
              }
            } catch (error) {
              throw new OllamaInvalidResponseError(
                `Failed to parse JSON chunk: ${line}`,
                error as Error
              );
            }
          }
        }
      }

      // Handle final incomplete line
      if (buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer) as GenerateStreamChunk;
          if (chunk.response) {
            onChunk(chunk.response);
            fullResponse += chunk.response;
          }
          this.emit('generate:chunk', chunk);
        } catch (error) {
          throw new OllamaInvalidResponseError(
            `Failed to parse final JSON chunk: ${buffer}`,
            error as Error
          );
        }
      }

      return fullResponse;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Map various errors to specific OllamaError subclasses
   * @param error - Error to map
   * @returns Appropriate OllamaError subclass
   */
  private mapError(error: unknown): OllamaError {
    // Already an Ollama error
    if (error instanceof OllamaError) {
      return error;
    }

    // Timeout error
    if (error instanceof OllamaTimeoutError) {
      return error;
    }

    // Connection error
    if (error instanceof OllamaConnectionError) {
      return error;
    }

    // API error
    if (error instanceof OllamaAPIError) {
      if (error.statusCode === 404) {
        // Extract model name from error if possible
        const modelMatch = error.responseBody?.match(/'([^']+)'/);
        const modelName = modelMatch?.[1] || 'unknown';
        return new OllamaModelNotFoundError(modelName);
      }
      return error;
    }

    // Network/fetch error
    if (error instanceof TypeError) {
      return new OllamaConnectionError(error.message, error);
    }

    // Generic error
    if (error instanceof Error) {
      return new OllamaError(error.message, error);
    }

    // Unknown error
    return new OllamaError(String(error));
  }

  /**
   * Sleep for specified duration
   * @param ms - Duration in milliseconds
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

let ollamaClientInstance: OllamaClient | null = null;

/**
 * Get or create Ollama Client singleton
 * @param config - Optional configuration for client
 * @returns Ollama client instance
 */
export function getOllamaClient(config?: Partial<OllamaConfig>): OllamaClient {
  if (!ollamaClientInstance) {
    ollamaClientInstance = new OllamaClient(config);
  }
  return ollamaClientInstance;
}

/**
 * Reset singleton instance (primarily for testing)
 */
export function resetOllamaClient(): void {
  ollamaClientInstance = null;
}
