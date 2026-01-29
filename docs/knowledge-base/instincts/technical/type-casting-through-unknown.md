# L032: Type Casting Through Unknown for Incompatible Types

**Category:** Type System
**Confidence:** 0.95 (Standard TypeScript pattern)
**Session:** T-3.2.1 (AI Provider Interface)
**Date:** 2026-01-30

## Discovery

When TypeScript detects insufficient overlap between two types, direct casting fails with error: **"Conversion of type A to type B may be a mistake"**. The solution is to cast through `unknown` as an intermediate step.

## The Problem

```typescript
// TypeScript error: Types don't overlap sufficiently
const result = (await client.getData()) as TargetType; // ❌ Fails

// Error message:
// Conversion of type 'SourceType' to type 'TargetType' may be a mistake
// because neither type sufficiently overlaps with the other.
```

**Common scenarios:**

- Wrapping third-party APIs with your own types
- Type name collisions (same name, different structure)
- Transforming data between incompatible schemas
- Provider abstraction layers

## The Solution

**Cast through `unknown` first:**

```typescript
// ✅ Cast through unknown
const result = (await client.getData()) as unknown as TargetType;
```

**Why this works:**

- `unknown` is TypeScript's top type (accepts anything)
- First cast: `SourceType → unknown` (always valid)
- Second cast: `unknown → TargetType` (requires explicit intent)
- Forces you to be explicit about the conversion

## When to Use

**✅ Use when:**

- You **know** the runtime type is correct, but TypeScript can't verify it
- Wrapping APIs with incompatible type definitions
- Dealing with type name collisions
- Transforming between incompatible schemas
- Provider-specific types → Common types

**❌ Don't use when:**

- There's a legitimate type mismatch (fix types instead)
- You're unsure about the runtime type (add validation)
- It can be avoided with proper type design
- You're just suppressing type errors (use proper types)

## Implementation Pattern

```typescript
// ========================================
// Pattern: Provider API Wrapper
// ========================================

import type { ModelInfo as OllamaModelInfo } from '@/types/ai/ollama';
import type { ModelInfo } from '@/types/ai/provider';

class OllamaProvider {
  async listModels(): Promise<ModelInfo[]> {
    // OllamaClient.listModels() returns Ollama's ModelInfo[]
    // But TypeScript thinks it's Provider's ModelInfo[]
    const ollamaModels = (await this.client.listModels()) as unknown as OllamaModelInfo[];

    // Transform to provider type
    return ollamaModels.map((model) => ({
      provider: 'ollama',
      id: model.name,
      name: model.name,
      size: model.size,
      // ... other transformations
    }));
  }
}
```

## Comparison with Other Approaches

**Approach 1: Direct cast (fails)**

```typescript
const models = (await client.listModels()) as OllamaModelInfo[]; // ❌ Error
```

**Approach 2: Cast through `unknown` (works)**

```typescript
const models = (await client.listModels()) as unknown as OllamaModelInfo[]; // ✅
```

**Approach 3: Cast through `any` (unsafe)**

```typescript
const models = (await client.listModels()) as any as OllamaModelInfo[]; // ⚠️ Unsafe
```

**Why `unknown` is better than `any`:**

- `any` disables all type checking
- `unknown` requires explicit type assertion
- `unknown` is safer and more intentional
- `any` can accidentally propagate through your code

## Anti-Patterns

❌ **Bad: Using `any` to bypass type checking**

```typescript
const models = (await client.listModels()) as any; // Loses all type safety
const firstModel = models[0]; // No autocomplete, no type checking
```

❌ **Bad: Chaining through `any`**

```typescript
const result = data as any as TargetType; // any is contagious
```

❌ **Bad: Hiding type mismatches**

```typescript
// Runtime error waiting to happen
const user = { id: 1, name: 'Alice' } as unknown as { id: string; email: string };
console.log(user.email); // undefined at runtime!
```

✅ **Good: Cast + Validate**

```typescript
const models = (await client.listModels()) as unknown as OllamaModelInfo[];

// Add runtime validation for critical paths
if (!Array.isArray(models) || !models[0]?.name) {
  throw new Error('Invalid model data structure');
}
```

✅ **Good: Document why casting is needed**

```typescript
// Type collision: OllamaClient returns Ollama's ModelInfo,
// but TypeScript infers Provider's ModelInfo due to barrel exports
const ollamaModels = (await this.client.listModels()) as unknown as OllamaModelInfo[];
```

## Common Use Cases

**Use Case 1: Third-Party API Wrapper**

```typescript
// Stripe returns { id: string, amount: number }
// Our Payment type has { paymentId: string, amountCents: number }

const stripeCharge = await stripe.charges.create(...);
const payment = (stripeCharge as unknown as { id: string; amount: number }) as Payment;
// Wrong! Transform instead:

const payment: Payment = {
  paymentId: stripeCharge.id,
  amountCents: stripeCharge.amount,
};
```

**Use Case 2: Type Name Collision**

```typescript
import type { User as Auth0User } from './auth0';
import type { User } from './types';

const auth0User = await auth0.getUser();
// TypeScript confused: which User type?
const user = auth0User as unknown as Auth0User; // Clarify
```

**Use Case 3: Dynamic Data Transformation**

```typescript
const jsonData = JSON.parse(response); // Returns `any`
const typedData = jsonData as unknown as ExpectedType; // Make intent explicit
```

## Testing Casted Types

```typescript
describe('Type Casting', () => {
  it('should correctly cast and transform models', () => {
    const mockOllamaResponse = [
      { name: 'model1', size: 1000, details: { ... } }
    ];

    // Cast to expected type
    const models = mockOllamaResponse as unknown as OllamaModelInfo[];

    // Verify structure
    expect(models[0]).toHaveProperty('name');
    expect(models[0]).toHaveProperty('details');
    expect(typeof models[0].size).toBe('number');
  });
});
```

## See Also

- [L031: Type Name Collisions in Barrel Exports](type-name-collisions-barrel-exports.md)
- [L033: Simplified API Wrapping Pattern](simplified-api-wrapping.md)
- Implementation: `src/main/services/ai/providers/ollama.ts`
- TypeScript Handbook - Type Assertions: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions
