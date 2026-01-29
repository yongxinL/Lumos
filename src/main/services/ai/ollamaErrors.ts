/**
 * Ollama Error Classes
 *
 * Custom error hierarchy for Ollama client service.
 * Provides typed, user-friendly error messages with cause chaining.
 *
 * Design Decisions:
 * - Base class with cause chaining for debugging
 * - Specific subclasses for different failure modes
 * - User-friendly messages that don't expose internal details
 * - Stack trace preservation for error tracking
 * - Use class instances for type identity (avoid name property conflicts)
 */

/**
 * Base error class for all Ollama-related errors
 * Supports cause chaining for error context
 */
export class OllamaError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Chain the stack trace if cause exists
    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Error thrown when unable to connect to Ollama server
 * Indicates network issues or Ollama not running
 */
export class OllamaConnectionError extends OllamaError {
  constructor(message: string, cause?: Error) {
    super(`Failed to connect to Ollama: ${message}`, cause);
  }
}

/**
 * Error thrown when request exceeds timeout threshold
 */
export class OllamaTimeoutError extends OllamaError {
  constructor(
    public readonly timeoutMs: number,
    cause?: Error
  ) {
    super(`Request timed out after ${timeoutMs}ms`, cause);
  }
}

/**
 * Error thrown when requested model is not found/installed
 * Suggests using pullModel() to download the model
 */
export class OllamaModelNotFoundError extends OllamaError {
  constructor(public readonly modelName: string) {
    super(`Model '${modelName}' not found. Use pullModel() to download it.`);
  }
}

/**
 * Error thrown when Ollama API returns error status code (4xx, 5xx)
 */
export class OllamaAPIError extends OllamaError {
  constructor(
    public readonly statusCode: number,
    public readonly statusText: string,
    public readonly responseBody?: string,
    cause?: Error
  ) {
    const message = `Ollama API error (${statusCode}): ${statusText}`;
    super(message, cause);
  }
}

/**
 * Error thrown when response from Ollama is invalid or unparseable
 * Indicates protocol mismatch or server returning unexpected format
 */
export class OllamaInvalidResponseError extends OllamaError {
  constructor(message: string, cause?: Error) {
    super(`Invalid response from Ollama: ${message}`, cause);
  }
}
