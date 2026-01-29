# L033: Simplified API Wrapping Pattern

**Category:** API Design / Wrapping Pattern
**Confidence:** 0.95 (Common API design tradeoff)
**Session:** T-3.2.1 (AI Provider Interface)
**Date:** 2026-01-30

## Discovery

When wrapping an existing API, **don't assume the wrapper's types match the original API's types**. APIs are often simplified internally - callbacks receive primitives instead of rich objects, methods return booleans instead of detailed responses.

## The Problem

```typescript
// Expected (from Ollama types):
interface OllamaClient {
  generateStream(
    request: GenerateRequest,
    onChunk: (chunk: GenerateStreamChunk) => void // Rich object
  ): Promise<string>;

  checkHealth(): Promise<HealthCheckResponse>; // Detailed response

  pullModel(
    model: string,
    onProgress: (progress: PullProgress) => void // Rich progress object
  ): Promise<void>;
}

// Actual implementation (simplified):
class OllamaClient {
  generateStream(
    request: GenerateRequest,
    onChunk: (chunk: string) => void // Just the text!
  ): Promise<string>;

  checkHealth(): Promise<boolean>; // Just true/false!

  pullModel(
    model: string,
    onProgress: (percent: number) => void // Just the percentage!
  ): Promise<void>;
}
```

## Why APIs Are Simplified

**Reasons for simplification:**

1. **Ease of use** - Simpler callbacks are easier for consumers
2. **Performance** - Less object creation overhead
3. **Encapsulation** - Hide internal complexity
4. **Backwards compatibility** - Easier to maintain stable API

**Trade-offs:**

- ✅ Simpler consumer code
- ✅ Better performance
- ❌ Harder to wrap with rich interfaces
- ❌ Less metadata available

## The Solution

**Always check the actual implementation, not just type definitions:**

```typescript
// Step 1: Read the implementation code
// src/main/services/ai/ollamaClient.ts

async generateStream(
  request: GenerateRequest,
  onChunk: (chunk: string) => void  // ← Actual signature
): Promise<string> {
  // Implementation parses NDJSON and extracts just the text
  for (const line of lines) {
    const parsed = JSON.parse(line);
    onChunk(parsed.response);  // Only passes the text string
  }
}
```

**Step 2: Wrapper layer enriches the simplified API:**

```typescript
class OllamaProvider implements IAIProvider {
  async generateStream(
    options: GenerateOptions,
    onChunk: (chunk: StreamChunk) => void // Rich interface
  ): Promise<GenerateResponse> {
    const text = await this.client.generateStream(request, (textChunk: string) => {
      // Receives simple string
      // Manually construct rich chunk
      const richChunk: StreamChunk = {
        provider: 'ollama',
        model: options.model,
        text: textChunk,
        done: false,
        timestamp: new Date().toISOString(),
      };

      onChunk(richChunk); // Emit rich chunk
    });

    // Send final done chunk
    onChunk({ ...finalChunk, done: true });

    return {
      provider: 'ollama',
      model: options.model,
      text,
      timestamp: new Date().toISOString(),
    };
  }
}
```

## Pattern for Wrappers

**1. Investigate the actual implementation:**

```bash
# Don't trust type definitions alone
grep -A 20 "async generateStream" src/main/services/ai/ollamaClient.ts
```

**2. Test with real calls:**

```typescript
// Write integration test to verify actual behavior
const client = new OllamaClient();
await client.generateStream(request, (chunk) => {
  console.log('Chunk type:', typeof chunk); // 'string'
  console.log('Chunk value:', chunk); // 'Hello'
});
```

**3. Transform in wrapper layer:**

```typescript
// Accept simple, emit rich
onChunk(transform(simpleValue));
```

**4. Document API simplifications:**

```typescript
/**
 * OllamaClient simplifications:
 * - generateStream callback receives string, not GenerateStreamChunk
 * - checkHealth returns boolean, not HealthCheckResponse
 * - pullModel callback receives number (percentage), not PullProgress
 *
 * This wrapper enriches the simple API with metadata.
 */
```

## Common Simplification Patterns

**Pattern 1: Callback Receives Primitives**

```typescript
// Library API (simple)
fetchData((progress: number) => { ... });

// Your wrapper (rich)
fetchData((info: { progress: number; speed: string; eta: string }) => { ... });

// Solution: Transform in wrapper
library.fetchData((percent) => {
  onProgress({
    progress: percent,
    speed: calculateSpeed(),
    eta: calculateETA(percent),
  });
});
```

**Pattern 2: Methods Return Booleans**

```typescript
// Library: boolean
const isOk = await library.checkStatus();

// Your interface: detailed
const status = await wrapper.checkStatus();
// { status: 'healthy', responseTime: 123, message: '...' }

// Solution: Enrich in wrapper
async checkStatus() {
  const startTime = Date.now();
  const isOk = await library.checkStatus();
  return {
    status: isOk ? 'healthy' : 'unhealthy',
    responseTime: Date.now() - startTime,
    message: isOk ? 'Service is healthy' : 'Service unavailable',
  };
}
```

**Pattern 3: Events Without Metadata**

```typescript
// Library emits simple events
emitter.on('update', (id) => { ... });

// Your wrapper emits rich events
emitter.on('update', (event: UpdateEvent) => {
  // { id, timestamp, source, ... }
});

// Solution: Transform in wrapper
library.on('update', (id) => {
  this.emit('update', {
    id,
    timestamp: new Date().toISOString(),
    source: 'library',
  });
});
```

## See Also

- [L031: Type Name Collisions in Barrel Exports](type-name-collisions-barrel-exports.md)
- [L032: Type Casting Through Unknown](type-casting-through-unknown.md)
- [L036: Event Forwarding in Wrapper Classes](event-forwarding-wrapper.md)
- Implementation: `src/main/services/ai/providers/ollama.ts`
