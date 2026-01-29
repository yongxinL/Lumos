# L030: TypeScript Strict Mode with AJV Custom Keywords

**Category:** Type System / Workarounds
**Confidence:** 0.95 (TypeScript + AJV integration)
**Session:** T-3.1.3 (Constrained JSON Decoding)
**Date:** 2026-01-30

## Discovery

AJV's **KeywordDefinition** type is a complex union that causes issues with **TypeScript strict mode**. The `validate` function signature and keyword object registration often require type assertions.

This is a known limitation of AJV's TypeScript definitions, not a bug in your code.

## The Problem

TypeScript strict mode rejects AJV keyword definitions:

```typescript
import Ajv, { type KeywordDefinition } from 'ajv';

// ❌ TypeScript Error in strict mode
const keyword: KeywordDefinition = {
  keyword: 'crossFieldDependency',
  type: 'object',
  schemaType: 'object',
  validate: (schema, data) => {
    // ❌ Error: Type '(schema: any, data: any) => boolean' is not assignable
    // to type 'SchemaValidateFunction | ...'
    return true;
  },
};

// ❌ TypeScript Error when registering
const ajv = new Ajv();
ajv.addKeyword(keyword);
// ❌ Error: Argument of type 'KeywordDefinition' is not assignable to
// parameter of type 'KeywordDefinition'
// (Yes, it says the same type is not assignable to itself!)
```

**Why this happens:**

AJV's `KeywordDefinition` is a complex union type with many possible shapes. TypeScript's strict mode can't always infer which union member you're using, causing spurious errors.

## The Solution

**Use type assertions to work around AJV's complex types:**

```typescript
import Ajv, { type KeywordDefinition } from 'ajv';

// ============================================================
// Solution 1: Cast parameters to 'any' in validate function
// ============================================================
const keyword: KeywordDefinition = {
  keyword: 'crossFieldDependency',
  type: 'object',
  schemaType: 'object',
  validate: function (schema: any, data: any): boolean {
    // ✅ 'any' types avoid complex union inference
    const { when, then } = schema;
    const fieldValue = data[when.field];

    if (when.condition === 'equals' && fieldValue === when.value) {
      for (const constraint of then) {
        const targetValue = data[constraint.field];
        if (targetValue !== constraint.value) {
          return false;
        }
      }
    }

    return true;
  },
};

// ============================================================
// Solution 2: Cast when registering with AJV
// ============================================================
const ajv = new Ajv({ strict: false, allErrors: true });
ajv.addKeyword(keyword as any); // ✅ Cast to 'any'

// Now the keyword works correctly
const schema = {
  type: 'object',
  properties: {
    risk_level: { enum: ['low', 'medium', 'high'] },
    requires_confirmation: { type: 'boolean' },
  },
  crossFieldDependency: {
    when: { field: 'risk_level', condition: 'equals', value: 'high' },
    then: [{ field: 'requires_confirmation', value: true }],
  },
};

const validate = ajv.compile(schema);
validate({ risk_level: 'high', requires_confirmation: true }); // ✅ Works
```

## Why This Works

**1. AJV's Complex Union Type:**

```typescript
// Simplified version of AJV's KeywordDefinition
type KeywordDefinition =
  | { validate: FunctionKeywordDefinition; ... }
  | { compile: CompileKeywordDefinition; ... }
  | { macro: MacroKeywordDefinition; ... }
  | { code: CodeKeywordDefinition; ... }
  // ... and many more union members
```

TypeScript can't always narrow which union member you're using, causing type errors.

**2. 'any' Types Avoid Union Inference:**

```typescript
// ❌ TypeScript tries to infer complex union
validate: (schema, data) => boolean;

// ✅ 'any' skips union inference
validate: (schema: any, data: any): boolean => boolean;
```

**3. Type Assertions at Registration:**

```typescript
// ❌ TypeScript complains about union mismatch
ajv.addKeyword(keyword);

// ✅ Type assertion bypasses check
ajv.addKeyword(keyword as any);
```

**4. Runtime Behavior Unchanged:**

```typescript
// Type assertions only affect TypeScript compilation
// Runtime behavior is identical with or without 'as any'
```

## Common Patterns

**Pattern 1: Simple Validation Keyword**

```typescript
const simpleKeyword: KeywordDefinition = {
  keyword: 'myKeyword',
  type: 'string', // Applies to strings
  validate: function (schema: any, data: any): boolean {
    // Custom validation logic
    return data.length > schema.minLength;
  },
};

ajv.addKeyword(simpleKeyword as any);
```

**Pattern 2: Keyword with Error Messages**

```typescript
const keywordWithErrors: KeywordDefinition = {
  keyword: 'customRange',
  type: 'number',
  validate: function (schema: any, data: any): boolean {
    const { min, max } = schema;

    if (data < min || data > max) {
      // Set custom error message
      (validate as any).errors = [
        {
          keyword: 'customRange',
          message: `must be between ${min} and ${max}`,
          params: { min, max, value: data },
        },
      ];
      return false;
    }

    return true;
  },
};

ajv.addKeyword(keywordWithErrors as any);
```

**Pattern 3: Keyword with Schema Type**

```typescript
const objectKeyword: KeywordDefinition = {
  keyword: 'complexRule',
  type: 'object', // Applies to objects
  schemaType: 'object', // Keyword config is an object
  validate: function (schema: any, data: any, parentSchema?: any, dataPath?: string): boolean {
    // Access parent schema if needed
    const { condition, then } = schema;

    if (evaluateCondition(data, condition)) {
      return evaluateThen(data, then);
    }

    return true;
  },
};

ajv.addKeyword(objectKeyword as any);
```

**Pattern 4: Async Validation Keyword**

```typescript
const asyncKeyword: KeywordDefinition = {
  keyword: 'asyncValidation',
  type: 'string',
  async: true, // Enable async validation
  validate: async function (schema: any, data: any): Promise<boolean> {
    // Async validation (e.g., database lookup)
    const exists = await checkDatabaseValue(data);
    return exists;
  },
};

ajv.addKeyword(asyncKeyword as any);
```

## Documentation Best Practices

**1. Document Type Assertions:**

```typescript
// Document why 'as any' is needed
const keyword: KeywordDefinition = {
  keyword: 'myKeyword',
  // TypeScript: Cast to 'any' due to AJV's complex KeywordDefinition union
  validate: function (schema: any, data: any): boolean {
    return true;
  },
};

// Document why registration needs 'as any'
ajv.addKeyword(keyword as any); // TypeScript: Known AJV typing limitation
```

**2. Comment on AJV Limitation:**

```typescript
/**
 * Custom AJV keyword for cross-field validation.
 *
 * NOTE: This keyword uses 'any' types for schema/data parameters
 * due to AJV's complex KeywordDefinition union type. This is a
 * known limitation of AJV's TypeScript definitions.
 *
 * Runtime behavior is type-safe via AJV's validation.
 */
export const crossFieldDependencyKeyword: KeywordDefinition = {
  // ...
};
```

**3. Avoid Global ESLint Disables:**

```typescript
// ❌ Bad: Global disable
/* eslint-disable @typescript-eslint/no-explicit-any */

const keyword1: KeywordDefinition = { ... };
const keyword2: KeywordDefinition = { ... };
const keyword3: KeywordDefinition = { ... };

// Problem: Disables 'any' checking for entire file

// ✅ Good: Local type assertions only where needed
const keyword1: KeywordDefinition = {
  validate: function (schema: any, data: any): boolean { ... },
};
// 'any' checking still active for rest of file
```

## Testing Type-Asserted Keywords

```typescript
describe('Custom AJV Keywords', () => {
  let ajv: Ajv;

  beforeEach(() => {
    ajv = new Ajv({ strict: false, allErrors: true });
    // Register keyword with type assertion
    ajv.addKeyword(myCustomKeyword as any);
  });

  it('should validate correctly', () => {
    const schema = {
      type: 'object',
      properties: {
        value: { type: 'number', customRange: { min: 0, max: 100 } },
      },
    };

    const validate = ajv.compile(schema);

    // Valid cases
    expect(validate({ value: 50 })).toBe(true);
    expect(validate({ value: 0 })).toBe(true);
    expect(validate({ value: 100 })).toBe(true);

    // Invalid cases
    expect(validate({ value: -1 })).toBe(false);
    expect(validate({ value: 101 })).toBe(false);
  });

  it('should provide custom error messages', () => {
    const schema = {
      type: 'object',
      properties: {
        value: { type: 'number', customRange: { min: 0, max: 100 } },
      },
    };

    const validate = ajv.compile(schema);

    validate({ value: 150 }); // Invalid

    expect(validate.errors).toBeDefined();
    expect(validate.errors![0].keyword).toBe('customRange');
    expect(validate.errors![0].message).toContain('between 0 and 100');
  });
});
```

## Alternative Approaches

**Approach 1: Use AJV-Formats (Pre-Built Keywords)**

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv();
addFormats(ajv); // Adds date, time, email, uri, etc.

// No custom keywords needed for common formats
const schema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' }, // Built-in
    date: { type: 'string', format: 'date' }, // Built-in
  },
};
```

**Approach 2: Use JSON Schema Composition**

```typescript
// Instead of custom keywords, use JSON Schema features
const schema = {
  type: 'object',
  properties: {
    risk_level: { enum: ['low', 'medium', 'high'] },
    requires_confirmation: { type: 'boolean' },
  },
  // Use if/then/else instead of custom keyword
  if: {
    properties: { risk_level: { const: 'high' } },
  },
  then: {
    properties: { requires_confirmation: { const: true } },
  },
};
```

**Approach 3: Separate Validation Function**

```typescript
// Instead of custom keyword, validate separately
function validateCrossFieldRules(data: ActionProposal): boolean {
  if (data.risk_level === 'high' && !data.requires_confirmation) {
    return false;
  }
  return true;
}

// Use after schema validation
const schemaValid = ajv.validate(schema, data);
const rulesValid = validateCrossFieldRules(data);
```

## Anti-Patterns

❌ **Bad:** Silencing all 'any' warnings

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */

// Entire file now ignores 'any' issues
const keyword1 = { ... };
const keyword2 = { ... };
```

✅ **Good:** Local type assertions

```typescript
// Only use 'any' where needed
const keyword: KeywordDefinition = {
  validate: function (schema: any, data: any): boolean { ... },
};
```

❌ **Bad:** No documentation

```typescript
ajv.addKeyword(keyword as any); // Why 'as any'?
```

✅ **Good:** Documented reason

```typescript
// AJV typing limitation - keyword works correctly at runtime
ajv.addKeyword(keyword as any);
```

❌ **Bad:** Ignoring TypeScript errors

```typescript
// @ts-ignore
ajv.addKeyword(keyword);
```

✅ **Good:** Explicit type assertion

```typescript
ajv.addKeyword(keyword as any); // More explicit than @ts-ignore
```

## See Also

- [L025: Custom AJV Keywords for Cross-Field Dependencies](custom-ajv-keywords-cross-field.md)
- [L024: AJV Schema Validator Configuration for Ollama](ajv-schema-validator-ollama.md)
- AJV Custom Keywords: https://ajv.js.org/guide/user-keywords.html
- AJV TypeScript: https://ajv.js.org/guide/typescript.html
- Implementation: `src/main/services/ai/constrainedDecoder/customKeywords.ts`
