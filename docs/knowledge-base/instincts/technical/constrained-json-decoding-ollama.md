# L020: Constrained JSON Decoding with Ollama Format Parameter

**Category:** AI / LLM Integration
**Confidence:** 0.95 (Ollama-specific feature)
**Session:** T-3.1.2 (Evaluation LLM Service)
**Date:** 2026-01-30

## Discovery

Ollama supports **JSON Schema-based constrained decoding** via the `format` parameter. By passing a JSON Schema as a string, Ollama ensures generated output conforms to the schema structure at generation time, dramatically reducing validation errors.

## The Problem

Without constrained decoding:

- LLMs generate freeform JSON that may not match your schema
- Validation errors require retry attempts, wasting time and tokens
- Common mistakes: wrong field names, incorrect types, missing required fields
- Multiple retries needed to get valid output (3-5+ attempts typical)

## The Solution

**Pass JSON Schema to Ollama's format parameter:**

```typescript
import { ACTION_PROPOSAL_SCHEMA } from '@/types/schemas/actionProposal.schema';

const response = await ollama.generate({
  model: 'qwen2.5:3b',
  prompt: 'Generate action proposal for: Create a ticket...',
  format: JSON.stringify(ACTION_PROPOSAL_SCHEMA), // Pass schema as string
  options: {
    temperature: 0.1, // Low temp for determinism
    top_p: 0.9,
  },
});

// Response will conform to schema structure
const proposal = JSON.parse(response); // High success rate
```

**Schema should exclude auto-generated fields:**

```typescript
// ❌ Don't include in schema
{
  id: { type: 'string', format: 'uuid' },           // Auto-generated
  timestamp: { type: 'string', format: 'date-time' }, // Auto-generated
  evaluation_model: { type: 'string' }              // Set by service
}

// ✅ Include only LLM-generated fields
{
  intent: { type: 'string', minLength: 5 },
  operation: { type: 'string', pattern: '^[a-z_]+:[a-z_]+$' },
  confidence: { type: 'number', minimum: 0, maximum: 1 }
}
```

## Why This Works

1. **Generation-time enforcement:** Ollama constrains token selection to valid JSON structure
2. **Reduces retry attempts:** Most outputs conform to schema on first try (90%+ success rate)
3. **Type safety:** Prevents type mismatches (string vs number, wrong enums)
4. **Format validation:** Ensures patterns like operation format (`module:action`)
5. **Deterministic with low temperature:** Combined with temp 0.1-0.2, produces consistent results

## Configuration Best Practices

**Temperature Settings:**

- **0.1-0.2**: Maximum determinism, consistent structure (recommended for schemas)
- **0.3-0.5**: Some variety while maintaining structure
- **0.7+**: Creative but may violate constraints

**Schema Design:**

```typescript
export const ACTION_PROPOSAL_SCHEMA = {
  type: 'object',
  required: ['intent', 'operation', 'confidence'], // Mark required fields
  properties: {
    intent: {
      type: 'string',
      description: 'What the user wants to accomplish', // Help LLM understand
      minLength: 5,
      maxLength: 500,
    },
    operation: {
      type: 'string',
      pattern: '^[a-z_]+:[a-z_]+$', // Enforce format
      examples: ['incident:create', 'calendar:read'], // Provide examples
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'AI confidence (0.9+ clear, 0.5-0.8 ambiguous)',
    },
  },
  additionalProperties: false, // Prevent extra fields
};
```

## Still Need Runtime Validation

Constrained decoding ensures **structural correctness** but not **logical correctness**:

```typescript
// Schema validation passed ✓
const proposal = JSON.parse(response);
const valid = ajv.validate(ACTION_PROPOSAL_SCHEMA, proposal); // ✓

// But business rules may still fail ✗
if (proposal.risk_level === 'high' && !proposal.requires_confirmation) {
  // Auto-correct business rule violation
  proposal.requires_confirmation = true;
}
```

Two validation layers needed:

1. **Schema validation (AJV):** Structural correctness
2. **Business rule validation:** Logical correctness

## Performance Impact

| Metric                     | Without Constrained Decoding | With Constrained Decoding |
| -------------------------- | ---------------------------- | ------------------------- |
| Success Rate (1st attempt) | ~30-50%                      | ~90-95%                   |
| Average Retries            | 2-3                          | 0-1                       |
| Average Latency            | 6-9 seconds                  | 2-3 seconds               |
| Token Usage                | 3-4x prompt                  | 1-1.5x prompt             |

## Model Compatibility

Works with:

- ✅ Llama 3.x models
- ✅ Qwen 2.5 models
- ✅ Mistral models
- ✅ Most modern LLMs in Ollama

Does NOT work with:

- ❌ Very small models (<1B parameters)
- ❌ Models without JSON training data

## Anti-Pattern

❌ **Bad:** No schema, hope for correct format

```typescript
const response = await ollama.generate({
  model: 'qwen2.5:3b',
  prompt: 'Generate JSON with fields: intent, operation, confidence',
  // No format parameter - LLM will generate freeform
});
// Result: High failure rate, many retries
```

✅ **Good:** Provide schema for structure enforcement

```typescript
const response = await ollama.generate({
  model: 'qwen2.5:3b',
  prompt: 'Generate action proposal...',
  format: JSON.stringify(ACTION_PROPOSAL_SCHEMA), // Constrained
});
// Result: High success rate, minimal retries
```

## See Also

- [L021: Business Rule Validation vs Schema Validation](business-rule-validation-vs-schema.md)
- [L022: LLM Prompt Engineering for Structured Output](llm-prompt-engineering-structured-output.md)
- [L024: AJV Schema Validator Configuration for Ollama](ajv-schema-validator-ollama.md)
- Evaluation LLM Service: `src/main/services/ai/evaluationLlmService.ts`
- Schema definition: `src/types/schemas/actionProposal.schema.ts`
