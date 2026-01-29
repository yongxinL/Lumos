# L031: Type Name Collisions in Barrel Exports

**Category:** Type System / Architecture
**Confidence:** 0.95 (High - significant debugging time invested)
**Session:** T-3.2.1 (AI Provider Interface)
**Date:** 2026-01-30

## Discovery

When creating abstraction layers over existing APIs, **type name collisions** become a significant challenge. Having both `ModelInfo` from Ollama and `ModelInfo` from Provider types creates ambiguity in TypeScript's type resolution, especially when using barrel exports (`index.ts` files that re-export types).

This commonly occurs when:

- Building wrapper/adapter layers over third-party APIs
- Creating provider abstractions (e.g., database, AI, payment providers)
- Refactoring monolithic types into domain-specific modules

## The Problem

```typescript
// types/index.ts - Barrel export file
export type { ModelInfo } from './ai/ollama'; // ← Collision!
export type { ModelInfo } from './ai/provider'; // ← Collision!

// Consumer code
import type { ModelInfo } from '@/types'; // ❌ Which ModelInfo?
```

**TypeScript behavior:**

- In some contexts, TypeScript uses the **last imported** type
- In other contexts, it may use the **first imported** type
- The behavior is **inconsistent and unpredictable**
- Compile errors appear in unexpected places

## The Solution

**Option 1: Type Aliases in Barrel Exports (Partial Fix)**

```typescript
// types/index.ts
export type {
  ModelInfo as OllamaModelInfo, // Rename on export
  GenerateResponse,
} from './ai/ollama';

export type {
  ModelInfo, // Keep original for provider
  GenerateResponse as ProviderGenerateResponse, // Alias for provider version
} from './ai/provider';
```

**Benefits:** Clear intent, self-documenting
**Drawbacks:** Barrel exports can still cause ambiguity in deep type resolution

**Option 2: Direct Imports from Source Files (Reliable ✅)**

```typescript
// ❌ Barrel import - ambiguous
import type { ModelInfo } from '@/types';

// ✅ Direct imports - explicit and reliable
import type { ModelInfo as OllamaModelInfo } from '@/types/ai/ollama';
import type { ModelInfo } from '@/types/ai/provider';
```

**Benefits:**

- Explicit and unambiguous
- TypeScript always knows which type you mean
- No hidden resolution issues
- Easier to trace in IDE

**Drawbacks:**

- More verbose import statements
- Need to know exact file locations

## Why This Works

**Direct imports bypass the barrel export resolution:**

```typescript
// Barrel export resolution path (ambiguous):
@/types → index.ts → ollama.ts → ModelInfo
                  → provider.ts → ModelInfo  // Which one?

// Direct import resolution path (explicit):
@/types/ai/ollama → ollama.ts → ModelInfo  // Always this one
@/types/ai/provider → provider.ts → ModelInfo  // Always this one
```

**TypeScript's module resolution:**

1. When importing from barrel (`@/types`), TypeScript merges all exports
2. Duplicate names create ambiguity that TypeScript resolves inconsistently
3. Direct imports skip the merger, providing explicit paths

## When to Use Each Approach

**Use Barrel Exports (with aliases):**

- For convenience imports in application code
- When types don't have naming conflicts
- For public APIs where consistency matters

**Use Direct Imports:**

- In critical infrastructure (services, providers, adapters)
- When building abstraction layers
- When debugging type resolution issues
- For types with known collisions

## Implementation Pattern

```typescript
// ========================================
// File: src/main/services/ai/providers/ollama.ts
// ========================================

// ✅ GOOD: Direct imports for critical types
import type { OllamaConfig, ModelInfo as OllamaModelInfo } from '@/types/ai/ollama';
import type {
  AIProviderType,
  AIProviderConfig,
  GenerateResponse,
  ModelInfo,
} from '@/types/ai/provider';

// Now we can use both ModelInfo types unambiguously
class OllamaProvider {
  async listModels(): Promise<ModelInfo[]> {
    // Provider ModelInfo
    const ollamaModels = await this.client.listModels(); // Returns OllamaModelInfo[]

    return ollamaModels.map((model: OllamaModelInfo) => ({
      // Explicit cast
      provider: 'ollama',
      id: model.name,
      // Transform OllamaModelInfo → ModelInfo
    }));
  }
}
```

## Common Use Cases

**Case 1: Provider Abstraction Layers**

```typescript
// Multiple providers with similar type names
import type { User as Auth0User } from './providers/auth0';
import type { User as CognitoUser } from './providers/cognito';
import type { User } from './types/user'; // Abstract user

class AuthProvider {
  convertToCommonUser(auth0User: Auth0User): User {
    // Transform provider-specific → common
  }
}
```

**Case 2: Database Abstraction**

```typescript
import type { Model as SequelizeModel } from './db/sequelize';
import type { Model as MongooseModel } from './db/mongoose';
import type { Model } from './types/model'; // Abstract model
```

**Case 3: Payment Gateway Abstraction**

```typescript
import type { PaymentMethod as StripePaymentMethod } from './stripe';
import type { PaymentMethod as PayPalPaymentMethod } from './paypal';
import type { PaymentMethod } from './types/payment';
```

## Anti-Patterns

❌ **Bad: Relying on barrel exports with collisions**

```typescript
// types/index.ts
export type { ModelInfo } from './ai/ollama';
export type { ModelInfo } from './ai/provider'; // Collision ignored

// Consumer code
import type { ModelInfo } from '@/types'; // Which one? Nobody knows!
```

❌ **Bad: Renaming in every import**

```typescript
// Every file imports with different aliases
import type { ModelInfo as MI1 } from '@/types'; // File 1
import type { ModelInfo as ModelInfoType } from '@/types'; // File 2
import type { ModelInfo as IModelInfo } from '@/types'; // File 3
// Inconsistent and confusing
```

✅ **Good: Consistent direct imports**

```typescript
// Consistent aliases across codebase
import type { ModelInfo as OllamaModelInfo } from '@/types/ai/ollama';
import type { ModelInfo } from '@/types/ai/provider';
```

✅ **Good: Aliased barrel exports + direct imports where needed**

```typescript
// types/index.ts - Provide aliases
export type { ModelInfo as OllamaModelInfo } from './ai/ollama';
export type { ModelInfo } from './ai/provider';

// App code - Use aliases from barrel
import type { OllamaModelInfo, ModelInfo } from '@/types';

// Infrastructure code - Use direct imports
import type { ModelInfo as OllamaModelInfo } from '@/types/ai/ollama';
```

## Debugging Type Collisions

**Step 1: Identify the collision**

```bash
# TypeScript error will show:
# Type 'ModelInfo' is not assignable to type 'ModelInfo'
# Properties 'provider', 'id' are missing
```

**Step 2: Check import source**

```typescript
// Hover over type in IDE to see resolved path
const model: ModelInfo = ...;  // Shows: import("/path/to/ollama").ModelInfo
```

**Step 3: Use explicit imports**

```typescript
// Replace ambiguous import
import type { ModelInfo } from '@/types'; // ❌

// With explicit import
import type { ModelInfo } from '@/types/ai/provider'; // ✅
```

**Step 4: Add type assertions if needed**

```typescript
// When TypeScript can't infer the correct type
const models = (await client.listModels()) as unknown as OllamaModelInfo[];
```

## See Also

- [L032: Type Casting Through Unknown for Incompatible Types](type-casting-through-unknown.md)
- [L037: Conditional Type Exports for Avoiding Collisions](conditional-type-exports.md)
- Implementation: `src/main/services/ai/providers/ollama.ts`
- TypeScript Module Resolution: https://www.typescriptlang.org/docs/handbook/module-resolution.html
