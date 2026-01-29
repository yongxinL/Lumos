# L037: Conditional Type Exports for Avoiding Collisions

**Category:** Type System / Module Organization
**Confidence:** 0.90 (TypeScript pattern)
**Session:** T-3.2.1 (AI Provider Interface)
**Date:** 2026-01-30

## Discovery

When exporting types from a barrel file where names collide, use **type aliases in the export statement** itself to provide clear, self-documenting names.

## The Pattern

```typescript
// types/index.ts

// Export with alias to avoid collision
export type {
  ModelInfo as OllamaModelInfo, // Rename on export
  GenerateResponse, // Keep original if no collision
} from './ai/ollama';

export type {
  ModelInfo, // Different ModelInfo
  GenerateResponse as ProviderGenerateResponse, // Alias for Provider version
} from './ai/provider';
```

## Benefits vs. Drawbacks

**Benefits:**

- Clear intent at export level
- Consumers see aliases in autocomplete
- Forces explicit usage
- Self-documenting

**Drawbacks:**

- Verbose import statements
- Need to remember which alias to use
- Can still have issues with deep imports

## Best Practice

**Use export aliases for convenience, direct imports for precision:**

```typescript
// types/index.ts - Provide aliases
export type { ModelInfo as OllamaModelInfo } from './ai/ollama';
export type { ModelInfo } from './ai/provider';

// App code - Use aliases from barrel
import type { OllamaModelInfo, ModelInfo } from '@/types';

// Infrastructure code - Use direct imports for reliability
import type { ModelInfo as OllamaModelInfo } from '@/types/ai/ollama';
import type { ModelInfo } from '@/types/ai/provider';
```

## See Also

- [L031: Type Name Collisions in Barrel Exports](type-name-collisions-barrel-exports.md)
- Implementation: `src/types/index.ts`
