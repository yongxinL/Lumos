# L034: Provider Abstraction Design Pattern

**Category:** Architecture / Interface Design
**Confidence:** 0.95 (Well-established pattern)
**Session:** T-3.2.1 (AI Provider Interface)
**Date:** 2026-01-30

## Discovery

Creating a provider abstraction for multiple backends requires careful interface design balancing commonality with provider-specific features. Use **capabilities descriptor** + **common interface** + **provider-specific escape hatch** pattern.

## The Pattern

```typescript
// 1. Capabilities Descriptor
interface AIProviderCapabilities {
  streaming: boolean;
  constrainedDecoding: boolean;
  functionCalling: boolean;
  conversationContext: boolean;
  vision: boolean;
  maxContextTokens: number;
  modelManagement: boolean;
}

// 2. Common Interface
interface GenerateOptions {
  // Common across all providers
  model: string;
  prompt: string;
  temperature?: number;

  // Provider-specific passthrough
  providerOptions?: Record<string, unknown>;
}

// 3. Provider Interface
interface IAIProvider {
  readonly type: AIProviderType;
  readonly capabilities: AIProviderCapabilities;

  generate(options: GenerateOptions): Promise<GenerateResponse>;
  // ... other common methods
}

// 4. Error Hierarchy
class AIProviderError extends Error {
  constructor(
    public readonly provider: AIProviderType,
    message: string,
    cause?: Error
  ) {
    super(message);
  }
}
```

## Key Design Decisions

**1. Capabilities Over Feature Detection:**

```typescript
if (provider.capabilities.streaming) {
  await provider.generateStream(...);
} else {
  await provider.generate(...);
}
```

**2. Common + Escape Hatch:**

```typescript
await provider.generate({
  model: 'gpt-4',
  temperature: 0.7,
  providerOptions: {
    // OpenAI-specific
    response_format: { type: 'json_object' },
  },
});
```

**3. Provider Identification in Responses:**

```typescript
const response = await provider.generate(...);
console.log(response.provider);  // 'ollama' | 'openai' | 'anthropic'
```

## See Also

- [L035: Registry Pattern for Dynamic Provider Management](registry-provider-management.md)
- Implementation: `src/main/services/ai/providers/`
