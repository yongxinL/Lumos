# L025: Custom AJV Keywords for Cross-Field Dependencies

**Category:** Validation / Schema Design
**Confidence:** 0.95 (AJV advanced feature)
**Session:** T-3.1.3 (Constrained JSON Decoding)
**Date:** 2026-01-30

## Discovery

JSON Schema doesn't natively support complex **cross-field validation** (e.g., "if field A equals X, then field B must be Y"). AJV's custom keyword API allows implementing such validation while keeping schemas declarative.

This is essential for LLM-generated JSON where relationships between fields must be validated (e.g., "high-risk operations must require confirmation").

## The Problem

Standard JSON Schema cannot express conditional field dependencies:

```typescript
// ❌ Cannot express this in JSON Schema:
// "If risk_level === 'high', then requires_confirmation MUST be true"

const schema = {
  type: 'object',
  properties: {
    risk_level: { enum: ['low', 'medium', 'high'] },
    requires_confirmation: { type: 'boolean' },
  },
  // ??? How to validate the relationship?
};

// Standard JSON Schema only offers:
// - `if`/`then`/`else` (limited to simple conditions)
// - `dependencies` (only checks field presence, not values)
// - `allOf`/`anyOf`/`oneOf` (complex, hard to maintain)
```

## The Solution

**Create custom AJV keywords for declarative cross-field validation:**

```typescript
import Ajv, { type KeywordDefinition } from 'ajv';

// ============================================================
// Define custom keyword
// ============================================================
const crossFieldDependencyKeyword: KeywordDefinition = {
  keyword: 'crossFieldDependency',
  type: 'object', // Applies to objects
  schemaType: 'object', // Keyword config is an object
  validate: function (schema: any, data: any): boolean {
    const { when, then } = schema;

    // Get field value (supports nested paths like "user.role")
    const fieldValue = getNestedValue(data, when.field);

    // Check if condition is met
    if (when.condition === 'equals' && fieldValue === when.value) {
      // Validate all 'then' constraints
      for (const constraint of then) {
        const targetValue = getNestedValue(data, constraint.field);
        if (!matchesConstraint(targetValue, constraint.constraint)) {
          return false; // Validation failed
        }
      }
    }

    return true; // Validation passed
  },
};

// ============================================================
// Register keyword with AJV
// ============================================================
const ajv = new Ajv({ strict: false, allErrors: true });
ajv.addKeyword(crossFieldDependencyKeyword as any); // Cast to 'any' for TypeScript

// ============================================================
// Use in schema
// ============================================================
const schema = {
  type: 'object',
  properties: {
    risk_level: { enum: ['low', 'medium', 'high'] },
    requires_confirmation: { type: 'boolean' },
  },
  crossFieldDependency: {
    when: { field: 'risk_level', condition: 'equals', value: 'high' },
    then: [{ field: 'requires_confirmation', constraint: { type: 'equals', value: true } }],
  },
};

const validate = ajv.compile(schema);

// ✅ Valid: high risk with confirmation
validate({ risk_level: 'high', requires_confirmation: true }); // true

// ❌ Invalid: high risk without confirmation
validate({ risk_level: 'high', requires_confirmation: false }); // false
```

## Why This Works

**1. Custom Keywords Are Declarative:**

- Validation logic stays in the schema (not scattered in code)
- Schema remains self-documenting
- Easy to modify rules without changing code

**2. `schemaType: 'object'` Configuration:**

```typescript
const keyword: KeywordDefinition = {
  keyword: 'crossFieldDependency',
  schemaType: 'object', // ← Keyword config is an object with 'when' and 'then'
  validate: (schema, data) => { ... },
};
```

- Tells AJV the keyword configuration is an object
- Enables complex configurations (multiple conditions, nested logic)
- Type-checked by AJV schema compiler

**3. TypeScript Strict Mode Compatibility:**

```typescript
// ✅ Cast parameters to 'any' to avoid type errors
const keyword: KeywordDefinition = {
  validate: function (schema: any, data: any): boolean {
    // AJV's complex union type causes issues in strict mode
    return true;
  },
};

// ✅ Cast when registering
ajv.addKeyword(crossFieldDependencyKeyword as any);
```

**4. Register Before Compiling:**

```typescript
// ✅ Correct order
ajv.addKeyword(crossFieldDependencyKeyword);
const validate = ajv.compile(schema); // Keywords available

// ❌ Wrong order
const validate = ajv.compile(schema); // Error: unknown keyword
ajv.addKeyword(crossFieldDependencyKeyword);
```

## Common Use Cases

**1. Risk-Confirmation Alignment:**

```typescript
// High-risk operations MUST require confirmation
crossFieldDependency: {
  when: { field: 'risk_level', condition: 'equals', value: 'high' },
  then: [{ field: 'requires_confirmation', constraint: { equals: true } }],
}
```

**2. Operation-Specific Constraints:**

```typescript
// Delete operations MUST be marked IRREVERSIBLE
crossFieldDependency: {
  when: { field: 'operation', condition: 'matches', value: /delete/ },
  then: [{ field: 'reversibility', constraint: { equals: 'IRREVERSIBLE' } }],
}
```

**3. Conditional Required Fields:**

```typescript
// If data_domain is 'enterprise', sensitivity is required
crossFieldDependency: {
  when: { field: 'data_domain', condition: 'equals', value: 'enterprise' },
  then: [{ field: 'data_sensitivity', constraint: { type: 'required' } }],
}
```

## Implementation Patterns

**Pattern 1: Simple Equality Check**

```typescript
const operationConstraint: KeywordDefinition = {
  keyword: 'operationConstraint',
  type: 'object',
  schemaType: 'object',
  validate: function (schema: any, data: any): boolean {
    const { operation, requiredFields } = schema;

    if (data.operation?.includes(operation)) {
      for (const field of requiredFields) {
        if (!data[field]) return false;
      }
    }

    return true;
  },
};

// Usage in schema
{
  operationConstraint: {
    operation: 'delete',
    requiredFields: ['requires_confirmation', 'backup_plan'],
  }
}
```

**Pattern 2: Regex Pattern Matching**

```typescript
const semanticPattern: KeywordDefinition = {
  keyword: 'semanticPattern',
  type: 'string',
  schemaType: 'object',
  validate: function (schema: any, data: any): boolean {
    const { pattern, context } = schema;
    const regex = new RegExp(pattern);

    if (!regex.test(data)) {
      // Provide semantic context in error
      (validate as any).errors = [{
        keyword: 'semanticPattern',
        message: `must match ${context} pattern`,
      }];
      return false;
    }

    return true;
  },
};

// Usage in schema
{
  operation: {
    type: 'string',
    semanticPattern: {
      pattern: '^[a-z_]+:[a-z_]+$',
      context: 'module:action format',
    },
  }
}
```

**Pattern 3: Range-Based Validation**

```typescript
const confidenceRange: KeywordDefinition = {
  keyword: 'confidenceRange',
  type: 'number',
  schemaType: 'object',
  validate: function (schema: any, data: any, parentData: any): boolean {
    const { min, max, context } = schema;

    // Context-aware ranges (e.g., higher confidence for high-risk)
    const actualMin = parentData?.risk_level === 'high' ? 0.8 : min;

    return data >= actualMin && data <= max;
  },
};
```

## Testing Custom Keywords

```typescript
describe('Custom AJV Keywords', () => {
  let ajv: Ajv;

  beforeEach(() => {
    ajv = new Ajv({ strict: false, allErrors: true });
    ajv.addKeyword(crossFieldDependencyKeyword as any);
  });

  it('should validate cross-field dependencies', () => {
    const schema = {
      type: 'object',
      properties: {
        risk_level: { enum: ['low', 'medium', 'high'] },
        requires_confirmation: { type: 'boolean' },
      },
      crossFieldDependency: {
        when: { field: 'risk_level', condition: 'equals', value: 'high' },
        then: [{ field: 'requires_confirmation', constraint: { equals: true } }],
      },
    };

    const validate = ajv.compile(schema);

    // Valid cases
    expect(validate({ risk_level: 'low', requires_confirmation: false })).toBe(true);
    expect(validate({ risk_level: 'high', requires_confirmation: true })).toBe(true);

    // Invalid case
    expect(validate({ risk_level: 'high', requires_confirmation: false })).toBe(false);
  });
});
```

## Anti-Patterns

❌ **Bad:** Using procedural validation instead of custom keywords

```typescript
// Validation logic scattered throughout codebase
function validateProposal(data: ActionProposal): boolean {
  if (data.risk_level === 'high' && !data.requires_confirmation) {
    throw new Error('High risk requires confirmation');
  }
  if (data.operation.includes('delete') && data.reversibility !== 'IRREVERSIBLE') {
    throw new Error('Deletes must be irreversible');
  }
  // ... 20 more checks
  return true;
}
```

✅ **Good:** Declarative schema with custom keywords

```typescript
// All rules in schema
const schema = {
  crossFieldDependency: {
    when: { field: 'risk_level', condition: 'equals', value: 'high' },
    then: [{ field: 'requires_confirmation', constraint: { equals: true } }],
  },
  operationConstraint: {
    operation: 'delete',
    requiredFields: ['reversibility'],
    values: { reversibility: 'IRREVERSIBLE' },
  },
};
```

❌ **Bad:** Complex `if`/`then`/`else` chains

```typescript
{
  if: { properties: { risk_level: { const: 'high' } } },
  then: {
    if: { properties: { operation: { pattern: 'delete' } } },
    then: { required: ['backup_plan'] },
    else: { required: ['confirmation'] }
  },
  // Unreadable and unmaintainable
}
```

✅ **Good:** Named custom keyword

```typescript
{
  riskAlignment: {
    rules: [
      { risk: 'high', requires: ['confirmation', 'backup_plan'] },
      { operation: 'delete', requires: ['backup_plan'] },
    ],
  }
}
```

## Performance Considerations

**1. Keywords are compiled, not interpreted:**

```typescript
// One-time compilation cost
const validate = ajv.compile(schema); // ~5ms (includes keyword compilation)

// Fast validation
validate(data); // ~0.1ms per call
```

**2. Complex keywords may be slower:**

```typescript
// Simple keyword: ~0.1ms
{ type: 'string', minLength: 5 }

// Custom keyword with logic: ~0.5-1ms
{ crossFieldDependency: { ... } }
```

**3. Cache compiled validators:**

```typescript
const validators = new Map<string, ValidateFunction>();

function getValidator(schemaId: string): ValidateFunction {
  if (!validators.has(schemaId)) {
    const schema = loadSchema(schemaId);
    validators.set(schemaId, ajv.compile(schema));
  }
  return validators.get(schemaId)!;
}
```

## See Also

- [L024: AJV Schema Validator Configuration for Ollama](ajv-schema-validator-ollama.md)
- [L026: Multi-Layer Validation Pipeline Architecture](multi-layer-validation-pipeline.md)
- [L028: Semantic Validation Rules with Auto-Correction](semantic-rules-auto-correction.md)
- AJV Custom Keywords: https://ajv.js.org/guide/user-keywords.html
- Implementation: `src/main/services/ai/constrainedDecoder/customKeywords.ts`
