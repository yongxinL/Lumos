# L017: Custom Error Hierarchy with Cause Chaining

**Category:** Type System / Error Handling
**Confidence:** 0.95 (TypeScript best practice)
**Session:** T-3.1.1 (Ollama Client Service)
**Date:** 2026-01-30

## Discovery

Building custom error classes with inheritance can cause TypeScript assignability issues when trying to override the readonly `name` property from the Error base class. The solution is to use `this.constructor.name` to automatically set the error name.

## The Problem

When creating a custom error hierarchy, you might try:

```typescript
// ❌ This causes TypeScript errors
export class OllamaTimeoutError extends OllamaError {
  readonly name = 'OllamaTimeoutError'; // Assignability conflict

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
  }
}
```

**Error:**

```
Type 'OllamaTimeoutError' is not assignable to type 'OllamaError'
  The types have separate declarations of a private property 'name'
```

This happens because Error.name is a readonly string property, and TypeScript can't reconcile the literal string type with the parent class type.

## The Solution

**Use `this.constructor.name` to auto-set the error name:**

```typescript
export class OllamaError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    // Auto-set from class name - works with all subclasses
    this.name = this.constructor.name;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Chain the stack trace if cause exists
    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

export class OllamaTimeoutError extends OllamaError {
  constructor(
    public readonly timeoutMs: number,
    cause?: Error
  ) {
    super(`Request timed out after ${timeoutMs}ms`, cause);
    // name automatically set to 'OllamaTimeoutError'
  }
}

export class OllamaConnectionError extends OllamaError {
  constructor(message: string, cause?: Error) {
    super(`Failed to connect to Ollama: ${message}`, cause);
    // name automatically set to 'OllamaConnectionError'
  }
}
```

## Why This Works

1. **No TypeScript conflicts:** `this.name = this.constructor.name` doesn't override readonly properties
2. **Automatic naming:** Each subclass gets its name without explicit override
3. **Proper instanceof:** `Object.setPrototypeOf` ensures instanceof checks work correctly
4. **Cause chaining:** Original error stack preserved for full debugging context

## Cause Chaining Pattern

The `cause` parameter allows you to preserve the original error context:

```typescript
try {
  const response = await fetch(url);
} catch (error) {
  // Wrap the original error with context
  throw new OllamaConnectionError('Network request failed', error as Error);
}
```

**Result when caught:**

```
Error: OllamaConnectionError: Failed to connect to Ollama: Network request failed
  at OllamaClient.fetchWithTimeout()
Caused by: TypeError: Failed to fetch
  at processTicksAndRejections()
```

The full stack trace helps you see:

- What high-level operation failed (OllamaConnectionError)
- The root cause (TypeError: Failed to fetch)
- Complete call stack for both

## Complete Error Hierarchy

```
Error (built-in)
└── OllamaError (base)
    ├── OllamaConnectionError
    ├── OllamaTimeoutError
    ├── OllamaModelNotFoundError
    ├── OllamaAPIError
    └── OllamaInvalidResponseError
```

Each error type provides specific information:

```typescript
// Connection error - includes cause chain
throw new OllamaConnectionError('Failed to reach Ollama', networkError);

// Timeout error - includes timeout duration
throw new OllamaTimeoutError(120000);

// Model not found - includes model name
throw new OllamaModelNotFoundError('llama3.2');

// API error - includes status code and response body
throw new OllamaAPIError(500, 'Internal Server Error', responseBody);

// Invalid response - includes error cause
throw new OllamaInvalidResponseError('Missing response field', parseError);
```

## Usage Example

```typescript
async generate(request: GenerateRequest): Promise<string> {
  try {
    const response = await this.fetchWithRetry<GenerateResponse>(url, options);

    if (!response.response) {
      throw new OllamaInvalidResponseError('Missing response field');
    }

    return response.response;
  } catch (error) {
    // mapError already does instanceof checks
    throw this.mapError(error);
  }
}

private mapError(error: unknown): OllamaError {
  if (error instanceof OllamaError) {
    return error;  // Already typed
  }

  if (error instanceof OllamaTimeoutError) {
    return error;  // Already typed
  }

  if (error instanceof TypeError) {
    return new OllamaConnectionError(error.message, error);
  }

  if (error instanceof Error) {
    return new OllamaError(error.message, error);
  }

  return new OllamaError(String(error));
}
```

## Key Principles

1. **No readonly overrides:** Let Error.name be set via constructor
2. **Always set prototype:** Use `Object.setPrototypeOf` for proper instanceof
3. **Preserve cause:** Include original error in constructor for debugging
4. **Chain stack traces:** Append cause.stack to help developers trace issues
5. **Type-specific info:** Each error subclass includes relevant context (timeoutMs, modelName, statusCode, etc.)

## Anti-Pattern

❌ **Bad:** Trying to override readonly properties

```typescript
export class CustomError extends Error {
  readonly name = 'CustomError'; // TypeScript error!
}
```

✅ **Good:** Use constructor assignment

```typescript
export class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name; // Works!
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

## See Also

- [L016: HTTP Client Retry Pattern with Exponential Backoff](http-client-retry-exponential-backoff.md)
- [L019: Timeout Handling with AbortController](timeout-handling-abort-controller.md)
- Error classes: `src/main/services/ai/ollamaErrors.ts`
- Error mapping: `src/main/services/ai/ollamaClient.ts:474` (mapError method)
- Tests: `src/main/services/ai/__tests__/ollamaClient.test.ts` (error handling suite)
