/**
 * Type guards for runtime type validation
 *
 * These functions validate that unknown values match expected TypeScript types,
 * providing type safety at runtime (e.g., when parsing JSON, API responses, etc.)
 */

import type {
  TrustLevel,
  RollbackType,
  DataDomain,
  DataClassification,
  SkillStatus,
  SkillOrigin,
  ActorType,
  ActionOutcome,
  RiskLevel,
} from './common';
import type { Skill } from './governance/skill';
import type { Policy } from './governance/policy';
import type { ActionProposal } from './governance/proposal';
import type { TrustLevelRecord } from './governance/trust';
import type { AuditLog } from './audit/audit';
import type { MCPServer } from './execution/mcp';

// Helper to check if value is an object
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Enum type guards
export function isTrustLevel(value: unknown): value is TrustLevel {
  return typeof value === 'string' && ['OBSERVE', 'SUPERVISED', 'DELEGATED'].includes(value);
}

export function isRollbackType(value: unknown): value is RollbackType {
  return (
    typeof value === 'string' &&
    ['FULL', 'PARTIAL', 'COMPENSATABLE', 'IRREVERSIBLE'].includes(value)
  );
}

export function isDataDomain(value: unknown): value is DataDomain {
  return typeof value === 'string' && ['enterprise', 'personal'].includes(value);
}

export function isDataClassification(value: unknown): value is DataClassification {
  return (
    typeof value === 'string' &&
    ['public', 'internal', 'confidential', 'restricted'].includes(value)
  );
}

export function isSkillStatus(value: unknown): value is SkillStatus {
  return typeof value === 'string' && ['pending', 'active', 'deprecated'].includes(value);
}

export function isSkillOrigin(value: unknown): value is SkillOrigin {
  return typeof value === 'string' && ['human', 'ai'].includes(value);
}

export function isActorType(value: unknown): value is ActorType {
  return typeof value === 'string' && ['user', 'ai', 'system'].includes(value);
}

export function isActionOutcome(value: unknown): value is ActionOutcome {
  return (
    typeof value === 'string' && ['success', 'failure', 'pending', 'rolled_back'].includes(value)
  );
}

export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === 'string' && ['low', 'medium', 'high'].includes(value);
}

// Complex type guards
export function isSkill(value: unknown): value is Skill {
  if (!isObject(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.version_hash === 'string' &&
    isSkillStatus(value.status) &&
    isSkillOrigin(value.origin) &&
    Array.isArray(value.enabled_operations) &&
    Array.isArray(value.policy_constraints) &&
    isTrustLevel(value.required_trust_level) &&
    typeof value.priority === 'number' &&
    (isDataDomain(value.data_domain) || value.data_domain === 'both') &&
    typeof value.conflict_resolution === 'string' &&
    isObject(value.proposal_schema) &&
    isObject(value.rollback_specification) &&
    typeof value.created_at === 'string'
  );
}

export function isPolicy(value: unknown): value is Policy {
  if (!isObject(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.version_hash === 'string' &&
    Array.isArray(value.rules) &&
    typeof value.priority === 'number' &&
    typeof value.enabled === 'boolean' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
}

export function isActionProposal(value: unknown): value is ActionProposal {
  if (!isObject(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.intent === 'string' &&
    typeof value.operation === 'string' &&
    (value.target_entity === null || isObject(value.target_entity)) &&
    isDataDomain(value.data_domain) &&
    isDataClassification(value.data_classification) &&
    isRollbackType(value.reversibility) &&
    typeof value.confidence === 'number' &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    Array.isArray(value.related_skills) &&
    (value.rollback_plan === null || isObject(value.rollback_plan)) &&
    typeof value.evaluation_model === 'string' &&
    typeof value.raw_user_input === 'string' &&
    typeof value.requires_confirmation === 'boolean' &&
    isRiskLevel(value.risk_level)
  );
}

export function isTrustLevelRecord(value: unknown): value is TrustLevelRecord {
  if (!isObject(value)) return false;

  return (
    typeof value.operation === 'string' &&
    isTrustLevel(value.level) &&
    typeof value.successes === 'number' &&
    typeof value.failures === 'number' &&
    (value.last_attestation === null || typeof value.last_attestation === 'string') &&
    (value.attestation_due === null || typeof value.attestation_due === 'string') &&
    typeof value.last_updated === 'string'
  );
}

export function isAuditLog(value: unknown): value is AuditLog {
  if (!isObject(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.event_type === 'string' &&
    isActorType(value.actor_type) &&
    (value.actor_id === null || typeof value.actor_id === 'string') &&
    (value.action_id === null || typeof value.action_id === 'string') &&
    (value.operation === null || typeof value.operation === 'string') &&
    isActionOutcome(value.outcome) &&
    (value.input_hash === null || typeof value.input_hash === 'string') &&
    (value.output_hash === null || typeof value.output_hash === 'string') &&
    (value.duration_ms === null || typeof value.duration_ms === 'number') &&
    (value.error_message === null || typeof value.error_message === 'string') &&
    (value.rollback_of === null || typeof value.rollback_of === 'string') &&
    isObject(value.metadata)
  );
}

export function isMCPServer(value: unknown): value is MCPServer {
  if (!isObject(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.version === 'string' &&
    typeof value.status === 'string' &&
    Array.isArray(value.capabilities) &&
    Array.isArray(value.tools) &&
    typeof value.registered_at === 'string' &&
    (value.last_health_check === null || typeof value.last_health_check === 'string')
  );
}

// Array type guards
export function isSkillArray(value: unknown): value is Skill[] {
  return Array.isArray(value) && value.every(isSkill);
}

export function isPolicyArray(value: unknown): value is Policy[] {
  return Array.isArray(value) && value.every(isPolicy);
}

export function isActionProposalArray(value: unknown): value is ActionProposal[] {
  return Array.isArray(value) && value.every(isActionProposal);
}

// Utility: Never type guard for exhaustiveness checking
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

// Utility: Type assertion with validation
export function assertType<T>(
  value: unknown,
  guard: (val: unknown) => val is T,
  errorMessage: string
): asserts value is T {
  if (!guard(value)) {
    throw new TypeError(errorMessage);
  }
}
