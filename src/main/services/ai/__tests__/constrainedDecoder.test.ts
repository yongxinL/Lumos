/**
 * Constrained JSON Decoder Tests
 *
 * Comprehensive tests for the constrained decoding module:
 * - ConstrainedJsonDecoder
 * - SchemaRegistry
 * - SemanticValidator
 * - ValidationHooksManager
 * - Custom AJV Keywords
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SchemaRegistry,
  SemanticValidator,
  ValidationHooksManager,
  createActionProposalDecoder,
  createEnhancedActionProposalDecoder,
  createActionProposalValidator,
  createActionProposalRules,
  createActionProposalHooksManager,
  createActionProposalHooks,
  resetSchemaRegistry,
  getActionProposalDecoder,
  resetActionProposalDecoder,
  ACTION_PROPOSAL_SCHEMA_ID,
  ENHANCED_ACTION_PROPOSAL_SCHEMA_ID,
  // Errors
  ConstrainedDecoderError,
  SchemaValidationError,
  SemanticValidationError,
  DecodingError,
  SchemaRegistrationError,
  ValidationHookError,
  type SemanticRule,
  type ValidationHook,
} from '../constrainedDecoder';

// ============================================================================
// Test Schemas
// ============================================================================

const testSchema = {
  type: 'object',
  required: ['name', 'value'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    value: { type: 'number', minimum: 0, maximum: 100 },
    optional: { type: 'string' },
  },
  additionalProperties: false,
};

const validTestData = {
  name: 'test',
  value: 50,
};

const validActionProposal = {
  intent: 'Create a new incident for server downtime',
  operation: 'incident:create',
  target_entity: null,
  data_domain: 'enterprise',
  data_classification: 'internal',
  reversibility: 'FULL',
  confidence: 0.9,
  requires_confirmation: true,
  risk_level: 'medium',
};

// ============================================================================
// SchemaRegistry Tests
// ============================================================================

describe('SchemaRegistry', () => {
  let registry: SchemaRegistry;

  beforeEach(() => {
    registry = new SchemaRegistry();
  });

  describe('register', () => {
    it('should register a schema successfully', () => {
      registry.register(testSchema, {
        id: 'test',
        name: 'Test Schema',
        description: 'A test schema',
        version: '1.0.0',
        tags: ['test'],
        ollamaCompatible: true,
      });

      expect(registry.has('test')).toBe(true);
    });

    it('should throw when registering duplicate schema', () => {
      registry.register(testSchema, {
        id: 'test',
        name: 'Test Schema',
        description: 'A test schema',
        version: '1.0.0',
        tags: ['test'],
        ollamaCompatible: true,
      });

      expect(() =>
        registry.register(testSchema, {
          id: 'test',
          name: 'Test Schema',
          description: 'A test schema',
          version: '1.0.0',
          tags: ['test'],
          ollamaCompatible: true,
        })
      ).toThrow(SchemaRegistrationError);
    });

    it('should throw for invalid schema', () => {
      const invalidSchema = {
        type: 'invalid-type', // Invalid type
      };

      expect(() =>
        registry.register(invalidSchema, {
          id: 'invalid',
          name: 'Invalid Schema',
          description: 'An invalid schema',
          version: '1.0.0',
          tags: [],
          ollamaCompatible: false,
        })
      ).toThrow(SchemaRegistrationError);
    });
  });

  describe('validate', () => {
    beforeEach(() => {
      registry.register(testSchema, {
        id: 'test',
        name: 'Test Schema',
        description: 'A test schema',
        version: '1.0.0',
        tags: ['test'],
        ollamaCompatible: true,
      });
    });

    it('should validate valid data', () => {
      const result = registry.validate('test', validTestData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid data with detailed errors', () => {
      const result = registry.validate('test', { name: '', value: 150 });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.path.includes('name'))).toBe(true);
      expect(result.errors.some((e) => e.path.includes('value'))).toBe(true);
    });

    it('should throw for non-existent schema', () => {
      expect(() => registry.validate('nonexistent', {})).toThrow(SchemaRegistrationError);
    });
  });

  describe('getOllamaSchema', () => {
    it('should strip custom keywords for Ollama', () => {
      const schemaWithCustomKeywords = {
        ...testSchema,
        crossFieldDependency: { when: { field: 'test' }, then: [] },
        operationConstraint: [],
      };

      registry.register(schemaWithCustomKeywords, {
        id: 'custom',
        name: 'Custom Schema',
        description: 'Schema with custom keywords',
        version: '1.0.0',
        tags: [],
        ollamaCompatible: false,
      });

      const ollamaSchema = registry.getOllamaSchema('custom');

      expect(ollamaSchema).not.toHaveProperty('crossFieldDependency');
      expect(ollamaSchema).not.toHaveProperty('operationConstraint');
      expect(ollamaSchema).toHaveProperty('type');
      expect(ollamaSchema).toHaveProperty('properties');
    });
  });

  describe('metadata', () => {
    it('should store and retrieve metadata', () => {
      registry.register(testSchema, {
        id: 'test',
        name: 'Test Schema',
        description: 'A test schema',
        version: '1.0.0',
        tags: ['test', 'example'],
        ollamaCompatible: true,
      });

      const metadata = registry.getMetadata('test');

      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('Test Schema');
      expect(metadata?.version).toBe('1.0.0');
      expect(metadata?.tags).toContain('test');
      expect(metadata?.ollamaCompatible).toBe(true);
    });

    it('should track registration timestamp', () => {
      const before = new Date().toISOString();
      registry.register(testSchema, {
        id: 'test',
        name: 'Test Schema',
        description: 'A test schema',
        version: '1.0.0',
        tags: [],
        ollamaCompatible: true,
      });
      const after = new Date().toISOString();

      const metadata = registry.getMetadata('test');

      expect(metadata?.registeredAt).toBeDefined();
      expect(metadata!.registeredAt >= before).toBe(true);
      expect(metadata!.registeredAt <= after).toBe(true);
    });
  });
});

// ============================================================================
// SemanticValidator Tests
// ============================================================================

describe('SemanticValidator', () => {
  let validator: SemanticValidator<Record<string, unknown>>;

  beforeEach(() => {
    validator = new SemanticValidator();
  });

  describe('rule management', () => {
    it('should add rules', () => {
      const rule: SemanticRule<Record<string, unknown>> = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'A test rule',
        severity: 'error',
        validate: () => true,
        errorMessage: 'Test error',
        fields: ['test'],
      };

      validator.addRule(rule);

      expect(validator.getRule('test-rule')).toBeDefined();
      expect(validator.getAllRules()).toHaveLength(1);
    });

    it('should throw for duplicate rule IDs', () => {
      const rule: SemanticRule<Record<string, unknown>> = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'A test rule',
        severity: 'error',
        validate: () => true,
        errorMessage: 'Test error',
        fields: ['test'],
      };

      validator.addRule(rule);

      expect(() => validator.addRule(rule)).toThrow();
    });

    it('should remove rules', () => {
      const rule: SemanticRule<Record<string, unknown>> = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'A test rule',
        severity: 'error',
        validate: () => true,
        errorMessage: 'Test error',
        fields: ['test'],
      };

      validator.addRule(rule);
      expect(validator.removeRule('test-rule')).toBe(true);
      expect(validator.getRule('test-rule')).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should pass valid data', () => {
      const rule: SemanticRule<Record<string, unknown>> = {
        id: 'positive-value',
        name: 'Positive Value',
        description: 'Value must be positive',
        severity: 'error',
        validate: (data) => (data.value as number) > 0,
        errorMessage: 'Value must be positive',
        fields: ['value'],
      };

      validator.addRule(rule);
      const result = validator.validate({ value: 10 });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail invalid data', () => {
      const rule: SemanticRule<Record<string, unknown>> = {
        id: 'positive-value',
        name: 'Positive Value',
        description: 'Value must be positive',
        severity: 'error',
        validate: (data) => (data.value as number) > 0,
        errorMessage: 'Value must be positive',
        fields: ['value'],
      };

      validator.addRule(rule);
      const result = validator.validate({ value: -5 });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Value must be positive');
    });

    it('should apply auto-correction', () => {
      const rule: SemanticRule<Record<string, unknown>> = {
        id: 'clamp-value',
        name: 'Clamp Value',
        description: 'Value must be between 0 and 100',
        severity: 'error',
        validate: (data) => {
          const value = data.value as number;
          return value >= 0 && value <= 100;
        },
        errorMessage: 'Value out of range',
        autoCorrect: (data) => {
          const value = data.value as number;
          const corrected = { ...data, value: Math.max(0, Math.min(100, value)) };
          return {
            corrected,
            corrections: [
              {
                path: '/value',
                from: value,
                to: corrected.value,
                reason: 'Clamped to range [0, 100]',
                ruleId: 'clamp-value',
              },
            ],
          };
        },
        fields: ['value'],
      };

      validator.addRule(rule);
      const result = validator.validate({ value: 150 }, { autoCorrect: true });

      expect(result.valid).toBe(true);
      expect(result.data.value).toBe(100);
      expect(result.corrections).toHaveLength(1);
    });

    it('should handle warnings without failing', () => {
      const rule: SemanticRule<Record<string, unknown>> = {
        id: 'recommend-name',
        name: 'Recommend Name',
        description: 'Name should be provided',
        severity: 'warning',
        validate: (data) => !!data.name,
        errorMessage: 'Name is recommended',
        fields: ['name'],
      };

      validator.addRule(rule);
      const result = validator.validate({ value: 10 }); // No name

      expect(result.valid).toBe(true); // Warnings don't fail
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('ActionProposal rules', () => {
    it('should create pre-built rules', () => {
      const rules = createActionProposalRules();

      expect(rules.length).toBeGreaterThan(10);
      expect(rules.some((r) => r.id === 'confidence-range')).toBe(true);
      expect(rules.some((r) => r.id === 'operation-format')).toBe(true);
      expect(rules.some((r) => r.id === 'high-risk-confirmation')).toBe(true);
    });

    it('should validate valid ActionProposal', () => {
      const validator = createActionProposalValidator();
      const result = validator.validate(validActionProposal);

      expect(result.valid).toBe(true);
    });

    it('should correct delete operation to high risk', () => {
      const validator = createActionProposalValidator();
      const data = {
        ...validActionProposal,
        operation: 'incident:delete',
        risk_level: 'low', // Should be corrected to high
      };

      const result = validator.validate(data, { autoCorrect: true });

      expect(result.valid).toBe(true);
      expect(result.data.risk_level).toBe('high');
      expect(result.corrections.some((c) => c.path === '/risk_level')).toBe(true);
    });

    it('should correct read operation to low risk', () => {
      const validator = createActionProposalValidator();
      const data = {
        ...validActionProposal,
        operation: 'incident:read',
        risk_level: 'high', // Should be corrected to low
        requires_confirmation: true, // Should be corrected to false
      };

      const result = validator.validate(data, { autoCorrect: true });

      expect(result.data.risk_level).toBe('low');
      expect(result.data.requires_confirmation).toBe(false);
    });
  });
});

// ============================================================================
// ValidationHooksManager Tests
// ============================================================================

describe('ValidationHooksManager', () => {
  let manager: ValidationHooksManager<Record<string, unknown>>;

  beforeEach(() => {
    manager = new ValidationHooksManager();
  });

  describe('hook registration', () => {
    it('should register hooks', () => {
      const hook: ValidationHook<Record<string, unknown>> = {
        id: 'test-hook',
        name: 'Test Hook',
        description: 'A test hook',
        phase: 'pre-validation',
        priority: 10,
        enabled: true,
        execute: (ctx) => ctx.data,
      };

      manager.register(hook);

      expect(manager.hasHook('test-hook')).toBe(true);
    });

    it('should throw for duplicate hook IDs', () => {
      const hook: ValidationHook<Record<string, unknown>> = {
        id: 'test-hook',
        name: 'Test Hook',
        description: 'A test hook',
        phase: 'pre-validation',
        priority: 10,
        enabled: true,
        execute: () => {},
      };

      manager.register(hook);

      expect(() => manager.register(hook)).toThrow();
    });

    it('should execute hooks in priority order', () => {
      const executionOrder: number[] = [];

      manager.register({
        id: 'hook-3',
        name: 'Hook 3',
        description: 'Third hook',
        phase: 'pre-validation',
        priority: 30,
        enabled: true,
        execute: () => {
          executionOrder.push(30);
        },
      });

      manager.register({
        id: 'hook-1',
        name: 'Hook 1',
        description: 'First hook',
        phase: 'pre-validation',
        priority: 10,
        enabled: true,
        execute: () => {
          executionOrder.push(10);
        },
      });

      manager.register({
        id: 'hook-2',
        name: 'Hook 2',
        description: 'Second hook',
        phase: 'pre-validation',
        priority: 20,
        enabled: true,
        execute: () => {
          executionOrder.push(20);
        },
      });

      manager.executePhase('pre-validation', {}, 'test');

      expect(executionOrder).toEqual([10, 20, 30]);
    });

    it('should skip disabled hooks', () => {
      const executed: string[] = [];

      manager.register({
        id: 'enabled-hook',
        name: 'Enabled Hook',
        description: 'An enabled hook',
        phase: 'pre-validation',
        priority: 10,
        enabled: true,
        execute: () => {
          executed.push('enabled');
        },
      });

      manager.register({
        id: 'disabled-hook',
        name: 'Disabled Hook',
        description: 'A disabled hook',
        phase: 'pre-validation',
        priority: 20,
        enabled: false,
        execute: () => {
          executed.push('disabled');
        },
      });

      const result = manager.executePhase('pre-validation', {}, 'test');

      expect(executed).toEqual(['enabled']);
      expect(result.skippedHooks).toContain('disabled-hook');
    });
  });

  describe('hook execution', () => {
    it('should transform data through hooks', () => {
      manager.register({
        id: 'uppercase-name',
        name: 'Uppercase Name',
        description: 'Uppercase the name',
        phase: 'pre-validation',
        priority: 10,
        enabled: true,
        execute: (ctx) => ({
          ...ctx.data,
          name: (ctx.data.name as string).toUpperCase(),
        }),
      });

      const result = manager.executePhase('pre-validation', { name: 'test' }, 'test');

      expect(result.data.name).toBe('TEST');
    });

    it('should pass metadata through hooks', () => {
      let receivedMetadata: Record<string, unknown> | undefined;

      manager.register({
        id: 'capture-metadata',
        name: 'Capture Metadata',
        description: 'Capture metadata',
        phase: 'pre-validation',
        priority: 10,
        enabled: true,
        execute: (ctx) => {
          receivedMetadata = ctx.metadata;
        },
      });

      manager.executePhase('pre-validation', {}, 'test', { custom: 'value' });

      expect(receivedMetadata).toEqual({ custom: 'value' });
    });

    it('should collect warnings', () => {
      manager.register({
        id: 'warn-hook',
        name: 'Warning Hook',
        description: 'Adds a warning',
        phase: 'pre-validation',
        priority: 10,
        enabled: true,
        execute: (ctx) => {
          ctx.addWarning('This is a warning');
        },
      });

      const result = manager.executePhase('pre-validation', {}, 'test');

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('This is a warning');
    });
  });

  describe('ActionProposal hooks', () => {
    it('should create pre-built hooks', () => {
      const hooks = createActionProposalHooks();

      expect(hooks.length).toBeGreaterThan(3);
      expect(hooks.some((h) => h.id === 'normalize-whitespace')).toBe(true);
      expect(hooks.some((h) => h.id === 'lowercase-operation')).toBe(true);
    });

    it('should normalize whitespace', () => {
      const manager = createActionProposalHooksManager();
      const result = manager.executePhase(
        'pre-validation',
        { intent: '  hello   world  ' },
        'test'
      );

      expect(result.data.intent).toBe('hello world');
    });

    it('should lowercase operation', () => {
      const manager = createActionProposalHooksManager();
      const result = manager.executePhase(
        'pre-validation',
        { operation: 'INCIDENT:CREATE' },
        'test'
      );

      expect(result.data.operation).toBe('incident:create');
    });
  });
});

// ============================================================================
// ConstrainedJsonDecoder Tests
// ============================================================================

describe('ConstrainedJsonDecoder', () => {
  beforeEach(() => {
    resetSchemaRegistry();
    resetActionProposalDecoder();
  });

  afterEach(() => {
    resetSchemaRegistry();
    resetActionProposalDecoder();
  });

  describe('decode', () => {
    it('should decode valid JSON', async () => {
      const decoder = createActionProposalDecoder();
      const result = await decoder.decode(JSON.stringify(validActionProposal));

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.intent).toBe(validActionProposal.intent);
    });

    it('should fail on invalid JSON', async () => {
      const decoder = createActionProposalDecoder();
      const result = await decoder.decode('{ invalid json }');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('parsing');
    });

    it('should fail on schema validation errors', async () => {
      const decoder = createActionProposalDecoder();
      const result = await decoder.decode(JSON.stringify({ name: 'test' })); // Missing required fields

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('schema');
    });

    it('should apply auto-corrections', async () => {
      const decoder = createActionProposalDecoder();
      const data = {
        ...validActionProposal,
        operation: 'incident:delete',
        risk_level: 'low', // Should be corrected
      };
      const result = await decoder.decode(JSON.stringify(data));

      expect(result.success).toBe(true);
      expect(result.data?.risk_level).toBe('high');
      expect(result.corrections.length).toBeGreaterThan(0);
    });

    it('should include metrics', async () => {
      const decoder = createActionProposalDecoder();
      const result = await decoder.decode(JSON.stringify(validActionProposal));

      expect(result.metrics.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.parsingDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.schemaDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.semanticDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('decodeSync', () => {
    it('should decode valid JSON synchronously', () => {
      const decoder = createActionProposalDecoder();
      const result = decoder.decodeSync(JSON.stringify(validActionProposal));

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should fail on invalid JSON synchronously', () => {
      const decoder = createActionProposalDecoder();
      const result = decoder.decodeSync('not json');

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('parsing');
    });
  });

  describe('decodeOrThrow', () => {
    it('should return data on success', async () => {
      const decoder = createActionProposalDecoder();
      const data = await decoder.decodeOrThrow(JSON.stringify(validActionProposal));

      expect(data).toBeDefined();
      expect(data.intent).toBe(validActionProposal.intent);
    });

    it('should throw DecodingError on parse failure', async () => {
      const decoder = createActionProposalDecoder();

      await expect(decoder.decodeOrThrow('invalid')).rejects.toThrow(DecodingError);
    });

    it('should throw SchemaValidationError on schema failure', async () => {
      const decoder = createActionProposalDecoder();

      await expect(decoder.decodeOrThrow(JSON.stringify({}))).rejects.toThrow(
        SchemaValidationError
      );
    });
  });

  describe('getOllamaSchema', () => {
    it('should return JSON string for Ollama', () => {
      const decoder = createActionProposalDecoder();
      const schema = decoder.getOllamaSchema();

      expect(typeof schema).toBe('string');
      const parsed = JSON.parse(schema);
      expect(parsed.type).toBe('object');
      expect(parsed.properties).toBeDefined();
    });
  });

  describe('factory functions', () => {
    it('should create standard decoder', () => {
      const decoder = createActionProposalDecoder();

      expect(decoder).toBeDefined();
      expect(decoder.getSchemaMetadata()?.id).toBe(ACTION_PROPOSAL_SCHEMA_ID);
    });

    it('should create enhanced decoder', () => {
      const decoder = createEnhancedActionProposalDecoder();

      expect(decoder).toBeDefined();
      expect(decoder.getSchemaMetadata()?.id).toBe(ENHANCED_ACTION_PROPOSAL_SCHEMA_ID);
    });

    it('should return singleton instance', () => {
      const decoder1 = getActionProposalDecoder();
      const decoder2 = getActionProposalDecoder();

      expect(decoder1).toBe(decoder2);
    });

    it('should reset singleton instance', () => {
      const decoder1 = getActionProposalDecoder();
      resetActionProposalDecoder();
      const decoder2 = getActionProposalDecoder();

      expect(decoder1).not.toBe(decoder2);
    });
  });
});

// ============================================================================
// Error Classes Tests
// ============================================================================

describe('Error Classes', () => {
  describe('ConstrainedDecoderError', () => {
    it('should create with message', () => {
      const error = new ConstrainedDecoderError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ConstrainedDecoderError');
      expect(error.timestamp).toBeDefined();
    });

    it('should preserve cause stack trace', () => {
      const cause = new Error('Cause error');
      const error = new ConstrainedDecoderError('Test error', cause);

      expect(error.stack).toContain('Caused by:');
    });

    it('should serialize to JSON', () => {
      const error = new ConstrainedDecoderError('Test error');
      const json = error.toJSON();

      expect(json.name).toBe('ConstrainedDecoderError');
      expect(json.message).toBe('Test error');
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('SchemaValidationError', () => {
    it('should store validation errors', () => {
      const errors = [
        { path: '/name', message: 'Required', keyword: 'required' },
        { path: '/value', message: 'Must be number', keyword: 'type' },
      ];
      const error = new SchemaValidationError('Validation failed', 'test', errors);

      expect(error.errors).toHaveLength(2);
      expect(error.schemaId).toBe('test');
      expect(error.errorCount).toBe(2);
    });

    it('should generate recovery suggestions', () => {
      const errors = [
        { path: '/name', message: 'Required', keyword: 'required' },
        { path: '/value', message: 'Must be number', keyword: 'type', expected: 'number' },
      ];
      const error = new SchemaValidationError('Validation failed', 'test', errors);

      expect(error.recoverySuggestions.length).toBeGreaterThan(0);
    });

    it('should group errors by path', () => {
      const errors = [
        { path: '/name', message: 'Error 1', keyword: 'required' },
        { path: '/name', message: 'Error 2', keyword: 'minLength' },
        { path: '/value', message: 'Error 3', keyword: 'type' },
      ];
      const error = new SchemaValidationError('Validation failed', 'test', errors);
      const grouped = error.getErrorsByPath();

      expect(grouped.get('/name')).toHaveLength(2);
      expect(grouped.get('/value')).toHaveLength(1);
    });
  });

  describe('DecodingError', () => {
    it('should store raw input', () => {
      const error = new DecodingError('Parse failed', '{ invalid }');

      expect(error.rawInput).toBe('{ invalid }');
    });

    it('should provide error context', () => {
      const longInput = 'a'.repeat(200);
      const error = new DecodingError('Parse failed', longInput, 100);

      const context = error.getErrorContext(50);

      expect(context.length).toBeLessThan(longInput.length);
      expect(context).toContain('...');
    });
  });

  describe('SemanticValidationError', () => {
    it('should store auto-corrections', () => {
      const corrections = [
        { path: '/risk_level', from: 'low', to: 'high', reason: 'Delete requires high risk' },
      ];
      const error = new SemanticValidationError(
        'Validation failed',
        'delete-risk',
        [],
        corrections
      );

      expect(error.hasAutoCorrections).toBe(true);
      expect(error.autoCorrections).toHaveLength(1);
    });
  });

  describe('ValidationHookError', () => {
    it('should store hook information', () => {
      const error = new ValidationHookError('Hook failed', 'test-hook', 'pre-validation');

      expect(error.hookName).toBe('test-hook');
      expect(error.phase).toBe('pre-validation');
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  beforeEach(() => {
    resetSchemaRegistry();
    resetActionProposalDecoder();
  });

  afterEach(() => {
    resetSchemaRegistry();
    resetActionProposalDecoder();
  });

  it('should process complete ActionProposal flow', async () => {
    const decoder = createActionProposalDecoder();

    // Valid proposal
    const result = await decoder.decode(JSON.stringify(validActionProposal));

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      intent: validActionProposal.intent,
      operation: validActionProposal.operation,
      risk_level: validActionProposal.risk_level,
    });
  });

  it('should handle and correct invalid proposals', async () => {
    const decoder = createActionProposalDecoder();

    const invalidProposal = {
      intent: 'Delete all incidents',
      operation: 'INCIDENT:DELETE', // Wrong case, should be lowercase
      target_entity: null,
      data_domain: 'enterprise',
      data_classification: 'internal',
      reversibility: 'FULL', // Wrong for delete, should be IRREVERSIBLE
      confidence: 0.95,
      requires_confirmation: false, // Wrong for delete, should be true
      risk_level: 'low', // Wrong for delete, should be high
    };

    const result = await decoder.decode(JSON.stringify(invalidProposal));

    expect(result.success).toBe(true);
    expect(result.data?.operation).toBe('incident:delete');
    expect(result.data?.risk_level).toBe('high');
    expect(result.data?.requires_confirmation).toBe(true);
    expect(result.data?.reversibility).toBe('IRREVERSIBLE');
    expect(result.corrections.length).toBeGreaterThan(0);
  });

  it('should reject fundamentally invalid proposals', async () => {
    const decoder = createActionProposalDecoder();

    const invalidProposal = {
      intent: 'ab', // Too short
      operation: 'invalid-format', // Wrong format
      target_entity: null,
      data_domain: 'invalid', // Not in enum
      data_classification: 'internal',
      reversibility: 'FULL',
      confidence: 1.5, // Out of range
      requires_confirmation: true,
      risk_level: 'medium',
    };

    const result = await decoder.decode(JSON.stringify(invalidProposal));

    expect(result.success).toBe(false);
    expect(result.error?.type).toBe('schema');
  });

  it('should track all corrections made', async () => {
    const decoder = createActionProposalDecoder();

    const proposal = {
      intent: '  Delete server  ', // Extra whitespace
      operation: 'FILE:DELETE', // Uppercase
      target_entity: null,
      data_domain: 'enterprise',
      data_classification: 'internal',
      reversibility: 'PARTIAL', // Wrong
      confidence: 0.9,
      requires_confirmation: false, // Wrong
      risk_level: 'medium', // Wrong
    };

    const result = await decoder.decode(JSON.stringify(proposal));

    expect(result.success).toBe(true);
    // Hooks correct whitespace and case
    expect(result.data?.intent).toBe('Delete server');
    expect(result.data?.operation).toBe('file:delete');
    // Semantic rules correct risk, confirmation, reversibility
    expect(result.corrections.length).toBeGreaterThan(0);
  });

  it('should provide detailed metrics', async () => {
    const decoder = createActionProposalDecoder();
    const result = await decoder.decode(JSON.stringify(validActionProposal));

    expect(result.metrics.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(result.metrics.rulesEvaluated).toBeGreaterThan(0);
    expect(result.metrics.hooksExecuted).toBeGreaterThan(0);
    expect(result.schema.id).toBe(ACTION_PROPOSAL_SCHEMA_ID);
  });
});
