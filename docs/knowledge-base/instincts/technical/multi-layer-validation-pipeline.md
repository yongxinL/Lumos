# L026: Multi-Layer Validation Pipeline Architecture

**Category:** Architecture / Validation
**Confidence:** 0.95 (Software architecture pattern)
**Session:** T-3.1.3 (Constrained JSON Decoding)
**Date:** 2026-01-30

## Discovery

Production-grade JSON validation for LLM output requires **multiple validation layers**, each with different responsibilities. A pipeline architecture with clear phase boundaries enables extensibility, debugging, and auto-correction.

Single-layer validation (JSON Schema only) is insufficient for LLM-generated data because:

- **Schema validates structure**, not business logic
- **No auto-correction** when simple fixes are known
- **No extensibility** for transforms or enrichment
- **Poor debugging** when validation fails

## The Problem

Monolithic validation approaches fail for complex LLM output:

```typescript
// ❌ Bad: Single-layer validation
function validate(json: string): ActionProposal {
  const data = JSON.parse(json);

  // Schema validation
  if (!ajv.validate(schema, data)) {
    throw new Error('Invalid schema');
  }

  // Business rules scattered everywhere
  if (data.risk_level === 'high' && !data.requires_confirmation) {
    throw new Error('High risk needs confirmation'); // Should auto-correct!
  }

  if (data.operation.includes('delete') && data.reversibility !== 'IRREVERSIBLE') {
    throw new Error('Deletes must be irreversible'); // Should auto-correct!
  }

  // More scattered validation...
  // No metrics, no phases, no extensibility
  return data;
}
```

## The Solution

**Implement a multi-layer validation pipeline:**

```typescript
class ConstrainedJsonDecoder<T extends Record<string, unknown>> {
  constructor(
    private schemaId: string,
    private registry: SchemaRegistry,
    private semanticValidator: SemanticValidator<T>,
    private hooksManager: ValidationHooksManager<T>
  ) {}

  // ============================================================
  // Four-phase validation pipeline
  // ============================================================
  async decode(input: string, options?: DecodeOptions): Promise<DecodeResult<T>> {
    const startTime = Date.now();
    const metrics: ValidationMetrics = {
      parseTime: 0,
      schemaValidationTime: 0,
      semanticValidationTime: 0,
      hooksExecutionTime: 0,
      totalTime: 0,
    };

    // ============================================================
    // Phase 1: JSON Parsing
    // ============================================================
    let parseStart = Date.now();
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (error) {
      throw new DecodingError('Failed to parse JSON', input, error as Error);
    }
    metrics.parseTime = Date.now() - parseStart;

    // ============================================================
    // Phase 2: Schema Validation (structural correctness)
    // ============================================================
    let schemaStart = Date.now();
    const schemaResult = this.registry.validate(this.schemaId, parsed);
    if (!schemaResult.valid) {
      throw new SchemaValidationError('Schema validation failed', schemaResult.errors);
    }
    metrics.schemaValidationTime = Date.now() - schemaStart;

    // ============================================================
    // Phase 3: Semantic Validation (business rules + auto-correction)
    // ============================================================
    let semanticStart = Date.now();
    const semanticResult = this.semanticValidator.validate(
      parsed as T,
      options?.autoCorrect ?? this.config.defaultAutoCorrect
    );

    if (!semanticResult.valid && !semanticResult.corrected) {
      throw new SemanticValidationError('Semantic validation failed', semanticResult.errors);
    }

    // Use corrected data if available
    let data = semanticResult.corrected ? semanticResult.data : (parsed as T);
    metrics.semanticValidationTime = Date.now() - semanticStart;

    // ============================================================
    // Phase 4: Hook Execution (transforms, enrichment)
    // ============================================================
    let hooksStart = Date.now();
    const hookContext: HookContext = { metrics, schemaId: this.schemaId };

    // Execute hooks across all phases
    data = await this.hooksManager.executePhase('pre-validation', data, hookContext);
    data = await this.hooksManager.executePhase('post-schema', data, hookContext);
    data = await this.hooksManager.executePhase('post-semantic', data, hookContext);
    data = await this.hooksManager.executePhase('post-validation', data, hookContext);
    data = await this.hooksManager.executePhase('transform', data, hookContext);

    metrics.hooksExecutionTime = Date.now() - hooksStart;

    // ============================================================
    // Return result with metrics
    // ============================================================
    metrics.totalTime = Date.now() - startTime;

    return {
      success: true,
      data,
      metrics,
      corrections: semanticResult.corrections,
    };
  }
}
```

## Why This Works

**1. Clear Phase Boundaries:**

| Phase    | Responsibility              | Errors    | Auto-Correction |
| -------- | --------------------------- | --------- | --------------- |
| Parse    | JSON syntax                 | Hard fail | No              |
| Schema   | Structure (types, required) | Hard fail | No              |
| Semantic | Business rules              | Soft fail | Yes             |
| Hooks    | Transforms, enrichment      | Depends   | Depends         |

**2. Each Phase is Independent:**

```typescript
// Can run phases separately for debugging
const parsed = JSON.parse(input);
const schemaValid = registry.validate(schemaId, parsed); // Phase 2 only
const semanticValid = validator.validate(parsed); // Phase 3 only
const transformed = await hooks.execute(parsed); // Phase 4 only
```

**3. Metrics Per Phase:**

```typescript
{
  parseTime: 0.5, // JSON.parse time
  schemaValidationTime: 1.2, // AJV validation
  semanticValidationTime: 3.5, // Business rules (slowest)
  hooksExecutionTime: 2.0, // Hook execution
  totalTime: 7.2 // End-to-end
}

// Helps identify bottlenecks
if (metrics.semanticValidationTime > 10) {
  console.warn('Semantic validation slow - optimize rules');
}
```

**4. Hook Phases Enable Extension:**

Five hook phases for maximum flexibility:

```typescript
type HookPhase =
  | 'pre-validation' // Before any validation
  | 'post-schema' // After schema validation
  | 'post-semantic' // After semantic validation
  | 'post-validation' // After all validation
  | 'transform'; // Final transforms

// Example hooks
const hooks = [
  { phase: 'pre-validation', execute: normalizeWhitespace },
  { phase: 'post-schema', execute: coerceBooleans },
  { phase: 'post-semantic', execute: applyDefaults },
  { phase: 'transform', execute: addTimestamp },
];
```

**5. Auto-Correction in Semantic Phase:**

```typescript
// Semantic rules know how to fix violations
const rules: SemanticRule<ActionProposal>[] = [
  {
    id: 'high-risk-confirmation',
    validate: (data) => data.risk_level !== 'high' || data.requires_confirmation === true,
    autoCorrect: (data) => {
      if (data.risk_level === 'high') {
        return { ...data, requires_confirmation: true }; // Fix it
      }
      return data;
    },
  },
];

// Corrections are tracked
result.corrections; // [{ rule: 'high-risk-confirmation', before: false, after: true }]
```

## Pipeline Patterns

**Pattern 1: Sync Validation (Fast Path)**

```typescript
decodeSync(input: string): T {
  const parsed = JSON.parse(input);
  const schemaValid = this.registry.validate(this.schemaId, parsed);
  if (!schemaValid.valid) throw new SchemaValidationError(schemaValid.errors);

  const semanticValid = this.semanticValidator.validate(parsed as T);
  if (!semanticValid.valid) throw new SemanticValidationError(semanticValid.errors);

  return semanticValid.data;
}
```

**Pattern 2: Async Validation (With Hooks)**

```typescript
async decode(input: string): Promise<DecodeResult<T>> {
  let data = JSON.parse(input);

  // Validate
  await this.validateSchema(data);
  data = await this.validateSemantic(data);

  // Transform with async hooks
  data = await this.hooksManager.executeAll(data);

  return { success: true, data };
}
```

**Pattern 3: Validation Only (No Hooks)**

```typescript
validate(input: string): ValidationResult {
  const parsed = JSON.parse(input);
  const schemaResult = this.registry.validate(this.schemaId, parsed);
  const semanticResult = this.semanticValidator.validate(parsed as T);

  return {
    valid: schemaResult.valid && semanticResult.valid,
    errors: [...schemaResult.errors, ...semanticResult.errors],
  };
}
```

## Hook Phase Usage

**Pre-Validation Phase:**

```typescript
// Normalize input before validation
const normalizeWhitespace: ValidationHook<ActionProposal> = {
  id: 'normalize-whitespace',
  phase: 'pre-validation',
  priority: 1, // Run first
  execute: (data) => ({
    ...data,
    intent: data.intent?.trim(),
    operation: data.operation?.trim(),
  }),
};
```

**Post-Schema Phase:**

```typescript
// Type coercion after schema validation
const coerceBooleans: ValidationHook<ActionProposal> = {
  id: 'coerce-booleans',
  phase: 'post-schema',
  priority: 10,
  execute: (data) => ({
    ...data,
    requires_confirmation: Boolean(data.requires_confirmation),
    is_reversible: Boolean(data.is_reversible),
  }),
};
```

**Post-Semantic Phase:**

```typescript
// Apply defaults after semantic validation
const ensureDefaults: ValidationHook<ActionProposal> = {
  id: 'ensure-defaults',
  phase: 'post-semantic',
  priority: 20,
  execute: (data) => ({
    ...data,
    metadata: data.metadata || {},
    tags: data.tags || [],
  }),
};
```

**Transform Phase:**

```typescript
// Final transforms (timestamps, IDs)
const addMetadata: ValidationHook<ActionProposal> = {
  id: 'add-metadata',
  phase: 'transform',
  priority: 100,
  execute: (data) => ({
    ...data,
    id: uuid(),
    timestamp: new Date().toISOString(),
  }),
};
```

## Testing Pipelines

```typescript
describe('Validation Pipeline', () => {
  let decoder: ConstrainedJsonDecoder<ActionProposal>;

  beforeEach(() => {
    const registry = new SchemaRegistry();
    const validator = new SemanticValidator(actionProposalRules);
    const hooks = new ValidationHooksManager<ActionProposal>();

    decoder = new ConstrainedJsonDecoder('action-proposal', registry, validator, hooks);
  });

  it('should pass all phases for valid data', async () => {
    const input = JSON.stringify({
      intent: 'Create ticket',
      operation: 'incident:create',
      confidence: 0.95,
      risk_level: 'low',
      requires_confirmation: false,
    });

    const result = await decoder.decode(input);

    expect(result.success).toBe(true);
    expect(result.metrics.totalTime).toBeLessThan(100); // Fast
    expect(result.corrections).toHaveLength(0); // No corrections
  });

  it('should auto-correct in semantic phase', async () => {
    const input = JSON.stringify({
      intent: 'Delete database',
      operation: 'database:delete',
      confidence: 0.95,
      risk_level: 'high',
      requires_confirmation: false, // Should be corrected to true
    });

    const result = await decoder.decode(input, { autoCorrect: true });

    expect(result.success).toBe(true);
    expect(result.data.requires_confirmation).toBe(true); // Corrected
    expect(result.corrections).toHaveLength(1);
    expect(result.corrections[0].rule).toBe('high-risk-confirmation');
  });

  it('should track metrics per phase', async () => {
    const result = await decoder.decode(validInput);

    expect(result.metrics).toMatchObject({
      parseTime: expect.any(Number),
      schemaValidationTime: expect.any(Number),
      semanticValidationTime: expect.any(Number),
      hooksExecutionTime: expect.any(Number),
      totalTime: expect.any(Number),
    });
  });
});
```

## Anti-Patterns

❌ **Bad:** Monolithic validation

```typescript
function validate(data: unknown): ActionProposal {
  // Everything in one function
  if (!data || typeof data !== 'object') throw new Error('Invalid');
  if (!('intent' in data)) throw new Error('Missing intent');
  if (data.risk_level === 'high' && !data.requires_confirmation) {
    data.requires_confirmation = true; // Implicit correction
  }
  // 100+ lines of validation logic
  return data as ActionProposal;
}
```

✅ **Good:** Layered pipeline

```typescript
const result = await decoder.decode(input);
// Clear phases, metrics, corrections tracked
```

❌ **Bad:** No metrics

```typescript
function validate(data: unknown): ActionProposal {
  // No idea how long validation took
  // No visibility into bottlenecks
  return validateAll(data);
}
```

✅ **Good:** Per-phase metrics

```typescript
const result = await decoder.decode(input);
console.log(result.metrics); // See which phase is slow
```

❌ **Bad:** Hard-coded transforms

```typescript
function validate(data: ActionProposal): ActionProposal {
  // Transforms mixed with validation
  data.id = uuid();
  data.timestamp = new Date();
  // Can't disable, can't extend
  return data;
}
```

✅ **Good:** Hook-based transforms

```typescript
hooks.register({
  phase: 'transform',
  execute: (data) => ({ ...data, id: uuid() }),
});
```

## See Also

- [L025: Custom AJV Keywords for Cross-Field Dependencies](custom-ajv-keywords-cross-field.md)
- [L027: Schema Registry with Ollama Compatibility](schema-registry-ollama-compatibility.md)
- [L028: Semantic Validation Rules with Auto-Correction](semantic-rules-auto-correction.md)
- [L029: Validation Hooks for Extensibility](validation-hooks-extensibility.md)
- Implementation: `src/main/services/ai/constrainedDecoder/constrainedJsonDecoder.ts`
