# L016: HTTP Client Retry Pattern with Exponential Backoff

**Category:** Architecture / API Design
**Confidence:** 0.95 (Well-established pattern)
**Session:** T-3.1.1 (Ollama Client Service)
**Date:** 2026-01-30

## Discovery

When implementing HTTP clients with automatic retry capability, you must distinguish between **retryable errors** (transient failures that may succeed on retry) and **non-retryable errors** (client errors that won't change).

## The Problem

Naive retry logic retries all errors equally:

- Retrying 4xx client errors (bad input) wastes time—the error won't change
- Retrying 5xx server errors (temporary unavailability) is correct—server may recover
- Timeout errors should retry—likely a transient network blip
- Connection errors should retry—temporary network issues

Without proper classification, you waste resources on impossible retries.

## The Solution

**Distinguish error types in retry logic:**

```typescript
async fetchWithRetry<T>(
  url: string,
  options: any,
  attempt: number = 0
): Promise<T> {
  try {
    const response = await this.fetchWithTimeout(url, options);

    // Check for retryable errors (5xx, 429)
    if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
      const delay = retryDelay * Math.pow(2, attempt);  // Exponential backoff
      await this.sleep(delay);
      return this.fetchWithRetry(url, options, attempt + 1);
    }

    // Non-retryable error - fail fast
    if (!response.ok) {
      throw new APIError(response.status, response.statusText);
    }

    return await response.json();
  } catch (error) {
    // Only retry transient errors
    if (attempt < maxRetries && isRetryableError(error)) {
      const delay = retryDelay * Math.pow(2, attempt);
      await this.sleep(delay);
      return this.fetchWithRetry(url, options, attempt + 1);
    }
    throw error;
  }
}

isRetryableError(error: unknown): boolean {
  return (
    error instanceof TimeoutError ||
    error instanceof ConnectionError ||
    (error instanceof TypeError && error.message.includes('Failed to fetch'))
  );
}
```

**Exponential backoff pattern:**

```
Attempt 0 → Fail
Wait 1s (1 * 2^0)
Attempt 1 → Fail
Wait 2s (1 * 2^1)
Attempt 2 → Fail
Wait 4s (1 * 2^2)
Attempt 3 → Give up
```

## Why This Works

1. **Prevents thundering herd:** When a server recovers, exponential backoff prevents all clients from hammering it simultaneously
2. **Respects client errors:** 4xx errors fail fast instead of wasting retries
3. **Handles transient issues:** Timeouts and network errors get retry attempts
4. **Configuration flexibility:** Adjust retry count and backoff multiplier per use case

## Key Distinctions

| Error Type          | Retryable? | Reason                                  |
| ------------------- | ---------- | --------------------------------------- |
| 4xx (400, 401, 404) | ❌ No      | Input error won't change on retry       |
| 5xx (500, 502, 503) | ✅ Yes     | Server temporarily unavailable          |
| 429 (Rate Limited)  | ✅ Yes     | Wait and retry when limit resets        |
| Timeout             | ✅ Yes     | Likely transient network issue          |
| Connection Error    | ✅ Yes     | Network blip or server down temporarily |

## Configuration Defaults

- **Max Retries:** 3 attempts
- **Initial Delay:** 1000ms (1 second)
- **Backoff Multiplier:** 2 (exponential)
- **Max Backoff:** ~8 seconds (1s → 2s → 4s)

## Application to Ollama Client

In the OllamaClient implementation:

- Generate requests with retry on 5xx/429/timeouts
- Model list/info queries use fetchWithRetry
- Pull operations use fetchWithTimeout (no retry, but timeout support)
- Streaming operations do NOT retry mid-stream (would lose progress)

## Anti-Pattern

❌ **Bad:** Retry all errors, including client errors

```typescript
// Don't do this
for (let i = 0; i < 3; i++) {
  try {
    return await fetch(url);
  } catch (e) {
    // Retries even on 4xx!
  }
}
```

✅ **Good:** Retry only transient errors

```typescript
// Do this
if (response.status >= 500 && attempt < maxRetries) {
  delay = calculateBackoff(attempt);
  return retry();
}
```

## See Also

- [L017: Custom Error Hierarchy with Cause Chaining](custom-error-hierarchy-cause-chaining.md)
- [L019: Timeout Handling with AbortController](timeout-handling-abort-controller.md)
- Ollama Client implementation: `src/main/services/ai/ollamaClient.ts`
- Test cases: `src/main/services/ai/__tests__/ollamaClient.test.ts` (retry tests)
