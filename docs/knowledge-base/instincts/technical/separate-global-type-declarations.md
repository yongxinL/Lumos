# I008: Use Separate Global Type Declaration Files

**Category:** Technical Instinct
**Confidence:** 0.85
**Context:** TypeScript, Electron, Global Types
**Date:** 2026-01-29

## Pattern

When extending global interfaces (like `Window`), use dedicated `.d.ts` files in the appropriate scope rather than mixing with type exports in `index.ts` files.

## Reasoning

### Why It Matters

1. **Avoid Conflicts**: Multiple global declarations cause "duplicate identifier" errors
2. **Scope Clarity**: Renderer-specific globals belong in renderer directory
3. **Module Isolation**: Export files should export, declaration files should declare
4. **Build Reliability**: TypeScript compiler handles `.d.ts` files specially

### What Can Go Wrong

```typescript
// ❌ BAD: Global declarations mixed with exports
// src/types/index.ts

export interface ElectronAPI {
  send: (channel: string) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export type { Skill, Policy }; // Mixed concerns
```

Problem: If preload also declares `Window` interface, you get:

```
error TS2687: All declarations of 'electron' must have identical modifiers.
```

### Correct Approach

```typescript
// ✅ GOOD: Separate declaration file
// src/renderer/global.d.ts

import type { IPCChannel, IPCEventType } from '../types/ipc';

declare global {
  interface Window {
    api: {
      invoke: <C extends IPCChannel>(...) => Promise<...>;
      on: <E extends IPCEventType>(...) => () => void;
    };
  }
}

export {};
```

```typescript
// src/types/index.ts - Clean exports only
export type { Skill, Policy, IPCChannel };
// No global declarations here
```

## When to Apply

- ✅ Extending `Window` interface for Electron IPC
- ✅ Adding global types for third-party libraries
- ✅ Declaring module augmentations
- ✅ Extending Node.js global namespace

## When NOT to Apply

- ❌ Regular type exports (use normal export)
- ❌ Internal module types (don't need global)
- ❌ Types used only in imports (explicit import better)

## File Naming Convention

```
src/
├── renderer/
│   └── global.d.ts          # Renderer globals
├── main/
│   └── global.d.ts          # Main process globals (if needed)
└── types/
    └── index.ts             # Type exports only
```

## Evidence

From T-1.2.3 implementation:

- Initial attempt: Global declaration in `src/types/index.ts` caused conflict
- Solution: Moved to `src/renderer/global.d.ts`
- Result: All typecheck errors resolved
- Build succeeds without warnings

## Key Points

1. **One Global Scope Per File**: Don't declare globals in multiple places
2. **Use `.d.ts` Extension**: Signals TypeScript this is declaration-only
3. **Export Empty Object**: `export {}` makes it a module, not a script
4. **Import Types Only**: Use `import type` to avoid runtime dependencies

## Related Patterns

- TypeScript module vs script files
- Declaration merging in TypeScript
- Electron contextBridge type safety

---

**Tags:** #typescript #global-types #electron #type-safety #declaration-files
**Confidence:** 0.85
**Verified:** Yes (T-1.2.3)
