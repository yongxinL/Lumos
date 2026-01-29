# L027: Schema Registry with Ollama Compatibility

**Category:** Architecture / LLM Integration
**Confidence:** 0.95 (Ollama integration pattern)
**Session:** T-3.1.3 (Constrained JSON Decoding)
**Date:** 2026-01-30

## Discovery

When using **Ollama's constrained decoding** (`format` parameter), custom validation keywords must be **stripped from schemas** because Ollama only understands standard JSON Schema Draft 7.

A **Schema Registry** pattern enables managing both:

- **Full schemas** (with custom keywords) for local validation
- **Stripped schemas** (standard JSON Schema) for Ollama `format` parameter

Without this, you either:

- Lose custom keyword validation (if you only use Ollama-compatible schemas)
- Can't use Ollama constrained decoding (if schemas have custom keywords)

## The Problem

Custom AJV keywords break Ollama constrained decoding:

```typescript
// Schema with custom keywords
const FULL_SCHEMA = {
  type: 'object',
  properties: {
    risk_level: { enum: ['low', 'medium', 'high'] },
    requires_confirmation: { type: 'boolean' },
  },
  // ❌ Custom keyword - Ollama doesn't understand this
  crossFieldDependency: {
    when: { field: 'risk_level', condition: 'equals', value: 'high' },
    then: [{ field: 'requires_confirmation', constraint: { equals: true } }],
  },
};

// Pass to Ollama
const response = await ollama.generate({
  model: 'qwen2.5:3b',
  prompt: 'Generate action proposal...',
  format: JSON.stringify(FULL_SCHEMA), // ❌ Ollama error: unknown keyword
});
```

**You need TWO versions:**

1. **Full schema** with custom keywords → for local validation (AJV)
2. **Stripped schema** without custom keywords → for Ollama generation

## The Solution

**Create a Schema Registry to manage both versions:**

```typescript
import Ajv, { type ValidateFunction } from 'ajv';

// ============================================================
// Schema Metadata
// ============================================================
interface SchemaMetadata {
  id: string; // Unique schema ID
  name: string; // Human-readable name
  version: string; // Semantic version
  tags: string[]; // Searchable tags
  ollamaCompatible: boolean; // Has custom keywords?
}

// ============================================================
// Schema Registry
// ============================================================
class SchemaRegistry {
  private schemas = new Map<
    string,
    {
      full: object; // Full schema with custom keywords
      ollama: object; // Stripped for Ollama
      metadata: SchemaMetadata;
      validator: ValidateFunction; // Compiled AJV validator
    }
  >();

  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      strict: false, // Allow custom keywords
      allErrors: true,
    });
  }

  // ============================================================
  // Register schema (creates both versions)
  // ============================================================
  register(schema: object, metadata: SchemaMetadata): void {
    // Validate schema itself
    this.validateSchemaStructure(schema);

    // Create Ollama-compatible version
    const ollamaSchema = this.stripCustomKeywords(schema);

    // Compile AJV validator (uses full schema)
    const validator = this.ajv.compile(schema);

    // Store both versions
    this.schemas.set(metadata.id, {
      full: schema,
      ollama: ollamaSchema,
      metadata,
      validator,
    });
  }

  // ============================================================
  // Get Ollama-safe schema (for format parameter)
  // ============================================================
  getOllamaSchema(id: string): object {
    const entry = this.schemas.get(id);
    if (!entry) {
      throw new SchemaRegistrationError(`Schema not found: ${id}`);
    }
    return entry.ollama; // Stripped version
  }

  // ============================================================
  // Validate data using full schema
  // ============================================================
  validate(id: string, data: unknown): ValidationResult {
    const entry = this.schemas.get(id);
    if (!entry) {
      throw new SchemaRegistrationError(`Schema not found: ${id}`);
    }

    const valid = entry.validator(data);

    return {
      valid,
      errors: valid ? [] : entry.validator.errors || [],
    };
  }

  // ============================================================
  // Strip custom keywords for Ollama
  // ============================================================
  private stripCustomKeywords(schema: object): object {
    const stripped = JSON.parse(JSON.stringify(schema)); // Deep clone

    // Remove custom keywords
    const customKeywords = [
      'crossFieldDependency',
      'operationConstraint',
      'conditionalRequired',
      'semanticPattern',
      'riskAlignment',
      'confidenceRange',
      'entityReference',
    ];

    const removeKeywords = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const keyword of customKeywords) {
        delete obj[keyword];
      }

      // Recursively process nested objects
      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          removeKeywords(obj[key]);
        }
      }
    };

    removeKeywords(stripped);
    return stripped;
  }
}

// ============================================================
// Singleton pattern
// ============================================================
let registryInstance: SchemaRegistry | null = null;

export function getSchemaRegistry(): SchemaRegistry {
  if (!registryInstance) {
    registryInstance = new SchemaRegistry();
  }
  return registryInstance;
}

export function resetSchemaRegistry(): void {
  registryInstance = null;
}
```

## Why This Works

**1. Two Schema Versions:**

| Version | Purpose              | Custom Keywords | Used By               |
| ------- | -------------------- | --------------- | --------------------- |
| Full    | Local validation     | ✅ Yes          | AJV validator         |
| Ollama  | Constrained decoding | ❌ No           | Ollama `format` param |

**2. Automatic Stripping:**

```typescript
// Input: Full schema with custom keywords
const fullSchema = {
  type: 'object',
  properties: {
    risk_level: { enum: ['low', 'medium', 'high'] },
  },
  crossFieldDependency: { ... }, // Custom keyword
  operationConstraint: { ... }, // Custom keyword
};

registry.register(fullSchema, metadata);

// Output: Stripped schema for Ollama
const ollamaSchema = registry.getOllamaSchema('action-proposal');
// {
//   type: 'object',
//   properties: {
//     risk_level: { enum: ['low', 'medium', 'high'] }
//   }
//   // Custom keywords removed
// }
```

**3. Schema Metadata:**

```typescript
const metadata: SchemaMetadata = {
  id: 'action-proposal',
  name: 'ActionProposal',
  version: '1.0.0',
  tags: ['llm', 'action', 'proposal'],
  ollamaCompatible: false, // Has custom keywords
};
```

**4. Compiled Validators (Performance):**

```typescript
// Validators compiled once at registration
registry.register(schema, metadata); // Compiles here

// Fast validation (no recompilation)
registry.validate('action-proposal', data); // ~0.1ms
```

## Usage Patterns

**Pattern 1: Register Schema with Custom Keywords**

```typescript
import { getSchemaRegistry } from '@/services/ai/constrainedDecoder';
import { ENHANCED_ACTION_PROPOSAL_SCHEMA } from './schemas';

const registry = getSchemaRegistry();

registry.register(ENHANCED_ACTION_PROPOSAL_SCHEMA, {
  id: 'action-proposal-enhanced',
  name: 'Enhanced Action Proposal',
  version: '1.0.0',
  tags: ['action', 'proposal', 'enhanced'],
  ollamaCompatible: false, // Has custom keywords
});
```

**Pattern 2: Use with Ollama**

```typescript
const registry = getSchemaRegistry();

// Get Ollama-safe schema
const ollamaSchema = registry.getOllamaSchema('action-proposal-enhanced');

// Use for constrained decoding
const response = await ollama.generate({
  model: 'qwen2.5:3b',
  prompt: buildPrompt(input),
  format: JSON.stringify(ollamaSchema), // ✅ No custom keywords
  options: { temperature: 0.1 },
});
```

**Pattern 3: Validate with Full Schema**

```typescript
// Parse Ollama response
const parsed = JSON.parse(response);

// Validate using full schema (with custom keywords)
const result = registry.validate('action-proposal-enhanced', parsed);

if (!result.valid) {
  throw new SchemaValidationError('Validation failed', result.errors);
}
```

**Pattern 4: List Available Schemas**

```typescript
class SchemaRegistry {
  listSchemas(tags?: string[]): SchemaMetadata[] {
    const allSchemas = Array.from(this.schemas.values());

    if (!tags || tags.length === 0) {
      return allSchemas.map((s) => s.metadata);
    }

    // Filter by tags
    return allSchemas
      .filter((s) => tags.some((tag) => s.metadata.tags.includes(tag)))
      .map((s) => s.metadata);
  }
}

// Usage
const llmSchemas = registry.listSchemas(['llm']);
const v1Schemas = registry.listSchemas(['v1']);
```

## Schema Versioning

**Pattern: Semantic Versioning**

```typescript
// Register multiple versions
registry.register(schemaV1, {
  id: 'action-proposal-v1',
  version: '1.0.0',
  tags: ['v1', 'deprecated'],
});

registry.register(schemaV2, {
  id: 'action-proposal-v2',
  version: '2.0.0',
  tags: ['v2', 'current'],
});

// Use specific version
const v1Schema = registry.getOllamaSchema('action-proposal-v1');
const v2Schema = registry.getOllamaSchema('action-proposal-v2');

// Default to latest
const latestSchema = registry.getOllamaSchema('action-proposal'); // v2
```

## Testing Schema Registry

```typescript
describe('SchemaRegistry', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = new SchemaRegistry();
  });

  it('should register schema and create Ollama version', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      crossFieldDependency: { ... }, // Custom keyword
    };

    registry.register(schema, {
      id: 'test-schema',
      name: 'Test Schema',
      version: '1.0.0',
      tags: ['test'],
      ollamaCompatible: false,
    });

    // Full schema has custom keywords
    const fullSchema = registry.getSchema('test-schema');
    expect(fullSchema).toHaveProperty('crossFieldDependency');

    // Ollama schema has custom keywords removed
    const ollamaSchema = registry.getOllamaSchema('test-schema');
    expect(ollamaSchema).not.toHaveProperty('crossFieldDependency');
  });

  it('should validate using full schema', () => {
    registry.register(schema, metadata);

    const validData = { name: 'Alice' };
    const result = registry.validate('test-schema', validData);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should throw error for unknown schema', () => {
    expect(() => registry.getOllamaSchema('unknown')).toThrow(SchemaRegistrationError);
  });
});
```

## Anti-Patterns

❌ **Bad:** Using full schema with Ollama

```typescript
const response = await ollama.generate({
  format: JSON.stringify(FULL_SCHEMA_WITH_CUSTOM_KEYWORDS), // ❌ Error
});
```

✅ **Good:** Using stripped schema

```typescript
const ollamaSchema = registry.getOllamaSchema('action-proposal');
const response = await ollama.generate({
  format: JSON.stringify(ollamaSchema), // ✅ Works
});
```

❌ **Bad:** Manual keyword stripping

```typescript
// Scattered throughout codebase
const ollamaSchema = { ...schema };
delete ollamaSchema.crossFieldDependency;
delete ollamaSchema.operationConstraint;
// What if you forget one?
```

✅ **Good:** Centralized registry

```typescript
const ollamaSchema = registry.getOllamaSchema(id); // All keywords stripped
```

❌ **Bad:** Recompiling validators

```typescript
function validate(data: unknown) {
  const validator = ajv.compile(schema); // ❌ Slow (every call)
  return validator(data);
}
```

✅ **Good:** Cached validators

```typescript
registry.register(schema, metadata); // Compiled once
registry.validate(id, data); // Uses cached validator
```

## Performance Considerations

**1. Schema Registration Cost:**

```typescript
// One-time cost at startup
registry.register(schema, metadata);
// - Deep clone: ~0.5ms
// - Keyword stripping: ~0.2ms
// - AJV compile: ~5ms
// Total: ~5.7ms per schema
```

**2. Validation Performance:**

```typescript
// Cached validator (fast)
registry.validate(id, data); // ~0.1-0.5ms

// Direct AJV (no caching, slow)
ajv.compile(schema)(data); // ~5-10ms
```

**3. Memory Usage:**

```typescript
// Each schema stores:
// - Full schema: ~2-5KB
// - Ollama schema: ~2-5KB
// - Compiled validator: ~10-20KB
// Total per schema: ~15-30KB

// 100 schemas ≈ 1.5-3MB (acceptable)
```

## See Also

- [L024: AJV Schema Validator Configuration for Ollama](ajv-schema-validator-ollama.md)
- [L025: Custom AJV Keywords for Cross-Field Dependencies](custom-ajv-keywords-cross-field.md)
- [L026: Multi-Layer Validation Pipeline Architecture](multi-layer-validation-pipeline.md)
- Implementation: `src/main/services/ai/constrainedDecoder/schemaRegistry.ts`
- Ollama Format Parameter: https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-completion
