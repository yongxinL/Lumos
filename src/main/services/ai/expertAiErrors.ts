/**
 * Expert AI Service Error Classes
 *
 * Custom error hierarchy for Expert AI operations.
 * Provides specific error types for different failure scenarios.
 */

/**
 * Base error class for Expert AI operations
 */
export class ExpertAIError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);

    // Preserve original stack trace
    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Error thrown when no AI provider is available
 */
export class NoProviderAvailableError extends ExpertAIError {
  constructor(message: string = 'No AI provider available') {
    super(message);
  }
}

/**
 * Error thrown when requested provider is not found
 */
export class ProviderNotFoundError extends ExpertAIError {
  constructor(
    public readonly providerName: string,
    message?: string
  ) {
    super(message || `Provider '${providerName}' not found`);
  }
}

/**
 * Error thrown when provider is not healthy
 */
export class ProviderUnhealthyError extends ExpertAIError {
  constructor(
    public readonly providerName: string,
    message?: string
  ) {
    super(message || `Provider '${providerName}' is not healthy`);
  }
}

/**
 * Error thrown when conversation is not found
 */
export class ConversationNotFoundError extends ExpertAIError {
  constructor(
    public readonly conversationId: string,
    message?: string
  ) {
    super(message || `Conversation '${conversationId}' not found`);
  }
}

/**
 * Error thrown when context size exceeds limits
 */
export class ContextSizeExceededError extends ExpertAIError {
  constructor(
    public readonly currentSize: number,
    public readonly maxSize: number,
    message?: string
  ) {
    super(message || `Context size ${currentSize} exceeds maximum ${maxSize} tokens`);
  }
}

/**
 * Error thrown when generation fails
 */
export class GenerationError extends ExpertAIError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

/**
 * Error thrown when parsing AI response fails
 */
export class ParsingError extends ExpertAIError {
  constructor(
    message: string,
    public readonly rawContent: string,
    cause?: Error
  ) {
    super(message, cause);
  }
}
