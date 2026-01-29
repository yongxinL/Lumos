# L028: Semantic Validation Rules with Auto-Correction

**Category:** Validation / Business Logic
**Confidence:** 0.95 (Validation pattern)
**Session:** T-3.1.3 (Constrained JSON Decoding)
**Date:** 2026-01-30

## Discovery

Business rules often have **deterministic fixes** when violated. Encoding auto-correction logic into semantic validation rules enables graceful handling of LLM output inconsistencies **without failing validation**.

This is critical for LLM-generated JSON because:

- LLMs may not perfectly follow all business rules
- Some violations have obvious fixes (e.g., high-risk operations must require confirmation)
- Failing validation wastes LLM tokens and time
- Auto-correction improves user experience

## The Problem

Hard-failing validation rejects fixable LLM output:

```typescript
// ❌ Bad: Hard fail for correctable violations
function validate(data: ActionProposal): ActionProposal {
  // LLM generated high-risk operation without confirmation
  if (data.risk_level === 'high' && !data.requires_confirmation) {
    throw new Error('High-risk operations must require confirmation');
    // Could have been auto-corrected to true!
  }

  // LLM marked delete as REVERSIBLE
  if (data.operation.includes('delete') && data.reversibility !== 'IRREVERSIBLE') {
    throw new Error('Delete operations must be irreversible');
    // Could have been auto-corrected to IRREVERSIBLE!
  }

  // Wasted LLM generation, need to retry
  return data;
}
```

## The Solution

**Implement semantic rules with optional auto-correction:**

```typescript
// ============================================================
// Semantic Rule Interface
// ============================================================
interface SemanticRule<T> {
  id: string; // Unique rule ID
  description: string; // Human-readable description
  severity: 'error' | 'warning'; // Error = hard fail, Warning = log only
  validate: (data: T) => boolean; // Returns true if valid
  autoCorrect?: (data: T) => T; // Optional auto-correction function
}

// ============================================================
// Example Rules with Auto-Correction
// ============================================================
const highRiskConfirmationRule: SemanticRule<ActionProposal> = {
  id: 'high-risk-confirmation',
  description: 'High-risk operations must require confirmation',
  severity: 'error',
  validate: (data) => {
    // Valid if: not high risk, OR high risk with confirmation
    return data.risk_level !== 'high' || data.requires_confirmation === true;
  },
  autoCorrect: (data) => {
    if (data.risk_level === 'high' && !data.requires_confirmation) {
      return { ...data, requires_confirmation: true }; // Fix it
    }
    return data; // Already valid
  },
};

const deleteRiskLevelRule: SemanticRule<ActionProposal> = {
  id: 'delete-risk-level',
  description: 'Delete operations must be high risk',
  severity: 'error',
  validate: (data) => {
    if (data.operation.includes('delete')) {
      return data.risk_level === 'high';
    }
    return true; // Not a delete, rule doesn't apply
  },
  autoCorrect: (data) => {
    if (data.operation.includes('delete') && data.risk_level !== 'high') {
      return {
        ...data,
        risk_level: 'high',
        reversibility: 'IRREVERSIBLE', // Also fix reversibility
        requires_confirmation: true, // And confirmation
      };
    }
    return data;
  },
};

// ============================================================
// Semantic Validator
// ============================================================
class SemanticValidator<T extends Record<string, unknown>> {
  constructor(private rules: SemanticRule<T>[]) {}

  validate(data: T, autoCorrect: boolean = false): ValidationResult<T> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const corrections: CorrectionRecord[] = [];
    let correctedData = { ...data };

    for (const rule of this.rules) {
      const isValid = rule.validate(correctedData);

      if (!isValid) {
        if (rule.severity === 'error') {
          // Try auto-correction if enabled
          if (autoCorrect && rule.autoCorrect) {
            const before = correctedData[rule.id]; // Track before value
            correctedData = rule.autoCorrect(correctedData);
            const after = correctedData[rule.id]; // Track after value

            // Record correction
            corrections.push({
              rule: rule.id,
              description: rule.description,
              before,
              after,
            });

            console.warn(`[Auto-Corrected] ${rule.description}`);
          } else {
            errors.push(`${rule.id}: ${rule.description}`);
          }
        } else {
          warnings.push(`${rule.id}: ${rule.description}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      corrected: corrections.length > 0,
      data: correctedData,
      errors,
      warnings,
      corrections,
    };
  }
}

// ============================================================
// Factory for ActionProposal Rules
// ============================================================
export function createActionProposalRules(): SemanticRule<ActionProposal>[] {
  return [
    highRiskConfirmationRule,
    deleteRiskLevelRule,
    confidenceRangeRule,
    operationFormatRule,
    // ... 10 more rules
  ];
}

export function createActionProposalValidator(): SemanticValidator<ActionProposal> {
  return new SemanticValidator(createActionProposalRules());
}
```

## Why This Works

**1. Separation of Validation and Correction:**

```typescript
// Validate: Check if rule is satisfied
validate: (data) => data.risk_level !== 'high' || data.requires_confirmation === true;

// Auto-Correct: Fix the violation (optional)
autoCorrect: (data) => ({ ...data, requires_confirmation: true });
```

**2. Immutability:**

```typescript
// ✅ Return new object (immutable)
autoCorrect: (data) => ({ ...data, requires_confirmation: true });

// ❌ Mutate original (bad)
autoCorrect: (data) => {
  data.requires_confirmation = true;
  return data;
};
```

**3. Correction Tracking:**

```typescript
interface CorrectionRecord {
  rule: string; // Rule ID that triggered correction
  description: string; // Human-readable description
  before: unknown; // Value before correction
  after: unknown; // Value after correction
}

// Example corrections array
[
  {
    rule: 'high-risk-confirmation',
    description: 'High-risk operations must require confirmation',
    before: false,
    after: true,
  },
  {
    rule: 'delete-reversibility',
    description: 'Delete operations must be irreversible',
    before: 'PARTIAL',
    after: 'IRREVERSIBLE',
  },
];
```

**4. Severity Levels:**

| Severity  | Behavior              | Auto-Correction | Use Case                    |
| --------- | --------------------- | --------------- | --------------------------- |
| `error`   | Fail if not corrected | Optional        | Critical business rules     |
| `warning` | Log but continue      | Not needed      | Best practices, suggestions |

**5. Optional Auto-Correction:**

```typescript
// Some rules can't be auto-corrected
const intentLengthRule: SemanticRule<ActionProposal> = {
  id: 'intent-length',
  description: 'Intent must be at least 5 characters',
  severity: 'error',
  validate: (data) => data.intent.length >= 5,
  // No autoCorrect - can't fix automatically
};

// Some rules have auto-correction
const deleteReversibilityRule: SemanticRule<ActionProposal> = {
  id: 'delete-reversibility',
  description: 'Delete operations must be irreversible',
  severity: 'error',
  validate: (data) => !data.operation.includes('delete') || data.reversibility === 'IRREVERSIBLE',
  autoCorrect: (data) => ({ ...data, reversibility: 'IRREVERSIBLE' }), // Can fix
};
```

## Common Rule Patterns

**Pattern 1: Conditional Rule (applies only when...)**

```typescript
const readConfirmationRule: SemanticRule<ActionProposal> = {
  id: 'read-confirmation',
  description: 'Read operations should not require confirmation',
  severity: 'warning', // Warning, not error
  validate: (data) => {
    // Only applies to read operations
    if (data.operation.includes('read') || data.operation.includes('get')) {
      return !data.requires_confirmation;
    }
    return true; // Rule doesn't apply
  },
  autoCorrect: (data) => {
    if (data.operation.includes('read') || data.operation.includes('get')) {
      return { ...data, requires_confirmation: false };
    }
    return data;
  },
};
```

**Pattern 2: Range Validation**

```typescript
const confidenceRangeRule: SemanticRule<ActionProposal> = {
  id: 'confidence-range',
  description: 'Confidence must be between 0 and 1',
  severity: 'error',
  validate: (data) => data.confidence >= 0 && data.confidence <= 1,
  autoCorrect: (data) => ({
    ...data,
    confidence: Math.max(0, Math.min(1, data.confidence)), // Clamp to [0, 1]
  }),
};
```

**Pattern 3: Regex Pattern Enforcement**

```typescript
const operationFormatRule: SemanticRule<ActionProposal> = {
  id: 'operation-format',
  description: 'Operation must be in format "module:action"',
  severity: 'error',
  validate: (data) => /^[a-z_]+:[a-z_]+$/.test(data.operation),
  autoCorrect: (data) => {
    // Try to fix common mistakes
    let operation = data.operation.toLowerCase().replace(/\s+/g, '_');
    if (!operation.includes(':')) {
      operation = `general:${operation}`; // Add default module
    }
    return { ...data, operation };
  },
};
```

**Pattern 4: Enum Validation**

```typescript
const riskLevelRule: SemanticRule<ActionProposal> = {
  id: 'risk-level-enum',
  description: 'Risk level must be low, medium, or high',
  severity: 'error',
  validate: (data) => ['low', 'medium', 'high'].includes(data.risk_level),
  autoCorrect: (data) => {
    // Default to medium if invalid
    if (!['low', 'medium', 'high'].includes(data.risk_level)) {
      return { ...data, risk_level: 'medium' };
    }
    return data;
  },
};
```

## Testing Semantic Rules

```typescript
describe('Semantic Validator', () => {
  let validator: SemanticValidator<ActionProposal>;

  beforeEach(() => {
    validator = createActionProposalValidator();
  });

  it('should pass validation for valid data', () => {
    const data: ActionProposal = {
      intent: 'Create ticket',
      operation: 'incident:create',
      confidence: 0.95,
      risk_level: 'low',
      requires_confirmation: false,
      reversibility: 'FULL',
    };

    const result = validator.validate(data, false);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.corrections).toHaveLength(0);
  });

  it('should auto-correct high-risk without confirmation', () => {
    const data: ActionProposal = {
      intent: 'Delete database',
      operation: 'database:delete',
      confidence: 0.95,
      risk_level: 'high',
      requires_confirmation: false, // ❌ Should be true
      reversibility: 'IRREVERSIBLE',
    };

    const result = validator.validate(data, true); // autoCorrect = true

    expect(result.valid).toBe(true); // Now valid
    expect(result.corrected).toBe(true);
    expect(result.data.requires_confirmation).toBe(true); // Corrected
    expect(result.corrections).toHaveLength(1);
    expect(result.corrections[0].rule).toBe('high-risk-confirmation');
  });

  it('should fail without auto-correction', () => {
    const data: ActionProposal = {
      intent: 'Delete database',
      operation: 'database:delete',
      confidence: 0.95,
      risk_level: 'high',
      requires_confirmation: false, // ❌ Invalid
      reversibility: 'IRREVERSIBLE',
    };

    const result = validator.validate(data, false); // autoCorrect = false

    expect(result.valid).toBe(false); // Fails
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('high-risk-confirmation');
  });
});
```

## Anti-Patterns

❌ **Bad:** Implicit mutations

```typescript
autoCorrect: (data) => {
  data.requires_confirmation = true; // ❌ Mutates original
  return data;
};
```

✅ **Good:** Immutable corrections

```typescript
autoCorrect: (data) => ({ ...data, requires_confirmation: true }); // ✅ New object
```

❌ **Bad:** No correction tracking

```typescript
function validate(data: ActionProposal) {
  if (needsCorrection) {
    data.field = correctedValue; // No record of what was changed
  }
  return data;
}
```

✅ **Good:** Track corrections

```typescript
corrections.push({ rule, before, after }); // ✅ Transparent
```

❌ **Bad:** Silent corrections

```typescript
autoCorrect: (data) => {
  // No logging, user doesn't know what changed
  return { ...data, requires_confirmation: true };
};
```

✅ **Good:** Log corrections

```typescript
autoCorrect: (data) => {
  console.warn('[Auto-Corrected] High-risk operations require confirmation');
  return { ...data, requires_confirmation: true };
};
```

❌ **Bad:** Complex correction logic in validator

```typescript
function validate(data: ActionProposal) {
  // 500 lines of correction logic
  // Hard to test, hard to maintain
}
```

✅ **Good:** Separate rules with focused corrections

```typescript
const rules = [
  highRiskConfirmationRule, // One concern
  deleteReversibilityRule, // Another concern
  // Each rule is small, testable, composable
];
```

## See Also

- [L024: AJV Schema Validator Configuration for Ollama](ajv-schema-validator-ollama.md)
- [L025: Custom AJV Keywords for Cross-Field Dependencies](custom-ajv-keywords-cross-field.md)
- [L026: Multi-Layer Validation Pipeline Architecture](multi-layer-validation-pipeline.md)
- [L029: Validation Hooks for Extensibility](validation-hooks-extensibility.md)
- Implementation: `src/main/services/ai/constrainedDecoder/semanticValidator.ts`
