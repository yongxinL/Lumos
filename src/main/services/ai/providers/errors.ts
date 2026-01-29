/**
 * AI Provider Error Classes
 *
 * Common error hierarchy for all AI providers.
 * Provides typed, provider-agnostic error messages with cause chaining.
 *
 * Design Decisions:
 * - Base class with cause chaining for debugging
 * - Provider-agnostic error types (map from provider-specific errors)
 * - User-friendly messages that don't expose internal details
 * - Stack trace preservation for error tracking
 */

import type { AIProviderType } from '@/types';

/**
 * Base error class for all AI provider errors
 * Supports cause chaining and provider identification
 */
export class AIProviderError extends Error {
  constructor(
    public readonly provider: AIProviderType,
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
 * Error thrown when unable to connect to provider
 * Indicates network issues or provider not available
 */
export class ProviderConnectionError extends AIProviderError {
  constructor(provider: AIProviderType, message: string, cause?: Error) {
    super(provider, `Failed to connect to ${provider}: ${message}`, cause);
  }
}

/**
 * Error thrown when request exceeds timeout threshold
 */
export class ProviderTimeoutError extends AIProviderError {
  constructor(
    provider: AIProviderType,
    public readonly timeoutMs: number,
    cause?: Error
  ) {
    super(provider, `Request to ${provider} timed out after ${timeoutMs}ms`, cause);
  }
}

/**
 * Error thrown when requested model is not found/available
 */
export class ProviderModelNotFoundError extends AIProviderError {
  constructor(
    provider: AIProviderType,
    public readonly modelName: string
  ) {
    super(provider, `Model '${modelName}' not found on ${provider}`);
  }
}

/**
 * Error thrown when provider API returns error status code (4xx, 5xx)
 */
export class ProviderAPIError extends AIProviderError {
  constructor(
    provider: AIProviderType,
    public readonly statusCode: number,
    public readonly statusText: string,
    public readonly responseBody?: string,
    cause?: Error
  ) {
    const message = `${provider} API error (${statusCode}): ${statusText}`;
    super(provider, message, cause);
  }
}

/**
 * Error thrown when response from provider is invalid or unparseable
 * Indicates protocol mismatch or provider returning unexpected format
 */
export class ProviderInvalidResponseError extends AIProviderError {
  constructor(provider: AIProviderType, message: string, cause?: Error) {
    super(provider, `Invalid response from ${provider}: ${message}`, cause);
  }
}

/**
 * Error thrown when provider doesn't support a requested feature
 */
export class ProviderUnsupportedFeatureError extends AIProviderError {
  constructor(
    provider: AIProviderType,
    public readonly feature: string
  ) {
    super(provider, `${provider} does not support feature: ${feature}`);
  }
}

/**
 * Error thrown when provider configuration is invalid
 */
export class ProviderConfigurationError extends AIProviderError {
  constructor(provider: AIProviderType, message: string, cause?: Error) {
    super(provider, `Invalid configuration for ${provider}: ${message}`, cause);
  }
}

/**
 * Error thrown when provider authentication fails
 */
export class ProviderAuthenticationError extends AIProviderError {
  constructor(provider: AIProviderType, message: string, cause?: Error) {
    super(provider, `Authentication failed for ${provider}: ${message}`, cause);
  }
}

/**
 * Error thrown when provider rate limit is exceeded
 */
export class ProviderRateLimitError extends AIProviderError {
  constructor(
    provider: AIProviderType,
    public readonly retryAfter?: number,
    cause?: Error
  ) {
    const message = retryAfter
      ? `Rate limit exceeded for ${provider}. Retry after ${retryAfter}s`
      : `Rate limit exceeded for ${provider}`;
    super(provider, message, cause);
  }
}
