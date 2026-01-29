# L024: AJV Schema Validator Configuration for Ollama

**Category:** Validation / Configuration
**Confidence:** 0.95 (AJV + Ollama integration)
**Session:** T-3.1.2 (Evaluation LLM Service)
**Date:** 2026-01-30

## Discovery

When using **AJV (Another JSON Validator)** to validate Ollama-generated JSON, you must disable strict mode (`strict: false`) to allow Ollama-specific schema features that don't strictly conform to JSON Schema Draft 7.

Additionally, compiling the schema once at initialization provides significant performance benefits over repeated compilation.

## The Problem

Default AJV configuration rejects Ollama-compatible schemas:

```typescript
// ❌ Bad: Strict mode rejects Ollama schemas
const ajv = new Ajv(); // Default: strict: true

const schema = {
  type: 'object',
  properties: {
    intent: {
      description: 'User intent', // AJV strict mode may reject this
      examples: ['Create ticket'], // Not standard JSON Schema
    },
  },
};

const validate = ajv.compile(schema);
// Error: strict mode is true, unknown keyword: "examples"
```

## The Solution

**Configure AJV for Ollama compatibility:**

```typescript
import Ajv, { type ValidateFunction } from 'ajv';
import { ACTION_PROPOSAL_SCHEMA } from '@/types/schemas/actionProposal.schema';

class EvaluationLLMService {
  private ajv: Ajv;
  private validateProposal: ValidateFunction;

  constructor(ollama: OllamaClient, config?: Partial<EvaluationLLMConfig>) {
    // ============================================================
    // Initialize AJV with relaxed strict mode
    // ============================================================
    this.ajv = new Ajv({
      allErrors: true, // Collect all errors, not just first
      strict: false, // Allow non-standard schema features
      // validateFormats: true,  // Optional: validate format keywords
      // coerceTypes: false,     // Don't auto-convert types
    });

    // ============================================================
    // Compile schema once at initialization for performance
    // ============================================================
    this.validateProposal = this.ajv.compile(ACTION_PROPOSAL_SCHEMA);
  }

  private parseAndValidate(response: string, input: ProposalGenerationInput): ActionProposal {
    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(response);
    } catch (error) {
      throw new ValidationError('Invalid JSON', ['Failed to parse JSON']);
    }

    // ============================================================
    // Use compiled validator (fast)
    // ============================================================
    const valid = this.validateProposal(parsed);

    if (!valid) {
      // ============================================================
      // Extract and format error messages
      // ============================================================
      const errors = this.validateProposal.errors?.map(
        (err) => `${err.instancePath || 'root'} ${err.message}`
      ) || ['Unknown validation error'];

      throw new ValidationError('Schema validation failed', errors);
    }

    return parsed as ActionProposal;
  }
}
```

## Why This Works

**1. `strict: false` Configuration:**

- Allows `description` fields in schema (helpful for LLM understanding)
- Accepts `examples` arrays (Ollama uses these for guidance)
- Permits custom keywords without throwing errors
- Still validates core JSON Schema features (type, required, pattern)

**2. `allErrors: true` Configuration:**

- Collects all validation errors at once
- Provides complete picture for debugging
- Helps identify multiple issues in single validation pass
- Better user experience (fix all issues, not just first)

**3. Compiled Validator Performance:**

| Approach            | Validation Time | Use Case                           |
| ------------------- | --------------- | ---------------------------------- |
| Recompile each time | ~5-10ms         | Single validation                  |
| Compiled validator  | ~0.1-0.5ms      | Multiple validations (100x faster) |

**4. Error Message Extraction:**

```typescript
const errors = this.validateProposal.errors?.map(
  (err) => `${err.instancePath || 'root'} ${err.message}`
);

// Example output:
// [
//   "/intent must NOT have fewer than 5 characters",
//   "/confidence must be <= 1",
//   "/operation must match pattern '^[a-z_]+:[a-z_]+$'"
// ]
```

## AJV Configuration Options

```typescript
interface AjvOptions {
  // Error handling
  allErrors?: boolean; // true: collect all errors
  verbose?: boolean; // true: include schema and data in errors

  // Strictness
  strict?: boolean; // false: allow non-standard features
  strictTypes?: boolean; // true: strict type checking
  strictTuples?: boolean; // true: strict tuple validation

  // Format validation
  validateFormats?: boolean; // true: validate format keywords
  formats?: Record<string, Function>; // Custom format validators

  // Type coercion
  coerceTypes?: boolean; // true: auto-convert types (not recommended)

  // Schema defaults
  useDefaults?: boolean; // true: apply default values
  removeAdditional?: boolean; // true: remove extra properties

  // Performance
  cache?: Map; // Schema compilation cache
}

// Recommended for Ollama
const recommendedConfig: AjvOptions = {
  allErrors: true, // Get all validation errors
  strict: false, // Allow Ollama schema features
  validateFormats: true, // Validate uuid, date-time, etc.
  coerceTypes: false, // Don't auto-convert (be explicit)
  useDefaults: false, // Don't apply defaults (we control this)
};
```

## Schema Design for Ollama

**Include helpful metadata:**

```typescript
export const ACTION_PROPOSAL_SCHEMA = {
  type: 'object',
  required: ['intent', 'operation', 'confidence'],
  properties: {
    intent: {
      type: 'string',
      description: 'Natural language description of what the AI wants to do',
      minLength: 5,
      maxLength: 500,
      examples: [
        'Create a high-priority ticket for server downtime',
        'Schedule team meeting tomorrow at 2pm',
      ],
    },
    operation: {
      type: 'string',
      description: 'Operation type in format "module:action"',
      pattern: '^[a-z_]+:[a-z_]+$',
      examples: ['incident:create', 'calendar:read', 'task:update'],
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'AI confidence score (0.9+ for clear, 0.5-0.8 for ambiguous)',
    },
  },
  additionalProperties: false, // Prevent extra fields
};
```

The `description` and `examples` fields help both:

- LLM understanding (when used with Ollama format parameter)
- Developer documentation (self-documenting schema)

## Error Handling Patterns

**Pattern 1: Throw with all errors**

```typescript
if (!valid) {
  const errors = validator.errors?.map((err) => `${err.instancePath} ${err.message}`) || [];
  throw new ValidationError('Schema validation failed', errors);
}
```

**Pattern 2: Log and continue (for optional validation)**

```typescript
if (!valid) {
  console.warn('Validation warnings:', validator.errors);
  // Continue with corrections
}
```

**Pattern 3: Partial validation (validate subset)**

```typescript
// Validate only critical fields
const criticalSchema = {
  type: 'object',
  required: ['id', 'operation'],
  properties: {
    id: schema.properties.id,
    operation: schema.properties.operation,
  },
};
const validateCritical = ajv.compile(criticalSchema);
```

## Performance Optimization

**1. Compile once, use many times:**

```typescript
// ✅ Good: Compile at initialization
constructor() {
  this.validateProposal = ajv.compile(SCHEMA);
}

validate(data: unknown) {
  return this.validateProposal(data); // Fast
}

// ❌ Bad: Recompile every time
validate(data: unknown) {
  const validator = ajv.compile(SCHEMA); // Slow
  return validator(data);
}
```

**2. Cache multiple validators:**

```typescript
private validators = new Map<string, ValidateFunction>();

getValidator(schemaName: string): ValidateFunction {
  if (!this.validators.has(schemaName)) {
    const schema = this.loadSchema(schemaName);
    this.validators.set(schemaName, this.ajv.compile(schema));
  }
  return this.validators.get(schemaName)!;
}
```

**3. Use standalone validators for production (advanced):**

```typescript
// Generate standalone validator code
const standaloneCode = standaloneCode(ajv, this.validateProposal);
// Write to file, bundle for faster startup
```

## Testing AJV Validators

```typescript
describe('Schema Validation', () => {
  let ajv: Ajv;
  let validate: ValidateFunction;

  beforeEach(() => {
    ajv = new Ajv({ allErrors: true, strict: false });
    validate = ajv.compile(ACTION_PROPOSAL_SCHEMA);
  });

  it('should accept valid proposal', () => {
    const valid = validate({
      intent: 'Create ticket',
      operation: 'incident:create',
      confidence: 0.95,
      // ... other required fields
    });

    expect(valid).toBe(true);
    expect(validate.errors).toBeNull();
  });

  it('should reject missing required fields', () => {
    const valid = validate({
      intent: 'Create ticket',
      // Missing operation and confidence
    });

    expect(valid).toBe(false);
    expect(validate.errors).toHaveLength(2);
  });

  it('should reject invalid types', () => {
    const valid = validate({
      intent: 'Create ticket',
      operation: 'incident:create',
      confidence: 'high', // Should be number
    });

    expect(valid).toBe(false);
    expect(validate.errors?.[0]?.keyword).toBe('type');
  });
});
```

## Anti-Pattern

❌ **Bad:** Strict mode with Ollama schemas

```typescript
const ajv = new Ajv({ strict: true }); // Rejects Ollama features
const validate = ajv.compile(OLLAMA_SCHEMA);
// Error: strict mode is true, unknown keyword: "examples"
```

✅ **Good:** Relaxed strict mode

```typescript
const ajv = new Ajv({ strict: false, allErrors: true });
const validate = ajv.compile(OLLAMA_SCHEMA); // Works
```

❌ **Bad:** Recompile on every validation

```typescript
function validate(data: unknown) {
  const validator = ajv.compile(SCHEMA); // Slow!
  return validator(data);
}
```

✅ **Good:** Compile once

```typescript
const validator = ajv.compile(SCHEMA); // At initialization

function validate(data: unknown) {
  return validator(data); // Fast
}
```

❌ **Bad:** Ignore error details

```typescript
if (!validate(data)) {
  throw new Error('Invalid'); // Lost error information
}
```

✅ **Good:** Extract and report errors

```typescript
if (!validate(data)) {
  const errors = validate.errors?.map((e) => e.message);
  throw new ValidationError('Invalid', errors);
}
```

## See Also

- [L020: Constrained JSON Decoding with Ollama](constrained-json-decoding-ollama.md)
- [L021: Business Rule Validation vs Schema Validation](business-rule-validation-vs-schema.md)
- [L022: LLM Prompt Engineering for Structured Output](llm-prompt-engineering-structured-output.md)
- AJV Documentation: https://ajv.js.org/
- Evaluation LLM Service: `src/main/services/ai/evaluationLlmService.ts`
- Schema definition: `src/types/schemas/actionProposal.schema.ts`
