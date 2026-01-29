/**
 * JSON Schema definitions for AJV validation
 *
 * These schemas are used to validate data at runtime, particularly
 * when loading from files or receiving from external sources.
 */

// Policy Constraint Schema
export const POLICY_CONSTRAINT_SCHEMA = {
  type: 'object',
  required: ['type', 'rule', 'error_message'],
  properties: {
    type: { type: 'string', enum: ['precondition', 'invariant', 'postcondition'] },
    rule: { type: 'string', minLength: 1 },
    error_message: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

// Skill Schema (for YAML file validation)
export const SKILL_SCHEMA = {
  type: 'object',
  required: [
    'id',
    'name',
    'description',
    'status',
    'origin',
    'enabled_operations',
    'policy_constraints',
    'required_trust_level',
    'priority',
    'data_domain',
    'conflict_resolution',
    'proposal_schema',
    'rollback_specification',
    'created_at',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: 'string', minLength: 1 },
    version_hash: { type: 'string' }, // Optional in input, calculated if not provided
    status: { type: 'string', enum: ['pending', 'active', 'deprecated'] },
    origin: { type: 'string', enum: ['human', 'ai'] },
    enabled_operations: {
      type: 'array',
      items: { type: 'string', pattern: '^[a-z_]+:[a-z_]+$' },
      minItems: 1,
      uniqueItems: true,
    },
    policy_constraints: {
      type: 'array',
      items: POLICY_CONSTRAINT_SCHEMA,
    },
    required_trust_level: { type: 'string', enum: ['OBSERVE', 'SUPERVISED', 'DELEGATED'] },
    priority: { type: 'integer', minimum: 0, maximum: 1000 },
    data_domain: { type: 'string', enum: ['enterprise', 'personal', 'both'] },
    conflict_resolution: { type: 'string', enum: ['policy_escalation', 'user_choice'] },
    proposal_schema: { type: 'object' },
    rollback_specification: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string', enum: ['FULL', 'PARTIAL', 'COMPENSATABLE', 'IRREVERSIBLE'] },
        steps: { type: 'array', items: { type: 'string' } },
        conditions: { type: 'array', items: { type: 'string' } },
        warning: { type: 'string' },
      },
    },
    created_at: { type: 'string', format: 'date-time' },
    activated_at: { type: ['string', 'null'], format: 'date-time' },
    activated_by: { type: ['string', 'null'] },
  },
  additionalProperties: false,
} as const;

// Policy Rule Schema
export const POLICY_RULE_SCHEMA = {
  type: 'object',
  required: ['type'],
  properties: {
    type: { type: 'string', enum: ['allow', 'deny', 'require_confirmation'] },
    operations: {
      type: 'array',
      items: { type: 'string', pattern: '^[a-z_]+:[a-z_]+$' },
      uniqueItems: true,
    },
    conditions: { type: 'object' },
    reason: { type: 'string' },
  },
  additionalProperties: false,
} as const;

// Policy Schema (for YAML file validation)
export const POLICY_SCHEMA = {
  type: 'object',
  required: ['id', 'name', 'description', 'rules', 'priority', 'enabled', 'created_at'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: 'string', minLength: 1 },
    version_hash: { type: 'string' }, // Optional in input, calculated if not provided
    rules: {
      type: 'array',
      items: POLICY_RULE_SCHEMA,
      minItems: 1,
    },
    priority: { type: 'integer', minimum: 0, maximum: 1000 },
    enabled: { type: 'boolean' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
  },
  additionalProperties: false,
} as const;

// Entity Reference Schema
export const ENTITY_REFERENCE_SCHEMA = {
  type: 'object',
  required: ['type', 'id', 'source'],
  properties: {
    type: { type: 'string', minLength: 1 },
    id: { type: 'string', minLength: 1 },
    source: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

// Skill Reference Schema
export const SKILL_REFERENCE_SCHEMA = {
  type: 'object',
  required: ['id', 'version_hash'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    version_hash: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

// Rollback Plan Schema
export const ROLLBACK_PLAN_SCHEMA = {
  type: 'object',
  required: ['steps', 'success_probability', 'description'],
  properties: {
    steps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['operation', 'target', 'parameters'],
        properties: {
          operation: { type: 'string', pattern: '^[a-z_]+:[a-z_]+$' },
          target: ENTITY_REFERENCE_SCHEMA,
          parameters: { type: 'object' },
        },
      },
    },
    success_probability: { type: 'number', minimum: 0, maximum: 1 },
    description: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
} as const;

// Action Proposal Schema
export const ACTION_PROPOSAL_SCHEMA = {
  type: 'object',
  required: [
    'id',
    'timestamp',
    'intent',
    'operation',
    'data_domain',
    'data_classification',
    'reversibility',
    'confidence',
    'related_skills',
    'evaluation_model',
    'raw_user_input',
    'requires_confirmation',
    'risk_level',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    timestamp: { type: 'string', format: 'date-time' },
    intent: { type: 'string', minLength: 1 },
    operation: { type: 'string', pattern: '^[a-z_]+:[a-z_]+$' },
    target_entity: { oneOf: [{ type: 'null' }, ENTITY_REFERENCE_SCHEMA] },
    data_domain: { type: 'string', enum: ['enterprise', 'personal'] },
    data_classification: {
      type: 'string',
      enum: ['public', 'internal', 'confidential', 'restricted'],
    },
    reversibility: { type: 'string', enum: ['FULL', 'PARTIAL', 'COMPENSATABLE', 'IRREVERSIBLE'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    related_skills: {
      type: 'array',
      items: SKILL_REFERENCE_SCHEMA,
    },
    rollback_plan: { oneOf: [{ type: 'null' }, ROLLBACK_PLAN_SCHEMA] },
    evaluation_model: { type: 'string', minLength: 1 },
    raw_user_input: { type: 'string', minLength: 1 },
    requires_confirmation: { type: 'boolean' },
    risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
    policy_result: { type: 'object' },
    user_decision: { type: 'string', enum: ['approved', 'denied'] },
    executed_at: { type: 'string', format: 'date-time' },
    execution_result: { type: 'object' },
  },
  additionalProperties: false,
} as const;

// Export all schemas
export const SCHEMAS = {
  POLICY_CONSTRAINT: POLICY_CONSTRAINT_SCHEMA,
  SKILL: SKILL_SCHEMA,
  POLICY_RULE: POLICY_RULE_SCHEMA,
  POLICY: POLICY_SCHEMA,
  ENTITY_REFERENCE: ENTITY_REFERENCE_SCHEMA,
  SKILL_REFERENCE: SKILL_REFERENCE_SCHEMA,
  ROLLBACK_PLAN: ROLLBACK_PLAN_SCHEMA,
  ACTION_PROPOSAL: ACTION_PROPOSAL_SCHEMA,
} as const;
