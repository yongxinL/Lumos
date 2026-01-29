# L021: Business Rule Validation vs Schema Validation

**Category:** Validation / Architecture
**Confidence:** 0.95 (Software engineering best practice)
**Session:** T-3.1.2 (Evaluation LLM Service)
**Date:** 2026-01-30

## Discovery

When working with LLM-generated structured data, there are **two distinct validation layers** required for production-ready systems:

1. **Schema Validation** - Structural correctness (types, required fields)
2. **Business Rule Validation** - Logical correctness (domain constraints, semantic rules)

Both are necessary. Schema validation alone is insufficient for real-world applications.

## The Problem

Relying only on schema validation misses logical errors:

```typescript
// This passes schema validation ✓
{
  intent: "Delete user account",
  operation: "user:delete",
  risk_level: "low",              // ✗ Wrong! Deletes are high risk
  requires_confirmation: false,   // ✗ Wrong! Deletes need confirmation
  reversibility: "FULL"            // ✗ Wrong! Deletes are IRREVERSIBLE
}
```

The JSON is structurally correct (all required fields present, correct types) but **logically incorrect** (violates domain knowledge about delete operations).

## The Solution

**Implement two-layer validation:**

```typescript
async generateProposal(input: ProposalGenerationInput): Promise<ActionProposal> {
  const response = await ollama.generate({...});
  const parsed = JSON.parse(response);

  // ============================================================
  // Layer 1: Schema Validation (Structural)
  // ============================================================
  const valid = this.validateProposal(parsed);
  if (!valid) {
    const errors = this.ajv.errors?.map(err =>
      `${err.instancePath} ${err.message}`
    );
    throw new ValidationError('Schema validation failed', errors);
  }

  // Add auto-generated fields
  const proposal: ActionProposal = {
    ...parsed,
    id: uuid(crypto.randomUUID()),
    timestamp: iso8601(new Date().toISOString()),
    evaluation_model: this.config.model,
    raw_user_input: input.text,
    related_skills: [],
    rollback_plan: null,
  };

  // ============================================================
  // Layer 2: Business Rule Validation (Logical)
  // ============================================================
  this.validateAndCorrectBusinessRules(proposal);

  return proposal;
}
```

**Business rule validation with auto-correction:**

```typescript
private validateAndCorrectBusinessRules(proposal: ActionProposal): void {
  const errors: string[] = [];

  // Rule 1: Confidence must be in valid range
  if (proposal.confidence < 0 || proposal.confidence > 1) {
    errors.push(`Confidence ${proposal.confidence} out of range [0, 1]`);
  }

  // Rule 2: Operation format must be module:action
  if (!/^[a-z_]+:[a-z_]+$/.test(proposal.operation)) {
    errors.push(`Operation '${proposal.operation}' must be format 'module:action'`);
  }

  // Rule 3: High-risk operations MUST require confirmation (auto-correct)
  if (proposal.risk_level === 'high' && !proposal.requires_confirmation) {
    console.warn('⚠ Correcting: High-risk operation must require confirmation');
    proposal.requires_confirmation = true; // Fix it
  }

  // Rule 4: Delete operations should be high risk (auto-correct)
  if (proposal.operation.includes('delete')) {
    if (proposal.risk_level !== 'high') {
      console.warn(`⚠ Correcting: Delete operation risk from ${proposal.risk_level} to high`);
      proposal.risk_level = 'high';
    }
    if (!['COMPENSATABLE', 'IRREVERSIBLE'].includes(proposal.reversibility)) {
      console.warn(`⚠ Correcting: Delete reversibility to IRREVERSIBLE`);
      proposal.reversibility = 'IRREVERSIBLE';
    }
  }

  // Rule 5: Read operations should be low risk (auto-correct)
  if (proposal.operation.includes('read') || proposal.operation.includes('view')) {
    if (proposal.risk_level !== 'low') {
      console.warn(`⚠ Correcting: Read operation risk to low`);
      proposal.risk_level = 'low';
    }
    if (proposal.requires_confirmation) {
      console.warn('⚠ Correcting: Read operation should not require confirmation');
      proposal.requires_confirmation = false;
    }
  }

  // Throw if critical errors found
  if (errors.length > 0) {
    throw new ValidationError('Business rule validation failed', errors);
  }
}
```

## Why This Works

**Schema Validation (AJV):**

- Ensures type correctness (`string`, `number`, `boolean`)
- Validates required fields are present
- Checks enum values match allowed list
- Enforces regex patterns (e.g., `^[a-z_]+:[a-z_]+$`)
- **Fast:** Compiled validator, microsecond performance
- **Catches:** Structural errors

**Business Rule Validation (Custom Logic):**

- Enforces domain knowledge (deletes are high risk)
- Validates cross-field constraints (high risk → requires confirmation)
- Checks semantic correctness (operation type aligns with risk level)
- **Flexible:** Easy to add/modify rules
- **Catches:** Logical errors

## Auto-Correction vs Rejection

**When to auto-correct:**

- ✅ Known, unambiguous fixes (delete → high risk)
- ✅ Safety improvements (add confirmation requirement)
- ✅ Format normalization (lowercase operation names)

**When to reject:**

- ❌ Ambiguous cases (unclear what correct value should be)
- ❌ Critical fields wrong (confidence out of range)
- ❌ Missing required information (intent too short)

**Always warn on corrections:**

```typescript
if (correctionMade) {
  console.warn(`⚠ Correcting: ${description}`);
}
```

This helps with:

- Debugging LLM prompt issues
- Identifying patterns in corrections
- Refining prompts to reduce corrections

## Example Business Rules

| Rule                              | Type         | Action       |
| --------------------------------- | ------------ | ------------ |
| Confidence in [0, 1]              | Critical     | Reject       |
| Operation format `module:action`  | Critical     | Reject       |
| Intent length ≥ 5 chars           | Critical     | Reject       |
| Delete → high risk                | Safety       | Auto-correct |
| High risk → requires confirmation | Safety       | Auto-correct |
| Read → low risk                   | Optimization | Auto-correct |
| Read → no confirmation            | Optimization | Auto-correct |
| Create → medium+ risk             | Safety       | Auto-correct |

## Configuration

Store business rules separately for maintainability:

```typescript
// business-rules.ts
export const BUSINESS_RULES = {
  DELETE_OPERATIONS: {
    required_risk_level: 'high',
    required_reversibility: 'IRREVERSIBLE',
    requires_confirmation: true,
  },
  READ_OPERATIONS: {
    required_risk_level: 'low',
    required_reversibility: 'FULL',
    requires_confirmation: false,
  },
  HIGH_RISK_OPERATIONS: {
    requires_confirmation: true,
  },
};
```

## Anti-Pattern

❌ **Bad:** Only schema validation

```typescript
const valid = ajv.validate(schema, data);
if (!valid) throw new Error('Invalid');
return data; // Logically incorrect data passes through
```

✅ **Good:** Two-layer validation

```typescript
// Layer 1: Schema
const valid = ajv.validate(schema, data);
if (!valid) throw new ValidationError('Schema failed');

// Layer 2: Business rules
validateBusinessRules(data); // Catches logical errors
return data;
```

❌ **Bad:** Silent corrections without logging

```typescript
if (proposal.risk_level === 'low') {
  proposal.risk_level = 'high'; // Silent change
}
```

✅ **Good:** Warn on corrections for debugging

```typescript
if (proposal.risk_level === 'low') {
  console.warn('⚠ Correcting: Delete operation risk to high');
  proposal.risk_level = 'high';
}
```

## See Also

- [L020: Constrained JSON Decoding with Ollama](constrained-json-decoding-ollama.md)
- [L022: LLM Prompt Engineering for Structured Output](llm-prompt-engineering-structured-output.md)
- [L024: AJV Schema Validator Configuration for Ollama](ajv-schema-validator-ollama.md)
- Evaluation LLM Service: `src/main/services/ai/evaluationLlmService.ts` (see `validateAndCorrectBusinessRules`)
- Schema definition: `src/types/schemas/actionProposal.schema.ts`
