# L019: Timeout Handling with AbortController

**Category:** Async / Error Handling
**Confidence:** 0.95 (Modern web API pattern)
**Session:** T-3.1.1 (Ollama Client Service)
**Date:** 2026-01-30

## Discovery

Node.js fetch API supports AbortController for request cancellation and timeout enforcement. This is cleaner and more reliable than older promise.race() patterns.

## The Problem

Old timeout patterns had issues:

**Promise.race() anti-pattern:**

```typescript
❌ // Bad - race condition, loose coupling
async function fetchWithTimeout(url: string, timeoutMs: number) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );

  return Promise.race([
    fetch(url),
    timeoutPromise
  ]);
}
```

Problems:

- Fetch continues running in background (wasted resources)
- Timeout promise doesn't actually abort the fetch
- No standardized timeout error type
- Can't distinguish abort reason

## The Solution

**Use AbortController for clean cancellation:**

```typescript
private async fetchWithTimeout(
  url: string,
  options: any
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,  // ← Pass abort signal
    });
  } catch (error) {
    // Check if abort was due to timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new OllamaTimeoutError(this.config.timeout);
    }

    // Network error
    if (error instanceof TypeError) {
      throw new OllamaConnectionError('Network request failed', error);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);  // ← Always cleanup
  }
}
```

## How It Works

**Step-by-step execution:**

```typescript
// 1. Create abort controller
const controller = new AbortController();

// 2. Set timeout that will trigger abort
const timeoutId = setTimeout(() => {
  controller.abort(); // Signal all abort listeners
}, 5000);

try {
  // 3. Pass signal to fetch
  const response = await fetch(url, {
    signal: controller.signal, // ← Fetch listens for abort
  });

  // 4. If response comes before timeout (< 5s), success!
  return response;
} catch (error) {
  // 5. If abort triggered, error.name === 'AbortError'
  if (error.name === 'AbortError') {
    throw new TimeoutError(5000);
  }
  throw error;
} finally {
  // 6. Always cleanup timer (prevents memory leak)
  clearTimeout(timeoutId);
}
```

## Timeout Error Detection

**Critical:** Check the error name, not instanceof

```typescript
// ❌ Don't do this
try {
  await fetch(url, { signal: controller.signal });
} catch (error) {
  if (error instanceof AbortError) {
  } // AbortError doesn't exist!
}

// ✅ Do this
try {
  await fetch(url, { signal: controller.signal });
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    // Handle timeout
  }
}
```

AbortError is not an exported class; you check via error.name.

## Cleanup is Critical

**Always clear the timeout:**

```typescript
let timeoutId: NodeJS.Timeout | undefined;

try {
  const controller = new AbortController();
  timeoutId = setTimeout(() => controller.abort(), 5000);
  return await fetch(url, { signal: controller.signal });
} finally {
  // ← Must always run, even on error
  if (timeoutId) clearTimeout(timeoutId);
}
```

Without cleanup:

- Timer keeps running after fetch completes
- Memory leak if many requests
- Node process hangs if timers not cleared

## Configuration Pattern

**Timeout as configurable property:**

```typescript
export interface OllamaConfig {
  baseUrl: string;
  timeout: number; // ← Milliseconds
  maxRetries: number;
  retryDelay: number;
}

const DEFAULT_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  timeout: 120000, // 120 seconds (large model inference can be slow)
  maxRetries: 3,
  retryDelay: 1000,
};
```

**Usage:**

```typescript
// Default 120s timeout
const client = getOllamaClient();

// Custom 30s timeout for quick health checks
const quickClient = getOllamaClient({ timeout: 30000 });

// Change at runtime
client.updateConfig({ timeout: 60000 });
```

## Timeout Values for Different Operations

| Operation               | Timeout    | Reason                 |
| ----------------------- | ---------- | ---------------------- |
| Health check            | 5,000ms    | Should be instant      |
| List models             | 10,000ms   | API metadata, quick    |
| Generate (small prompt) | 30,000ms   | Quick inference        |
| Generate (large model)  | 120,000ms  | Large models take time |
| Pull model              | No timeout | Could take minutes     |

For pull operations, use streaming with progress instead:

```typescript
async pullModel(
  model: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  // Uses fetchWithTimeout but doesn't timeout
  // Progress callback updates UI during download
  const response = await this.fetchWithTimeout(url, options);
  // ... parse streaming response ...
}
```

## Signal Propagation

AbortSignal can be used across multiple operations:

```typescript
const controller = new AbortController();

Promise.all([
  fetch('/api/url1', { signal: controller.signal }),
  fetch('/api/url2', { signal: controller.signal }),
  fetch('/api/url3', { signal: controller.signal }),
]);

// Single abort cancels all three
setTimeout(() => controller.abort(), 5000);
```

In practice, OllamaClient creates a new controller per request.

## Comparison: promise.race() vs AbortController

| Aspect              | promise.race()       | AbortController           |
| ------------------- | -------------------- | ------------------------- |
| Cleanup             | Manual, error-prone  | Automatic with finally    |
| Resource usage      | Fetch continues      | Fetch actually aborts     |
| Error type          | Generic Error        | Standardized AbortError   |
| Abort reason        | Lost                 | Can inspect signal.reason |
| Retry support       | Difficult            | Native support            |
| Performance         | Wasteful (race lost) | Efficient (true cancel)   |
| Modern browser/Node | Old, deprecated      | Standard since Node 15    |

## Real-World Example from OllamaClient

```typescript
// Text generation with timeout
async generate(request: GenerateRequest): Promise<string> {
  const url = `${this.config.baseUrl}/api/generate`;

  try {
    // fetchWithTimeout enforces 120s limit
    const response = await this.fetchWithRetry<GenerateResponse>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: false }),
    });

    if (!response.response) {
      throw new OllamaInvalidResponseError('Missing response field');
    }

    return response.response;
  } catch (error) {
    // mapError converts timeout to user-friendly OllamaTimeoutError
    throw this.mapError(error);
  }
}
```

## See Also

- [L016: HTTP Client Retry Pattern with Exponential Backoff](http-client-retry-exponential-backoff.md)
- [L017: Custom Error Hierarchy with Cause Chaining](custom-error-hierarchy-cause-chaining.md)
- Timeout implementation: `src/main/services/ai/ollamaClient.ts:281` (fetchWithTimeout)
- Configuration: `src/types/ai/ollama.ts` (OllamaConfig interface)
- Error mapping: `src/main/services/ai/ollamaClient.ts:474` (mapError method)
- Tests: `src/main/services/ai/__tests__/ollamaClient.test.ts` (timeout scenarios)

## References

- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Node.js fetch with timeout](https://nodejs.org/en/docs/guides/fetch-api/)
- [Web standard AbortSignal](https://dom.spec.whatwg.org/#abortsignal)
