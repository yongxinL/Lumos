# L023: Retry Strategy for LLM Generation

**Category:** Error Handling / Resilience
**Confidence:** 0.95 (Reliability pattern)
**Session:** T-3.1.2 (Evaluation LLM Service)
**Date:** 2026-01-30

## Discovery

LLM generation can fail for various reasons (network errors, parsing failures, validation errors). Implementing **exponential backoff retry with early exit for non-retryable errors** improves reliability without wasting resources.

Not all errors should be retried. Distinguishing recoverable from permanent failures is critical.

## The Problem

Naive retry logic wastes resources:

```typescript
// ❌ Bad: Retry everything equally
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const response = await generateProposal(input);
    return response;
  } catch (error) {
    // Retries even if model doesn't exist!
    // Retries even if timeout exceeded!
    // No backoff - hammers service
  }
}
```

Issues:

- Retries permanent failures (model not found, invalid input)
- No delay between retries (thundering herd)
- Wastes time on unrecoverable errors
- May exhaust rate limits

## The Solution

**Classify errors and retry only transient failures:**

```typescript
async generateProposal(input: ProposalGenerationInput): Promise<ActionProposal> {
  const startTime = Date.now();
  const prompt = this.buildPrompt(input);

  // Retry loop with exponential backoff
  for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
    try {
      // Attempt generation
      const response = await this.ollama.generate({
        model: this.config.model,
        prompt,
        format: JSON.stringify(ACTION_PROPOSAL_SCHEMA),
        options: {
          temperature: this.config.temperature,
          top_p: 0.9,
          num_predict: 512,
        },
      });

      // Parse and validate
      const proposal = this.parseAndValidate(response, input);
      const duration = Date.now() - startTime;

      console.log(`✓ Proposal generated in ${duration}ms (attempt ${attempt}/${this.config.maxRetries})`);
      return proposal;

    } catch (error) {
      console.error(`✗ Attempt ${attempt}/${this.config.maxRetries} failed:`, error);

      // ============================================================
      // Early exit for non-retryable errors
      // ============================================================
      if (error instanceof EvaluationModelNotFoundError) {
        throw error; // Model doesn't exist, retrying won't help
      }

      if (error instanceof EvaluationTimeoutError) {
        throw error; // Already timed out, don't retry
      }

      // ============================================================
      // Last attempt - throw retry exhausted error
      // ============================================================
      if (attempt === this.config.maxRetries) {
        throw new EvaluationRetryExhaustedError(
          this.config.maxRetries,
          error instanceof Error ? error : undefined
        );
      }

      // ============================================================
      // Exponential backoff before next retry
      // ============================================================
      await this.sleep(1000 * attempt); // 1s, 2s, 3s
    }
  }

  // Should never reach here
  throw new EvaluationRetryExhaustedError(this.config.maxRetries);
}
```

## Why This Works

**1. Error Classification:**

- **Retryable:** Transient network issues, temporary unavailability, validation failures
- **Non-retryable:** Model not found, authentication failures, permanent errors

**2. Exponential Backoff:**

- Prevents hammering service during recovery
- Gives system time to stabilize
- Reduces thundering herd on service restart

**3. Attempt Tracking:**

- Log each attempt for debugging
- Calculate total time spent
- Provide context in final error

**4. Early Exit:**

- Fail fast on permanent errors
- Save time and resources
- Clear error messages

## Error Classification Guide

| Error Type              | Retryable? | Reason                                  |
| ----------------------- | ---------- | --------------------------------------- |
| Network timeout         | ✅ Yes     | Transient network issue                 |
| Connection refused      | ✅ Yes     | Service temporarily down                |
| JSON parse error        | ✅ Yes     | LLM output malformed, may work on retry |
| Schema validation error | ✅ Yes     | LLM may generate valid output on retry  |
| Model not found         | ❌ No      | Model doesn't exist, won't change       |
| Authentication error    | ❌ No      | Invalid credentials won't change        |
| Rate limit exceeded     | ⚠️ Special | Retry with longer backoff               |
| Timeout error           | ❌ No      | Already waited max time                 |

## Backoff Strategies

**Exponential Backoff (Recommended):**

```typescript
const delay = baseDelay * Math.pow(2, attempt);
// Attempt 1: 1s * 2^0 = 1s
// Attempt 2: 1s * 2^1 = 2s
// Attempt 3: 1s * 2^2 = 4s
```

**Linear Backoff:**

```typescript
const delay = baseDelay * attempt;
// Attempt 1: 1s * 1 = 1s
// Attempt 2: 1s * 2 = 2s
// Attempt 3: 1s * 3 = 3s
```

**Exponential with Jitter (Advanced):**

```typescript
const delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
// Adds randomness to prevent synchronized retries
```

## Configuration

```typescript
interface RetryConfig {
  maxRetries: number; // Maximum retry attempts (default: 3)
  baseDelay: number; // Initial delay in ms (default: 1000)
  maxDelay?: number; // Cap on delay (default: 30000)
  backoffMultiplier?: number; // Backoff factor (default: 2)
}

// Conservative (fewer retries, longer delays)
const conservative: RetryConfig = {
  maxRetries: 2,
  baseDelay: 2000,
  backoffMultiplier: 3, // 2s, 6s
};

// Aggressive (more retries, shorter delays)
const aggressive: RetryConfig = {
  maxRetries: 5,
  baseDelay: 500,
  backoffMultiplier: 1.5, // 0.5s, 0.75s, 1.1s, 1.7s, 2.5s
};

// Balanced (recommended)
const balanced: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  backoffMultiplier: 2, // 1s, 2s, 4s
};
```

## Logging Best Practices

**Log each attempt:**

```typescript
console.error(`✗ Attempt ${attempt}/${maxRetries} failed:`, error);
```

**Log successful attempts:**

```typescript
console.log(`✓ Proposal generated in ${duration}ms (attempt ${attempt}/${maxRetries})`);
```

**Log final failure:**

```typescript
throw new RetryExhaustedError(`Failed after ${maxRetries} attempts`, lastError);
```

This helps with:

- Debugging intermittent failures
- Identifying patterns in errors
- Tuning retry parameters
- Monitoring service health

## Metrics to Track

```typescript
interface RetryMetrics {
  total_attempts: number;
  successful_first_attempt: number;
  successful_after_retry: number;
  failed_after_retries: number;
  avg_attempts_to_success: number;
  avg_retry_delay_ms: number;
  most_common_error: string;
}
```

**Healthy service indicators:**

- First attempt success rate > 85%
- Average attempts to success < 1.3
- Retry exhausted rate < 5%

## Circuit Breaker Pattern (Advanced)

For high-volume systems, add circuit breaker:

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private lastFailureTime = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

## Anti-Pattern

❌ **Bad:** No error classification

```typescript
for (let i = 0; i < 3; i++) {
  try {
    return await generate();
  } catch (e) {
    // Retries everything, even permanent errors
  }
}
```

✅ **Good:** Classify before retrying

```typescript
if (error instanceof ModelNotFoundError) throw error;
if (attempt < maxRetries) await retry();
```

❌ **Bad:** No backoff delay

```typescript
for (let i = 0; i < 3; i++) {
  try {
    return await generate();
  } catch (e) {
    // Immediately retries, hammers service
  }
}
```

✅ **Good:** Exponential backoff

```typescript
await sleep(baseDelay * Math.pow(2, attempt));
```

❌ **Bad:** Silent retries without logging

```typescript
catch (e) {
  // No logging - can't debug failures
  if (attempt < max) retry();
}
```

✅ **Good:** Log all attempts

```typescript
catch (e) {
  console.error(`Attempt ${attempt} failed:`, e);
  if (attempt < max) retry();
}
```

## See Also

- [L016: HTTP Client Retry Pattern with Exponential Backoff](http-client-retry-exponential-backoff.md)
- [L020: Constrained JSON Decoding with Ollama](constrained-json-decoding-ollama.md)
- [L021: Business Rule Validation vs Schema Validation](business-rule-validation-vs-schema.md)
- Evaluation LLM Service: `src/main/services/ai/evaluationLlmService.ts` (see `generateProposal`)
- Error classes: `src/main/services/ai/evaluationErrors.ts`
- Retry tests: `src/main/services/ai/__tests__/evaluationLlmService.test.ts`
