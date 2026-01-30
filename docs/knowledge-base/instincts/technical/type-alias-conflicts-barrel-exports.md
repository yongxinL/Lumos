# L039: Type Alias Conflicts with Barrel Exports

**ID:** L039
**Date:** 2026-01-30
**Session:** T-3.2.2 (Expert AI Service)
**Confidence:** 0.95
**Category:** Type System / Module Organization
**Tags:** #typescript #barrel-exports #type-aliases #module-organization

---

## Discovery

When multiple modules export the same type name (e.g., `ProcessedInput`), TypeScript can have conflicts during import resolution. Type aliases in barrel exports solve this elegantly.

## Pattern

```typescript
// ❌ Problem: Multiple ProcessedInput types
export type { ProcessedInput } from './input/input';
export type { ProcessedInput } from './ai/expertAi'; // Collision!

// ✅ Solution: Use type aliases
export type { ProcessedInput } from './input/input';
export type { ProcessedInput as ExpertProcessedInput } from './ai/expertAi';
```

## Lesson

- Barrel exports with same-named types cause import ambiguity
- Solution 1: Direct imports from source files (most reliable)
- Solution 2: Type aliases in barrel exports (convenience + clarity)
- Prefer aliases that indicate the domain: `ExpertProcessedInput`, `InputProcessedInput`
- Makes imports self-documenting and prevents accidental collisions

## When to Use

- When building abstraction layers with multiple input/output types
- When consolidating exports from multiple domain modules
- When same concept exists in different contexts (e.g., ProcessedInput for different services)

## Example from Lumos

```typescript
// src/types/index.ts
export type { ProcessedInput } from './input/input';
export type { ProcessedInput as ExpertProcessedInput } from './ai/expertAi';

// Usage
import type { ProcessedInput, ExpertProcessedInput } from '@/types';
```

## Related Learnings

- L031: Type name collisions in barrel exports
- L037: Conditional type exports for avoiding collisions
