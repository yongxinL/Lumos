/**
 * AI Providers Module
 *
 * Barrel exports for AI provider abstraction layer.
 * Provides unified interface for multiple AI providers (Ollama, OpenAI, Anthropic).
 */

// Types and interfaces
export type { IAIProvider, ProviderFactory, ProviderRegistration } from './types';

// Error classes
export {
  AIProviderError,
  ProviderConnectionError,
  ProviderTimeoutError,
  ProviderModelNotFoundError,
  ProviderAPIError,
  ProviderInvalidResponseError,
  ProviderUnsupportedFeatureError,
  ProviderConfigurationError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
} from './errors';

// Provider implementations
export { OllamaProvider, createOllamaProvider, OLLAMA_CAPABILITIES } from './ollama';

// Registry
export {
  AIProviderRegistry,
  getProviderRegistry,
  resetProviderRegistry,
  createDefaultOllamaProvider,
} from './registry';
