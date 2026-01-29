/**
 * Constrained JSON Decoder Module
 *
 * Advanced JSON decoding with multi-layer validation for LLM-generated content.
 *
 * Components:
 * - ConstrainedJsonDecoder: Main decoder class with full validation pipeline
 * - SchemaRegistry: Centralized schema management and caching
 * - SemanticValidator: Business rule validation with auto-correction
 * - ValidationHooksManager: Extensible hook system
 * - Custom AJV Keywords: Cross-field dependency validation
 *
 * Usage:
 * ```typescript
 * import {
 *   createActionProposalDecoder,
 *   type DecodeResult
 * } from '@/main/services/ai/constrainedDecoder';
 *
 * const decoder = createActionProposalDecoder();
 * const result = await decoder.decode(llmOutput);
 *
 * if (result.success) {
 *   const proposal = result.data;
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */

// Main decoder
export {
  ConstrainedJsonDecoder,
  type DecodeOptions,
  type DecodeResult,
  type DecoderConfig,
} from './constrainedJsonDecoder';

// Schema registry
export {
  SchemaRegistry,
  getSchemaRegistry,
  resetSchemaRegistry,
  type SchemaMetadata,
  type SchemaRegistryOptions,
  type SchemaValidationResult,
} from './schemaRegistry';

// Semantic validator
export {
  SemanticValidator,
  createActionProposalValidator,
  createActionProposalRules,
  type SemanticRule,
  type SemanticValidationResult,
  type CorrectionRecord,
} from './semanticValidator';

// Validation hooks
export {
  ValidationHooksManager,
  createActionProposalHooksManager,
  createActionProposalHooks,
  type ValidationHook,
  type SyncValidationHook,
  type AsyncValidationHook,
  type HookContext,
  type HookPhase,
  type HookExecutionResult,
} from './validationHooks';

// Custom keywords
export {
  registerCustomKeywords,
  type CrossFieldDependency,
  type OperationConstraint,
} from './customKeywords';

// Errors
export {
  ConstrainedDecoderError,
  SchemaValidationError,
  SemanticValidationError,
  DecodingError,
  SchemaRegistrationError,
  ValidationHookError,
  type ValidationErrorDetail,
  type RecoverySuggestion,
} from './errors';

// ============================================================================
// Factory Functions
// ============================================================================

import { ConstrainedJsonDecoder } from './constrainedJsonDecoder';
import { getSchemaRegistry } from './schemaRegistry';
import { createActionProposalValidator } from './semanticValidator';
import { createActionProposalHooksManager } from './validationHooks';
import { ACTION_PROPOSAL_SCHEMA } from '@/types/schemas/actionProposal.schema';

/**
 * Schema ID for ActionProposal
 */
export const ACTION_PROPOSAL_SCHEMA_ID = 'actionProposal';

/**
 * Create a pre-configured decoder for ActionProposal
 *
 * Includes:
 * - ActionProposal JSON Schema
 * - All semantic validation rules (14 rules)
 * - All validation hooks (6 hooks)
 * - Custom AJV keywords registered
 */
export function createActionProposalDecoder(): ConstrainedJsonDecoder<Record<string, unknown>> {
  const registry = getSchemaRegistry();

  // Register ActionProposal schema if not already registered
  if (!registry.has(ACTION_PROPOSAL_SCHEMA_ID)) {
    registry.register(ACTION_PROPOSAL_SCHEMA as Record<string, unknown>, {
      id: ACTION_PROPOSAL_SCHEMA_ID,
      name: 'ActionProposal',
      description: 'Schema for AI-generated action proposals',
      version: '1.0.0',
      tags: ['proposal', 'governance', 'ai'],
      ollamaCompatible: true,
    });
  }

  // Create decoder with semantic validator and hooks
  return new ConstrainedJsonDecoder(
    ACTION_PROPOSAL_SCHEMA_ID,
    registry,
    createActionProposalValidator(),
    createActionProposalHooksManager(),
    {
      defaultAutoCorrect: true,
      defaultAsyncHooks: false,
      enableMetrics: true,
      logLevel: 'warn',
    }
  );
}

/**
 * Enhanced ActionProposal schema with custom validation keywords
 *
 * This schema extends the base schema with:
 * - Cross-field dependencies
 * - Operation-based constraints
 * - Risk alignment rules
 * - Confidence range validation
 */
export const ENHANCED_ACTION_PROPOSAL_SCHEMA = {
  ...ACTION_PROPOSAL_SCHEMA,

  // Cross-field dependency: High-risk operations require confirmation
  crossFieldDependency: {
    when: { field: 'risk_level', condition: 'equals', value: 'high' },
    then: [
      {
        field: 'requires_confirmation',
        constraint: { equals: true },
        message: 'High-risk operations must require confirmation',
      },
    ],
  },

  // Operation-based constraints
  operationConstraint: [
    {
      pattern: '.*:delete$',
      constraints: {
        risk_level: 'high',
        requires_confirmation: true,
        reversibility: ['COMPENSATABLE', 'IRREVERSIBLE'],
      },
    },
    {
      pattern: '.*:read$',
      constraints: {
        risk_level: 'low',
        requires_confirmation: false,
        reversibility: ['FULL'],
      },
    },
    {
      pattern: '.*:create$',
      constraints: {
        risk_level: ['medium', 'high'],
      },
    },
  ],

  // Risk alignment rules
  riskAlignment: {
    operationField: 'operation',
    riskField: 'risk_level',
    rules: {
      delete: 'high',
      create: ['medium', 'high'],
      update: ['medium', 'high'],
      read: 'low',
      view: 'low',
      list: 'low',
    },
  },

  // Confidence range with context-aware rules
  confidenceRange: {
    field: 'confidence',
    min: 0,
    max: 1,
    warningThreshold: 0.5,
    contextField: 'risk_level',
    contextRules: {
      high: { min: 0.7 }, // High-risk operations need higher confidence
    },
  },
} as const;

/**
 * Schema ID for enhanced ActionProposal
 */
export const ENHANCED_ACTION_PROPOSAL_SCHEMA_ID = 'actionProposal.enhanced';

/**
 * Create a decoder with enhanced validation (includes custom keywords)
 *
 * This decoder uses the enhanced schema with:
 * - crossFieldDependency validation
 * - operationConstraint validation
 * - riskAlignment validation
 * - confidenceRange validation
 */
export function createEnhancedActionProposalDecoder(): ConstrainedJsonDecoder<
  Record<string, unknown>
> {
  const registry = getSchemaRegistry();

  // Register enhanced schema if not already registered
  if (!registry.has(ENHANCED_ACTION_PROPOSAL_SCHEMA_ID)) {
    registry.register(ENHANCED_ACTION_PROPOSAL_SCHEMA as unknown as Record<string, unknown>, {
      id: ENHANCED_ACTION_PROPOSAL_SCHEMA_ID,
      name: 'ActionProposal (Enhanced)',
      description: 'Enhanced schema with custom validation keywords',
      version: '1.0.0',
      tags: ['proposal', 'governance', 'ai', 'enhanced'],
      ollamaCompatible: false, // Has custom keywords
    });
  }

  // Create decoder with semantic validator and hooks
  return new ConstrainedJsonDecoder(
    ENHANCED_ACTION_PROPOSAL_SCHEMA_ID,
    registry,
    createActionProposalValidator(),
    createActionProposalHooksManager(),
    {
      defaultAutoCorrect: true,
      defaultAsyncHooks: false,
      enableMetrics: true,
      logLevel: 'warn',
    }
  );
}

// ============================================================================
// Singleton Instance
// ============================================================================

let actionProposalDecoderInstance: ConstrainedJsonDecoder<Record<string, unknown>> | null = null;

/**
 * Get the global ActionProposal decoder instance
 */
export function getActionProposalDecoder(): ConstrainedJsonDecoder<Record<string, unknown>> {
  if (!actionProposalDecoderInstance) {
    actionProposalDecoderInstance = createActionProposalDecoder();
  }
  return actionProposalDecoderInstance;
}

/**
 * Reset the global decoder instance (primarily for testing)
 */
export function resetActionProposalDecoder(): void {
  actionProposalDecoderInstance = null;
}
