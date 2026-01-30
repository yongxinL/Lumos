# L040: Timestamp Type Casting in Provider Responses

**ID:** L040
**Date:** 2026-01-30
**Session:** T-3.2.2 (Expert AI Service)
**Confidence:** 0.90
**Category:** Type System / Provider Integration
**Tags:** #typescript #branded-types #type-casting #provider-integration

---

## Discovery

Provider response types may declare timestamps as `ISO8601String`, but TypeScript's strict type checking doesn't automatically narrow `string` → branded type even when the value is already correctly formatted.

## Pattern

```typescript
// ❌ Type error: string not assignable to ISO8601String
return {
  timestamp: response.timestamp, // Type error
};

// ✅ Solution: Type assertion with explanatory comment
return {
  timestamp: response.timestamp as any, // Provider timestamp is already ISO8601String
};
```

## Lesson

- Branded types provide safety but require explicit casting at library boundaries
- Provider interfaces may use `string` internally for broader compatibility
- Use `as any` with clear comment explaining why casting is safe
- Alternative: Validate and wrap with helper: `iso8601(response.timestamp)`
- This is a known trade-off between type safety and library interoperability

## When to Use

- When integrating with third-party providers that don't use branded types
- When response types use `string` but actual values are constrained
- At boundary between external libraries and internal type-safe code

## Example from Lumos

```typescript
// ExpertAIService wrapping provider response
return {
  conversationId,
  content: response.text,
  provider: response.provider,
  model: response.model,
  timestamp: response.timestamp as any, // Provider response timestamp is already ISO8601String
};
```

## Related Learnings

- L001: Type brand integration with helper functions
- L032: Type casting through unknown
