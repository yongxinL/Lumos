/**
 * Validation Hooks System for Constrained JSON Decoding
 *
 * Provides an extensible hook system that allows:
 * - Pre-validation transforms (normalize data before validation)
 * - Post-validation transforms (enrich data after validation)
 * - Custom validation logic (domain-specific checks)
 * - Async validation support (external service checks)
 *
 * Hook Lifecycle:
 * 1. Pre-validation hooks (transform raw input)
 * 2. Schema validation (AJV)
 * 3. Post-schema hooks (after schema validation, before semantic)
 * 4. Semantic validation
 * 5. Post-validation hooks (final transforms)
 */

import { ValidationHookError } from './errors';

/**
 * Hook phase identifiers
 */
export type HookPhase =
  | 'pre-validation'
  | 'post-schema'
  | 'post-semantic'
  | 'post-validation'
  | 'transform';

/**
 * Hook execution context
 */
export interface HookContext<T = unknown> {
  /** Current data being validated */
  data: T;
  /** Schema ID being validated against */
  schemaId: string;
  /** Current validation phase */
  phase: HookPhase;
  /** Validation metadata */
  metadata: Record<string, unknown>;
  /** Previous hook results */
  previousHookResults: Map<string, unknown>;
  /** Add a warning (non-fatal) */
  addWarning: (message: string) => void;
  /** Add metadata for subsequent hooks */
  setMetadata: (key: string, value: unknown) => void;
}

/**
 * Synchronous validation hook
 */
export interface SyncValidationHook<T = unknown> {
  /** Unique hook identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what the hook does */
  description: string;
  /** Phase when this hook runs */
  phase: HookPhase;
  /** Priority (lower runs first) */
  priority: number;
  /** Synchronous execution function */
  execute: (context: HookContext<T>) => T | void;
  /** Whether hook is enabled */
  enabled: boolean;
}

/**
 * Asynchronous validation hook
 */
export interface AsyncValidationHook<T = unknown> {
  /** Unique hook identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what the hook does */
  description: string;
  /** Phase when this hook runs */
  phase: HookPhase;
  /** Priority (lower runs first) */
  priority: number;
  /** Asynchronous execution function */
  executeAsync: (context: HookContext<T>) => Promise<T | void>;
  /** Whether hook is enabled */
  enabled: boolean;
  /** Timeout in milliseconds (default: 5000) */
  timeoutMs?: number;
}

/**
 * Union type for both hook types
 */
export type ValidationHook<T = unknown> = SyncValidationHook<T> | AsyncValidationHook<T>;

/**
 * Check if hook is async
 */
function isAsyncHook<T>(hook: ValidationHook<T>): hook is AsyncValidationHook<T> {
  return 'executeAsync' in hook;
}

/**
 * Hook execution result
 */
export interface HookExecutionResult<T = unknown> {
  /** Final data after all hooks */
  data: T;
  /** Hooks that were executed */
  executedHooks: string[];
  /** Hooks that were skipped (disabled) */
  skippedHooks: string[];
  /** Warnings collected during execution */
  warnings: string[];
  /** Metadata collected during execution */
  metadata: Record<string, unknown>;
  /** Total execution time in milliseconds */
  durationMs: number;
}

/**
 * Validation Hooks Manager
 *
 * Manages registration and execution of validation hooks
 */
export class ValidationHooksManager<T = unknown> {
  private hooks: Map<string, ValidationHook<T>> = new Map();
  private phaseHooks: Map<HookPhase, string[]> = new Map([
    ['pre-validation', []],
    ['post-schema', []],
    ['post-semantic', []],
    ['post-validation', []],
    ['transform', []],
  ]);

  /**
   * Register a hook
   */
  register(hook: ValidationHook<T>): this {
    if (this.hooks.has(hook.id)) {
      throw new Error(`Hook with id '${hook.id}' already registered`);
    }

    this.hooks.set(hook.id, hook);

    // Add to phase list and sort by priority
    const phaseList = this.phaseHooks.get(hook.phase)!;
    phaseList.push(hook.id);
    phaseList.sort((a, b) => {
      const hookA = this.hooks.get(a)!;
      const hookB = this.hooks.get(b)!;
      return hookA.priority - hookB.priority;
    });

    return this;
  }

  /**
   * Unregister a hook
   */
  unregister(hookId: string): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;

    this.hooks.delete(hookId);

    const phaseList = this.phaseHooks.get(hook.phase)!;
    const index = phaseList.indexOf(hookId);
    if (index !== -1) {
      phaseList.splice(index, 1);
    }

    return true;
  }

  /**
   * Enable/disable a hook
   */
  setEnabled(hookId: string, enabled: boolean): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;

    hook.enabled = enabled;
    return true;
  }

  /**
   * Get all hooks for a phase
   */
  getHooksForPhase(phase: HookPhase): ValidationHook<T>[] {
    const hookIds = this.phaseHooks.get(phase) || [];
    return hookIds.map((id) => this.hooks.get(id)!);
  }

  /**
   * Execute all hooks for a phase synchronously
   */
  executePhase(
    phase: HookPhase,
    data: T,
    schemaId: string,
    metadata: Record<string, unknown> = {}
  ): HookExecutionResult<T> {
    const startTime = Date.now();
    const result: HookExecutionResult<T> = {
      data,
      executedHooks: [],
      skippedHooks: [],
      warnings: [],
      metadata: { ...metadata },
      durationMs: 0,
    };

    const hookIds = this.phaseHooks.get(phase) || [];
    const previousHookResults = new Map<string, unknown>();

    for (const hookId of hookIds) {
      const hook = this.hooks.get(hookId)!;

      if (!hook.enabled) {
        result.skippedHooks.push(hookId);
        continue;
      }

      if (isAsyncHook(hook)) {
        // Skip async hooks in sync execution
        result.skippedHooks.push(hookId);
        continue;
      }

      const context: HookContext<T> = {
        data: result.data,
        schemaId,
        phase,
        metadata: result.metadata,
        previousHookResults,
        addWarning: (message) => result.warnings.push(`[${hookId}] ${message}`),
        setMetadata: (key, value) => {
          result.metadata[key] = value;
        },
      };

      try {
        const hookResult = hook.execute(context);
        if (hookResult !== undefined) {
          result.data = hookResult;
        }
        result.executedHooks.push(hookId);
        previousHookResults.set(hookId, hookResult);
      } catch (error) {
        throw new ValidationHookError(
          `Hook '${hookId}' failed: ${error instanceof Error ? error.message : String(error)}`,
          hookId,
          phase,
          error instanceof Error ? error : undefined
        );
      }
    }

    result.durationMs = Date.now() - startTime;
    return result;
  }

  /**
   * Execute all hooks for a phase asynchronously
   */
  async executePhaseAsync(
    phase: HookPhase,
    data: T,
    schemaId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<HookExecutionResult<T>> {
    const startTime = Date.now();
    const result: HookExecutionResult<T> = {
      data,
      executedHooks: [],
      skippedHooks: [],
      warnings: [],
      metadata: { ...metadata },
      durationMs: 0,
    };

    const hookIds = this.phaseHooks.get(phase) || [];
    const previousHookResults = new Map<string, unknown>();

    for (const hookId of hookIds) {
      const hook = this.hooks.get(hookId)!;

      if (!hook.enabled) {
        result.skippedHooks.push(hookId);
        continue;
      }

      const context: HookContext<T> = {
        data: result.data,
        schemaId,
        phase,
        metadata: result.metadata,
        previousHookResults,
        addWarning: (message) => result.warnings.push(`[${hookId}] ${message}`),
        setMetadata: (key, value) => {
          result.metadata[key] = value;
        },
      };

      try {
        let hookResult: T | void;

        if (isAsyncHook(hook)) {
          const timeoutMs = hook.timeoutMs || 5000;
          hookResult = await Promise.race([
            hook.executeAsync(context),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Hook timeout after ${timeoutMs}ms`)), timeoutMs)
            ),
          ]);
        } else {
          hookResult = hook.execute(context);
        }

        if (hookResult !== undefined) {
          result.data = hookResult;
        }
        result.executedHooks.push(hookId);
        previousHookResults.set(hookId, hookResult);
      } catch (error) {
        throw new ValidationHookError(
          `Hook '${hookId}' failed: ${error instanceof Error ? error.message : String(error)}`,
          hookId,
          phase,
          error instanceof Error ? error : undefined
        );
      }
    }

    result.durationMs = Date.now() - startTime;
    return result;
  }

  /**
   * Get all registered hooks
   */
  getAllHooks(): ValidationHook<T>[] {
    return Array.from(this.hooks.values());
  }

  /**
   * Get hook by ID
   */
  getHook(hookId: string): ValidationHook<T> | undefined {
    return this.hooks.get(hookId);
  }

  /**
   * Check if a hook is registered
   */
  hasHook(hookId: string): boolean {
    return this.hooks.has(hookId);
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
    for (const phase of this.phaseHooks.keys()) {
      this.phaseHooks.set(phase, []);
    }
  }
}

// ============================================================================
// Pre-built Hooks for ActionProposal
// ============================================================================

/**
 * Create standard hooks for ActionProposal validation
 */
export function createActionProposalHooks(): ValidationHook<Record<string, unknown>>[] {
  return [
    // Pre-validation: Normalize whitespace in string fields
    {
      id: 'normalize-whitespace',
      name: 'Normalize Whitespace',
      description: 'Trim and normalize whitespace in string fields',
      phase: 'pre-validation',
      priority: 10,
      enabled: true,
      execute: (context) => {
        const data = { ...context.data };

        for (const [key, value] of Object.entries(data)) {
          if (typeof value === 'string') {
            data[key] = value.trim().replace(/\s+/g, ' ');
          }
        }

        return data;
      },
    },

    // Pre-validation: Lowercase operation
    {
      id: 'lowercase-operation',
      name: 'Lowercase Operation',
      description: 'Convert operation to lowercase',
      phase: 'pre-validation',
      priority: 20,
      enabled: true,
      execute: (context) => {
        if (typeof context.data.operation === 'string') {
          return {
            ...context.data,
            operation: context.data.operation.toLowerCase(),
          };
        }
        return context.data;
      },
    },

    // Pre-validation: Ensure boolean types
    {
      id: 'coerce-booleans',
      name: 'Coerce Booleans',
      description: 'Convert truthy/falsy values to proper booleans',
      phase: 'pre-validation',
      priority: 30,
      enabled: true,
      execute: (context) => {
        const data = { ...context.data };

        if ('requires_confirmation' in data) {
          data.requires_confirmation = Boolean(data.requires_confirmation);
        }

        return data;
      },
    },

    // Post-schema: Add timestamp metadata
    {
      id: 'add-validation-timestamp',
      name: 'Add Validation Timestamp',
      description: 'Record when validation occurred',
      phase: 'post-schema',
      priority: 10,
      enabled: true,
      execute: (context) => {
        context.setMetadata('validatedAt', new Date().toISOString());
        context.setMetadata('schemaId', context.schemaId);
      },
    },

    // Post-semantic: Log warnings for low confidence
    {
      id: 'log-low-confidence',
      name: 'Log Low Confidence',
      description: 'Add warning for low confidence proposals',
      phase: 'post-semantic',
      priority: 10,
      enabled: true,
      execute: (context) => {
        const confidence = context.data.confidence;
        if (typeof confidence === 'number' && confidence < 0.5) {
          context.addWarning(
            `Low confidence (${confidence.toFixed(2)}): Consider reviewing this proposal carefully`
          );
        }
      },
    },

    // Post-validation: Calculate validation score
    {
      id: 'calculate-validation-score',
      name: 'Calculate Validation Score',
      description: 'Compute overall validation quality score',
      phase: 'post-validation',
      priority: 100,
      enabled: true,
      execute: (context) => {
        let score = 100;
        const factors: string[] = [];

        // Deduct for low confidence
        const confidence = context.data.confidence;
        if (typeof confidence === 'number') {
          if (confidence < 0.5) {
            score -= 30;
            factors.push('low confidence');
          } else if (confidence < 0.7) {
            score -= 15;
            factors.push('moderate confidence');
          }
        }

        // Deduct for high risk without confirmation
        if (context.data.risk_level === 'high' && context.data.requires_confirmation !== true) {
          score -= 20;
          factors.push('high risk without confirmation');
        }

        // Deduct for short intent
        const intent = String(context.data.intent || '');
        if (intent.length < 20) {
          score -= 10;
          factors.push('brief intent');
        }

        context.setMetadata('validationScore', Math.max(0, score));
        context.setMetadata('validationFactors', factors);

        if (score < 70) {
          context.addWarning(`Validation score is ${score}/100 (factors: ${factors.join(', ')})`);
        }
      },
    },
  ];
}

/**
 * Create a pre-configured ValidationHooksManager for ActionProposal
 */
export function createActionProposalHooksManager(): ValidationHooksManager<
  Record<string, unknown>
> {
  const manager = new ValidationHooksManager<Record<string, unknown>>();

  for (const hook of createActionProposalHooks()) {
    manager.register(hook);
  }

  return manager;
}
