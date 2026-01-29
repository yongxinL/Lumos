/**
 * AI Provider Registry
 *
 * Manages registration and creation of AI providers.
 * Enables dynamic provider selection and multi-provider support.
 *
 * Design Decisions:
 * - Singleton pattern for global registry access
 * - Factory pattern for provider instantiation
 * - Type-safe provider registration and retrieval
 * - Support for multiple instances of same provider type
 */

import type { AIProviderType, AIProviderConfig, AIProviderCapabilities } from '@/types';
import type { IAIProvider, ProviderFactory, ProviderRegistration } from './types';
import { ProviderConfigurationError } from './errors';
import { createOllamaProvider } from './ollama';

/**
 * AI Provider Registry
 *
 * Singleton registry for managing AI provider types and instances.
 */
export class AIProviderRegistry {
  private static instance: AIProviderRegistry | null = null;

  private registrations: Map<AIProviderType, ProviderRegistration> = new Map();
  private providers: Map<string, IAIProvider> = new Map();

  private constructor() {
    // Register built-in providers
    this.registerProviderType('ollama', 'Ollama', createOllamaProvider, {
      streaming: true,
      constrainedDecoding: true,
      functionCalling: false,
      conversationContext: true,
      vision: true,
      maxContextTokens: 128000,
      modelManagement: true,
    });
  }

  /**
   * Get singleton instance of registry
   */
  public static getInstance(): AIProviderRegistry {
    if (!AIProviderRegistry.instance) {
      AIProviderRegistry.instance = new AIProviderRegistry();
    }
    return AIProviderRegistry.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    AIProviderRegistry.instance = null;
  }

  /**
   * Register a new provider type
   * @param type - Provider type identifier
   * @param name - Provider display name
   * @param factory - Factory function to create provider instances
   * @param defaultCapabilities - Default capabilities for this provider type
   */
  public registerProviderType(
    type: AIProviderType,
    name: string,
    factory: ProviderFactory,
    defaultCapabilities: AIProviderCapabilities
  ): void {
    this.registrations.set(type, {
      type,
      name,
      factory,
      defaultCapabilities,
    });
  }

  /**
   * Check if a provider type is registered
   * @param type - Provider type identifier
   * @returns true if registered
   */
  public isProviderTypeRegistered(type: AIProviderType): boolean {
    return this.registrations.has(type);
  }

  /**
   * Get registered provider types
   * @returns Array of registered provider types
   */
  public getRegisteredTypes(): AIProviderType[] {
    return Array.from(this.registrations.keys());
  }

  /**
   * Get provider registration details
   * @param type - Provider type identifier
   * @returns Provider registration or undefined if not found
   */
  public getRegistration(type: AIProviderType): ProviderRegistration | undefined {
    return this.registrations.get(type);
  }

  /**
   * Create and register a provider instance
   * @param id - Unique identifier for this provider instance
   * @param config - Provider configuration
   * @returns Created provider instance
   * @throws ProviderConfigurationError if provider type not registered
   */
  public createProvider(id: string, config: AIProviderConfig): IAIProvider {
    const registration = this.registrations.get(config.type);

    if (!registration) {
      throw new ProviderConfigurationError(
        config.type,
        `Provider type '${config.type}' is not registered`
      );
    }

    // Create provider instance using factory
    const provider = registration.factory(config);

    // Store provider instance
    this.providers.set(id, provider);

    return provider;
  }

  /**
   * Get a provider instance by ID
   * @param id - Provider instance identifier
   * @returns Provider instance or undefined if not found
   */
  public getProvider(id: string): IAIProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Check if a provider instance exists
   * @param id - Provider instance identifier
   * @returns true if provider exists
   */
  public hasProvider(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Remove a provider instance
   * @param id - Provider instance identifier
   * @returns true if provider was removed
   */
  public removeProvider(id: string): boolean {
    return this.providers.delete(id);
  }

  /**
   * Get all registered provider instances
   * @returns Array of provider IDs and instances
   */
  public getAllProviders(): Array<{ id: string; provider: IAIProvider }> {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      provider,
    }));
  }

  /**
   * Clear all provider instances (useful for testing)
   */
  public clearProviders(): void {
    this.providers.clear();
  }

  /**
   * Get or create a provider instance
   * If provider exists, return it. Otherwise, create and register it.
   * @param id - Unique identifier for provider instance
   * @param config - Provider configuration (used if creating new)
   * @returns Provider instance
   */
  public getOrCreateProvider(id: string, config: AIProviderConfig): IAIProvider {
    const existing = this.getProvider(id);
    if (existing) {
      return existing;
    }

    return this.createProvider(id, config);
  }
}

/**
 * Get singleton instance of provider registry
 */
export function getProviderRegistry(): AIProviderRegistry {
  return AIProviderRegistry.getInstance();
}

/**
 * Reset provider registry (for testing)
 */
export function resetProviderRegistry(): void {
  AIProviderRegistry.resetInstance();
}

/**
 * Helper function to create a default Ollama provider
 * @param baseUrl - Ollama server URL (default: http://localhost:11434)
 * @param name - Provider name (default: 'Ollama')
 * @returns Provider instance
 */
export function createDefaultOllamaProvider(
  baseUrl: string = 'http://localhost:11434',
  name: string = 'Ollama'
): IAIProvider {
  const registry = getProviderRegistry();

  const config: AIProviderConfig = {
    type: 'ollama',
    name,
    config: { baseUrl },
    timeout: 120000,
    maxRetries: 3,
    retryDelay: 1000,
  };

  // Use 'default-ollama' as the ID for the default instance
  return registry.getOrCreateProvider('default-ollama', config);
}
