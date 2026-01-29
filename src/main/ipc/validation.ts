/**
 * IPC Message Validation System
 * Validates IPC message payloads using JSON Schema (AJV)
 * AC-1.2.3.7: IPC message validation with JSON schema
 */

import Ajv, { type JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import type { IPCChannel, IPCChannelPayloads } from '../../types/ipc';

// ============================================================================
// Validator Setup
// ============================================================================

const ajv = new Ajv({
  allErrors: true,
  coerceTypes: false,
  useDefaults: true,
  removeAdditional: false,
  strict: true,
});

// Add format validators (email, uuid, date-time, etc.)
addFormats(ajv);

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Schema definitions for each IPC channel
 * Only includes schemas for channels that require validation
 */
const schemas: Partial<Record<IPCChannel, JSONSchemaType<any>>> = {
  // Input schemas
  'input:submit-text': {
    type: 'string',
    minLength: 1,
    maxLength: 10000,
  } as JSONSchemaType<string>,

  'input:confirm-transcription': {
    type: 'object',
    required: ['text', 'confidence', 'language', 'duration'],
    properties: {
      text: { type: 'string', minLength: 1 },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      language: { type: 'string', minLength: 2, maxLength: 10 },
      duration: { type: 'number', minimum: 0 },
    },
    additionalProperties: false,
  } as any,

  // Skill schemas
  'skills:list': {
    type: 'object',
    properties: {
      active: { type: 'boolean', nullable: true },
      category: { type: 'string', nullable: true },
    },
    additionalProperties: false,
    required: [],
  } as any,

  'skills:get': {
    type: 'object',
    required: ['skillId'],
    properties: {
      skillId: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  } as any,

  'skills:activate': {
    type: 'object',
    required: ['skillId'],
    properties: {
      skillId: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  } as any,

  'skills:deactivate': {
    type: 'object',
    required: ['skillId'],
    properties: {
      skillId: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  } as any,

  // Policy schemas
  'policies:get': {
    type: 'object',
    required: ['policyId'],
    properties: {
      policyId: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  } as any,

  'policies:evaluate': {
    type: 'object',
    required: ['skillId', 'action', 'context'],
    properties: {
      skillId: { type: 'string', format: 'uuid' },
      action: { type: 'string', minLength: 1 },
      context: { type: 'object' },
    },
    additionalProperties: false,
  } as any,

  // Trust schemas
  'trust:get-level': {
    type: 'object',
    required: ['skillId'],
    properties: {
      skillId: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  } as any,

  'trust:promote': {
    type: 'object',
    required: ['skillId', 'reason'],
    properties: {
      skillId: { type: 'string', format: 'uuid' },
      reason: { type: 'string', minLength: 1, maxLength: 500 },
    },
    additionalProperties: false,
  } as any,

  'trust:demote': {
    type: 'object',
    required: ['skillId', 'reason'],
    properties: {
      skillId: { type: 'string', format: 'uuid' },
      reason: { type: 'string', minLength: 1, maxLength: 500 },
    },
    additionalProperties: false,
  } as any,

  'trust:get-attestation-status': {
    type: 'object',
    required: ['skillId'],
    properties: {
      skillId: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  } as any,

  // Proposal schemas
  'proposals:confirm': {
    type: 'object',
    required: ['proposalId'],
    properties: {
      proposalId: { type: 'string', format: 'uuid' },
    },
    additionalProperties: false,
  } as any,

  'proposals:reject': {
    type: 'object',
    required: ['proposalId'],
    properties: {
      proposalId: { type: 'string', format: 'uuid' },
      reason: { type: 'string', nullable: true, maxLength: 500 },
    },
    additionalProperties: false,
  } as any,

  'proposals:get-history': {
    type: 'object',
    properties: {
      limit: { type: 'number', nullable: true, minimum: 1, maximum: 1000 },
      offset: { type: 'number', nullable: true, minimum: 0 },
      status: {
        type: 'string',
        nullable: true,
        enum: ['pending', 'approved', 'rejected', 'expired'],
      },
    },
    additionalProperties: false,
    required: [],
  } as any,

  // Audit schemas
  'audit:query': {
    type: 'object',
    properties: {
      startDate: { type: 'string', nullable: true, format: 'date-time' },
      endDate: { type: 'string', nullable: true, format: 'date-time' },
      skillId: { type: 'string', nullable: true, format: 'uuid' },
      actionType: { type: 'string', nullable: true },
      limit: { type: 'number', nullable: true, minimum: 1, maximum: 1000 },
      offset: { type: 'number', nullable: true, minimum: 0 },
    },
    additionalProperties: false,
    required: [],
  } as any,

  'audit:export': {
    type: 'object',
    required: ['format'],
    properties: {
      format: { type: 'string', enum: ['json', 'csv', 'pdf'] },
      startDate: { type: 'string', nullable: true, format: 'date-time' },
      endDate: { type: 'string', nullable: true, format: 'date-time' },
      skillId: { type: 'string', nullable: true, format: 'uuid' },
    },
    additionalProperties: false,
  } as any,

  'audit:get-stats': {
    type: 'object',
    required: ['period'],
    properties: {
      period: { type: 'string', enum: ['day', 'week', 'month', 'year'] },
    },
    additionalProperties: false,
  } as any,

  // MCP schemas
  'mcp:get-server': {
    type: 'object',
    required: ['serverId'],
    properties: {
      serverId: { type: 'string' },
    },
    additionalProperties: false,
  } as any,

  'mcp:list-tools': {
    type: 'object',
    required: ['serverId'],
    properties: {
      serverId: { type: 'string' },
    },
    additionalProperties: false,
  } as any,

  'mcp:call-tool': {
    type: 'object',
    required: ['serverId', 'toolName', 'arguments'],
    properties: {
      serverId: { type: 'string' },
      toolName: { type: 'string', minLength: 1 },
      arguments: { type: 'object' },
    },
    additionalProperties: false,
  } as any,
};

// Compile all schemas
const compiledValidators = new Map<IPCChannel, ReturnType<typeof ajv.compile>>();

for (const [channel, schema] of Object.entries(schemas) as Array<[IPCChannel, any]>) {
  try {
    const validate = ajv.compile(schema);
    compiledValidators.set(channel, validate);
  } catch (error) {
    console.error(`[IPC Validation] Failed to compile schema for ${channel}:`, error);
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Validate a payload for a given channel
 */
export function validatePayload<C extends IPCChannel>(
  channel: C,
  payload: unknown
): ValidationResult {
  const validator = compiledValidators.get(channel);

  // If no schema defined, consider it valid (no validation required)
  if (!validator) {
    return { valid: true };
  }

  const valid = validator(payload);

  if (!valid) {
    const errors = validator.errors?.map((err) => {
      const path = err.instancePath || 'root';
      return `${path}: ${err.message}`;
    });

    return {
      valid: false,
      errors: errors || ['Validation failed'],
    };
  }

  return { valid: true };
}

/**
 * Validate payload and throw on error
 * Useful for middleware/handler validation
 */
export function validatePayloadOrThrow<C extends IPCChannel>(
  channel: C,
  payload: unknown
): asserts payload is IPCChannelPayloads[C] {
  const result = validatePayload(channel, payload);

  if (!result.valid) {
    const errorMessage = `Invalid payload for ${channel}: ${result.errors?.join(', ')}`;
    throw new ValidationError(errorMessage, result.errors);
  }
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public validationErrors?: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// Schema Registration
// ============================================================================

/**
 * Register a custom schema for a channel
 * Useful for dynamic schema registration
 */
export function registerSchema<C extends IPCChannel>(
  channel: C,
  schema: JSONSchemaType<IPCChannelPayloads[C]>
): void {
  try {
    const validate = ajv.compile(schema);
    compiledValidators.set(channel, validate);
  } catch (error) {
    console.error(`[IPC Validation] Failed to register schema for ${channel}:`, error);
    throw error;
  }
}

/**
 * Check if a channel has a schema registered
 */
export function hasSchema(channel: IPCChannel): boolean {
  return compiledValidators.has(channel);
}

/**
 * Get all channels with schemas
 */
export function getValidatedChannels(): IPCChannel[] {
  return Array.from(compiledValidators.keys());
}
