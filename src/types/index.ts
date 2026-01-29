/**
 * Central type exports for Lumos
 *
 * This file provides convenient access to all type definitions throughout the application.
 * Import types from this file rather than directly from domain-specific modules.
 */

// ============================================================================
// Common types and branded types
// ============================================================================

export type {
  // Branded types
  ISO8601String,
  VersionHash,
  UUID,
  JSONString,
  // Enums
  TrustLevel,
  RollbackType,
  DataDomain,
  DataClassification,
  SkillStatus,
  SkillOrigin,
  ActorType,
  ActionOutcome,
  ConflictResolution,
  OperationType,
  RiskLevel,
  // Common interfaces
  EntityReference,
  SkillReference,
  JSONSchema,
  RollbackSpec,
  RollbackPlan,
  // Utility types
  DeepPartial,
  DeepReadonly,
  RequireField,
  OptionalField,
} from './common';

// Helper functions for branded types
export { uuid, iso8601, versionHash, jsonString } from './common';

// ============================================================================
// Governance domain types
// ============================================================================

export type {
  // Skill types
  Skill,
  PolicyConstraint,
  SkillCreate,
  SkillUpdate,
} from './governance/skill';

export type {
  // Policy types
  Policy,
  PolicyRule,
  PolicyResult,
  EvaluationContext,
  PolicyCreate,
  PolicyUpdate,
} from './governance/policy';

export type {
  // Proposal types
  ActionProposal,
  ExecutionResult,
  ProposalCreate,
  ProposalDecision,
} from './governance/proposal';

export type {
  // Trust level types
  TrustLevelRecord,
  TrustPromotionRequest,
  PromotionResult,
  TrustAttestation,
  TrustThresholds,
} from './governance/trust';

// ============================================================================
// Execution domain types
// ============================================================================

export type {
  // MCP types
  MCPServer,
  MCPServerStatus,
  MCPTool,
  MCPCapability,
  MCPHealthCheck,
  MCPToolInvocation,
  MCPToolResult,
} from './execution/mcp';

export type {
  // Action execution types
  ActionExecution,
  ActionExecutionStep,
  ExecutionSummary,
} from './execution/action';

export type {
  // Rollback types
  RollbackExecution,
  RollbackExecutionStep,
  RollbackValidation,
  RollbackSummary,
} from './execution/rollback';

// ============================================================================
// Audit domain types
// ============================================================================

export type {
  AuditLog,
  AuditEventType,
  AuditMetadata,
  AuditLogFilter,
  AuditLogCreate,
  AuditStatistics,
  ActionAuditTrail,
} from './audit/audit';

// ============================================================================
// Input processing types
// ============================================================================

export type {
  UserInput,
  InputContext,
  ConversationMessage,
  ProcessedInput,
  IntentType,
  ExtractedEntity,
  FastPathResult,
  InputValidation,
  InputType,
  Route,
  RecordingState,
  FastPathRoutingInput,
  FastPathClassification,
} from './input/input';

// ============================================================================
// AI Services types
// ============================================================================

export type {
  OllamaConfig,
  GenerateRequest,
  GenerateResponse,
  ModelOptions,
  GenerateStreamChunk,
  ModelInfo,
  ModelDetails,
  ListModelsResponse,
  PullProgress,
  HealthCheckResponse,
} from './ai/ollama';

// ============================================================================
// IPC types (Inter-Process Communication)
// ============================================================================

export type {
  // Core IPC types
  IPCRequest,
  IPCResponse,
  IPCError,
  IPCEvent,
  IPCChannel,
  IPCEventType,
  // Payload mappings
  IPCChannelPayloads,
  IPCChannelResponses,
  IPCEventPayloads,
  // Supporting types (non-duplicate IPC-specific types)
  TranscriptionPreview,
  InputSubmissionResult,
  InputState,
  SkillListQuery,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  TrustDemotionRequest,
  AttestationStatus,
  ProposalHistoryQuery,
  AuditQueryRequest,
  AuditExportRequest,
  AuditStatsQuery,
  AuditStats,
  MCPToolCallRequest,
  SystemInfo,
  UpdateInfo,
} from './ipc';

// ============================================================================
// Type guards
// ============================================================================

export {
  // Enum type guards
  isTrustLevel,
  isRollbackType,
  isDataDomain,
  isDataClassification,
  isSkillStatus,
  isSkillOrigin,
  isActorType,
  isActionOutcome,
  isRiskLevel,
  // Complex type guards
  isSkill,
  isPolicy,
  isActionProposal,
  isTrustLevelRecord,
  isAuditLog,
  isMCPServer,
  // Array type guards
  isSkillArray,
  isPolicyArray,
  isActionProposalArray,
  // Utilities
  assertNever,
  assertType,
} from './guards';

// ============================================================================
// JSON Schemas for validation
// ============================================================================

export { SCHEMAS } from './schemas';

export type {
  POLICY_CONSTRAINT_SCHEMA,
  SKILL_SCHEMA,
  POLICY_RULE_SCHEMA,
  POLICY_SCHEMA,
  ENTITY_REFERENCE_SCHEMA,
  SKILL_REFERENCE_SCHEMA,
  ROLLBACK_PLAN_SCHEMA,
  ACTION_PROPOSAL_SCHEMA,
} from './schemas';

// ============================================================================
// Database types (from T-1.1.2)
// ============================================================================

export type { SchemaMigration } from './database';

export {};
