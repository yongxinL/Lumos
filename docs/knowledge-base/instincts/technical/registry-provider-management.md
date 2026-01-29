# L035: Registry Pattern for Dynamic Provider Management

**Category:** Architecture / Design Pattern
**Confidence:** 0.95 (Standard pattern)
**Session:** T-3.2.1 (AI Provider Interface)
**Date:** 2026-01-30

## Discovery

A registry pattern with factory functions provides flexible provider management while maintaining type safety and singleton benefits. Ideal for plugin-like architectures.

## The Pattern

```typescript
class AIProviderRegistry {
  private static instance: AIProviderRegistry | null = null;
  private registrations: Map<AIProviderType, ProviderRegistration>;
  private providers: Map<string, IAIProvider>;

  // Singleton
  static getInstance(): AIProviderRegistry;

  // Type registration (at startup)
  registerProviderType(
    type: AIProviderType,
    name: string,
    factory: ProviderFactory,
    capabilities: AIProviderCapabilities
  ): void;

  // Instance management (at runtime)
  createProvider(id: string, config: AIProviderConfig): IAIProvider;
  getProvider(id: string): IAIProvider | undefined;
  getOrCreateProvider(id: string, config: AIProviderConfig): IAIProvider;

  // Discovery
  getRegisteredTypes(): AIProviderType[];
  getAllProviders(): Array<{ id: string; provider: IAIProvider }>;
}
```

## Benefits

1. **Extensibility**: New providers registered at runtime
2. **Multiple Instances**: Same type, different configs
3. **Centralized Management**: One place for provider access
4. **Type Safety**: Factory functions ensure correct types
5. **Discovery**: List available types and instances

## Usage

```typescript
const registry = getProviderRegistry();

// Register provider type (startup)
registry.registerProviderType('ollama', 'Ollama', createOllamaProvider, OLLAMA_CAPABILITIES);

// Create instances (runtime)
const local = registry.createProvider('local-ollama', {
  type: 'ollama',
  name: 'Local Ollama',
  config: { baseUrl: 'http://localhost:11434' },
});

const remote = registry.createProvider('remote-ollama', {
  type: 'ollama',
  name: 'Remote Ollama',
  config: { baseUrl: 'https://ai.example.com' },
});
```

## See Also

- [L034: Provider Abstraction Design Pattern](provider-abstraction-design.md)
- Implementation: `src/main/services/ai/providers/registry.ts`
