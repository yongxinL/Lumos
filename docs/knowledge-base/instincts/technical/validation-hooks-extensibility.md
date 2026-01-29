# L029: Validation Hooks for Extensibility

**Category:** Architecture / Extensibility
**Confidence:** 0.95 (Plugin architecture pattern)
**Session:** T-3.1.3 (Constrained JSON Decoding)
**Date:** 2026-01-30

## Discovery

A **hook-based validation system** enables external code to participate in the validation pipeline without modifying core logic. Hooks can be sync or async, with execution at defined phases.

This pattern provides:

- **Extensibility** - Add new behavior without changing core code
- **Composability** - Combine multiple hooks in any order
- **Testability** - Test hooks in isolation
- **Debuggability** - Clear execution order and timing

## The Problem

Hard-coded transforms and validations make the system inflexible:

```typescript
// ❌ Bad: Hard-coded transforms
function decode(input: string): ActionProposal {
  let data = JSON.parse(input);

  // Validate schema
  validateSchema(data);

  // Hard-coded transforms (can't disable, can't extend)
  data.intent = data.intent.trim();
  data.operation = data.operation.toLowerCase();
  data.id = uuid(); // Always added
  data.timestamp = new Date(); // Always added

  // Validate business rules
  validateBusinessRules(data);

  // More hard-coded transforms
  if (!data.metadata) {
    data.metadata = {};
  }

  return data;
}

// Problems:
// - Can't add new transforms without modifying core code
// - Can't disable transforms for testing
// - Can't control execution order
// - No visibility into what happened when
```

## The Solution

**Implement a hook-based system with defined phases:**

```typescript
// ============================================================
// Hook Phase Definitions
// ============================================================
type HookPhase =
  | 'pre-validation' // Before any validation
  | 'post-schema' // After schema validation
  | 'post-semantic' // After semantic validation
  | 'post-validation' // After all validation
  | 'transform'; // Final transforms

// ============================================================
// Hook Interface
// ============================================================
interface ValidationHook<T> {
  id: string; // Unique hook ID
  description: string; // Human-readable description
  phase: HookPhase; // When to execute
  priority: number; // Execution order (lower = earlier)
  execute: (data: T, context: HookContext) => T | Promise<T>; // Sync or async
}

// ============================================================
// Hook Context (passed to all hooks)
// ============================================================
interface HookContext {
  metrics: ValidationMetrics; // Performance metrics
  schemaId: string; // Schema being validated
  metadata?: Record<string, unknown>; // Custom metadata
}

// ============================================================
// Hook Execution Result
// ============================================================
interface HookExecutionResult {
  hookId: string;
  phase: HookPhase;
  executionTime: number; // ms
  success: boolean;
  error?: Error;
}

// ============================================================
// Validation Hooks Manager
// ============================================================
class ValidationHooksManager<T extends Record<string, unknown>> {
  private hooks: ValidationHook<T>[] = [];

  // Register a hook
  register(hook: ValidationHook<T>): void {
    this.hooks.push(hook);
    // Sort by priority
    this.hooks.sort((a, b) => a.priority - b.priority);
  }

  // Unregister a hook
  unregister(hookId: string): void {
    this.hooks = this.hooks.filter((h) => h.id !== hookId);
  }

  // Execute all hooks for a specific phase
  async executePhase(phase: HookPhase, data: T, context: HookContext): Promise<T> {
    const phaseHooks = this.hooks.filter((h) => h.phase === phase);

    let current = data;
    for (const hook of phaseHooks) {
      const startTime = Date.now();

      try {
        // Execute hook (supports sync and async)
        current = await hook.execute(current, context);

        // Track execution time
        const executionTime = Date.now() - startTime;
        console.debug(`[Hook] ${hook.id} completed in ${executionTime}ms`);
      } catch (error) {
        throw new ValidationHookError(
          `Hook execution failed: ${hook.id}`,
          hook.id,
          phase,
          error as Error
        );
      }
    }

    return current;
  }

  // Execute all hooks across all phases
  async executeAll(data: T, context: HookContext): Promise<T> {
    let current = data;

    // Execute in phase order
    const phases: HookPhase[] = [
      'pre-validation',
      'post-schema',
      'post-semantic',
      'post-validation',
      'transform',
    ];

    for (const phase of phases) {
      current = await this.executePhase(phase, current, context);
    }

    return current;
  }
}
```

## Why This Works

**1. Clear Phase Definitions:**

| Phase             | Purpose                             | Typical Hooks                      |
| ----------------- | ----------------------------------- | ---------------------------------- |
| `pre-validation`  | Normalize input before validation   | Trim whitespace, lowercase strings |
| `post-schema`     | Type coercion after schema check    | Boolean coercion, number parsing   |
| `post-semantic`   | Apply defaults after business rules | Default values, fallbacks          |
| `post-validation` | Enrichment after all validation     | Add computed fields                |
| `transform`       | Final transforms                    | Add timestamps, UUIDs              |

**2. Priority Ordering:**

```typescript
// Lower priority = earlier execution
const hooks = [
  { id: 'normalize', priority: 1, execute: normalizeWhitespace },
  { id: 'lowercase', priority: 10, execute: lowercaseOperation },
  { id: 'defaults', priority: 100, execute: ensureDefaults },
];

// Execution order: normalize → lowercase → defaults
```

**3. Sync and Async Support:**

```typescript
// Sync hook
const syncHook: ValidationHook<ActionProposal> = {
  id: 'normalize-whitespace',
  execute: (data) => ({
    ...data,
    intent: data.intent.trim(),
  }),
};

// Async hook
const asyncHook: ValidationHook<ActionProposal> = {
  id: 'validate-reference',
  execute: async (data) => {
    const valid = await checkEntityExists(data.target_entity_id);
    if (!valid) throw new Error('Entity not found');
    return data;
  },
};

// Manager handles both
await manager.executePhase('pre-validation', data, context);
```

**4. Context Sharing:**

```typescript
const context: HookContext = {
  metrics: validationMetrics,
  schemaId: 'action-proposal',
  metadata: { userId: '123', source: 'llm' },
};

// Hooks can access context
const hook: ValidationHook<ActionProposal> = {
  execute: (data, context) => {
    console.log(`Processing schema: ${context.schemaId}`);
    return data;
  },
};
```

## Common Hook Patterns

**Pattern 1: Normalization (pre-validation)**

```typescript
const normalizeWhitespace: ValidationHook<ActionProposal> = {
  id: 'normalize-whitespace',
  description: 'Trim whitespace from string fields',
  phase: 'pre-validation',
  priority: 1,
  execute: (data) => ({
    ...data,
    intent: data.intent?.trim(),
    operation: data.operation?.trim(),
  }),
};
```

**Pattern 2: Type Coercion (post-schema)**

```typescript
const coerceBooleans: ValidationHook<ActionProposal> = {
  id: 'coerce-booleans',
  description: 'Coerce boolean-like values to actual booleans',
  phase: 'post-schema',
  priority: 10,
  execute: (data) => ({
    ...data,
    requires_confirmation: Boolean(data.requires_confirmation),
    is_reversible: Boolean(data.is_reversible),
  }),
};
```

**Pattern 3: Apply Defaults (post-semantic)**

```typescript
const ensureDefaults: ValidationHook<ActionProposal> = {
  id: 'ensure-defaults',
  description: 'Ensure default values for optional fields',
  phase: 'post-semantic',
  priority: 20,
  execute: (data) => ({
    ...data,
    metadata: data.metadata || {},
    tags: data.tags || [],
    priority: data.priority || 'medium',
  }),
};
```

**Pattern 4: Entity Reference Validation (post-validation)**

```typescript
const validateReferences: ValidationHook<ActionProposal> = {
  id: 'validate-references',
  description: 'Validate entity references exist',
  phase: 'post-validation',
  priority: 30,
  execute: async (data) => {
    if (data.target_entity_id) {
      const exists = await checkEntityExists(data.target_entity_id);
      if (!exists) {
        throw new Error(`Entity not found: ${data.target_entity_id}`);
      }
    }
    return data;
  },
};
```

**Pattern 5: Add Metadata (transform)**

```typescript
const addMetadata: ValidationHook<ActionProposal> = {
  id: 'add-metadata',
  description: 'Add system-generated metadata',
  phase: 'transform',
  priority: 100,
  execute: (data, context) => ({
    ...data,
    id: uuid(),
    timestamp: new Date().toISOString(),
    schema_version: '1.0.0',
    processed_by: context.schemaId,
  }),
};
```

## Usage Examples

**Example 1: Register Pre-Built Hooks**

```typescript
import { createActionProposalHooks } from '@/services/ai/constrainedDecoder';

const manager = new ValidationHooksManager<ActionProposal>();

// Register all pre-built hooks
const hooks = createActionProposalHooks();
hooks.forEach((hook) => manager.register(hook));

// Use in pipeline
const result = await manager.executeAll(data, context);
```

**Example 2: Register Custom Hook**

```typescript
const customHook: ValidationHook<ActionProposal> = {
  id: 'custom-transform',
  description: 'Custom business logic',
  phase: 'post-validation',
  priority: 50,
  execute: (data) => {
    // Custom logic
    return { ...data, customField: 'value' };
  },
};

manager.register(customHook);
```

**Example 3: Conditional Hook Execution**

```typescript
const conditionalHook: ValidationHook<ActionProposal> = {
  id: 'conditional-transform',
  phase: 'transform',
  priority: 90,
  execute: (data, context) => {
    // Only execute for certain schemas
    if (context.schemaId === 'action-proposal-enhanced') {
      return { ...data, enhanced: true };
    }
    return data;
  },
};
```

**Example 4: Error Handling in Hooks**

```typescript
const errorHandlingHook: ValidationHook<ActionProposal> = {
  id: 'risky-operation',
  phase: 'post-validation',
  priority: 40,
  execute: async (data) => {
    try {
      await performRiskyOperation(data);
      return data;
    } catch (error) {
      console.error(`Hook failed: ${error}`);
      throw new ValidationHookError(
        'Risky operation failed',
        'risky-operation',
        'post-validation',
        error as Error
      );
    }
  },
};
```

## Testing Hooks

```typescript
describe('ValidationHooksManager', () => {
  let manager: ValidationHooksManager<ActionProposal>;

  beforeEach(() => {
    manager = new ValidationHooksManager();
  });

  it('should execute hooks in priority order', async () => {
    const executionOrder: string[] = [];

    manager.register({
      id: 'hook-3',
      phase: 'pre-validation',
      priority: 30,
      execute: (data) => {
        executionOrder.push('hook-3');
        return data;
      },
    });

    manager.register({
      id: 'hook-1',
      phase: 'pre-validation',
      priority: 10,
      execute: (data) => {
        executionOrder.push('hook-1');
        return data;
      },
    });

    manager.register({
      id: 'hook-2',
      phase: 'pre-validation',
      priority: 20,
      execute: (data) => {
        executionOrder.push('hook-2');
        return data;
      },
    });

    await manager.executePhase('pre-validation', {} as ActionProposal, {} as HookContext);

    expect(executionOrder).toEqual(['hook-1', 'hook-2', 'hook-3']);
  });

  it('should support async hooks', async () => {
    manager.register({
      id: 'async-hook',
      phase: 'post-validation',
      priority: 10,
      execute: async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { ...data, asyncProcessed: true };
      },
    });

    const result = await manager.executePhase(
      'post-validation',
      {} as ActionProposal,
      {} as HookContext
    );

    expect(result.asyncProcessed).toBe(true);
  });

  it('should throw on hook error', async () => {
    manager.register({
      id: 'failing-hook',
      phase: 'transform',
      priority: 10,
      execute: () => {
        throw new Error('Hook failed');
      },
    });

    await expect(
      manager.executePhase('transform', {} as ActionProposal, {} as HookContext)
    ).rejects.toThrow(ValidationHookError);
  });
});
```

## Anti-Patterns

❌ **Bad:** Hard-coded transforms

```typescript
function decode(data: ActionProposal) {
  // Can't disable, can't extend
  data.id = uuid();
  data.timestamp = new Date();
  return data;
}
```

✅ **Good:** Hook-based transforms

```typescript
manager.register({
  id: 'add-id',
  phase: 'transform',
  execute: (data) => ({ ...data, id: uuid() }),
});
```

❌ **Bad:** No priority ordering

```typescript
// Hooks execute in registration order (unpredictable)
manager.register(hookA);
manager.register(hookB);
```

✅ **Good:** Explicit priorities

```typescript
manager.register({ ...hookA, priority: 10 });
manager.register({ ...hookB, priority: 20 });
```

❌ **Bad:** Mutating data

```typescript
execute: (data) => {
  data.field = 'value'; // ❌ Mutation
  return data;
};
```

✅ **Good:** Immutable updates

```typescript
execute: (data) => ({ ...data, field: 'value' }); // ✅ New object
```

❌ **Bad:** Ignoring context

```typescript
execute: (data) => {
  // Missing opportunity to use context
  return data;
};
```

✅ **Good:** Using context

```typescript
execute: (data, context) => {
  console.log(`Processing ${context.schemaId}`);
  return { ...data, processedBy: context.schemaId };
};
```

## See Also

- [L026: Multi-Layer Validation Pipeline Architecture](multi-layer-validation-pipeline.md)
- [L028: Semantic Validation Rules with Auto-Correction](semantic-rules-auto-correction.md)
- Implementation: `src/main/services/ai/constrainedDecoder/validationHooks.ts`
- Plugin Architecture Pattern: https://en.wikipedia.org/wiki/Plug-in_(computing)
