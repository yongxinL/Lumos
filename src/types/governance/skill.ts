/**
 * Skill type definitions
 *
 * Skills represent discrete capabilities that the AI assistant can perform,
 * such as creating calendar events, updating incidents, or analyzing data.
 */

import type {
  UUID,
  VersionHash,
  ISO8601String,
  SkillStatus,
  SkillOrigin,
  OperationType,
  TrustLevel,
  DataDomain,
  ConflictResolution,
  JSONSchema,
  RollbackSpec,
} from '../common';

/**
 * Policy constraint that must be satisfied for skill execution
 */
export interface PolicyConstraint {
  /** Type of constraint */
  type: 'precondition' | 'invariant' | 'postcondition';
  /** Rule expression or description */
  rule: string;
  /** Error message shown when constraint is violated */
  error_message: string;
}

/**
 * Complete skill definition
 *
 * Skills encapsulate operations the AI can perform with associated
 * governance rules, trust requirements, and rollback capabilities.
 */
export interface Skill {
  /** Unique identifier */
  id: UUID;
  /** Human-readable name */
  name: string;
  /** Detailed description of what the skill does */
  description: string;
  /** SHA-256 hash of skill content for version tracking */
  version_hash: VersionHash;
  /** Current lifecycle status */
  status: SkillStatus;
  /** Who created this skill */
  origin: SkillOrigin;
  /** ServiceNow operations this skill can perform */
  enabled_operations: OperationType[];
  /** Policy constraints that must be satisfied */
  policy_constraints: PolicyConstraint[];
  /** Minimum trust level required to use this skill */
  required_trust_level: TrustLevel;
  /** Priority for conflict resolution (higher = higher priority) */
  priority: number;
  /** Which ServiceNow instance(s) this skill can target */
  data_domain: DataDomain | 'both';
  /** How to resolve conflicts with other skills */
  conflict_resolution: ConflictResolution;
  /** JSON schema for validating action proposals */
  proposal_schema: JSONSchema;
  /** How to rollback actions performed by this skill */
  rollback_specification: RollbackSpec;
  /** When skill was created */
  created_at: ISO8601String;
  /** When skill was activated (null if pending) */
  activated_at: ISO8601String | null;
  /** Who activated the skill (null if pending) */
  activated_by: string | null;
}

/**
 * Skill creation input (for new skills)
 */
export type SkillCreate = Omit<
  Skill,
  'id' | 'version_hash' | 'created_at' | 'activated_at' | 'activated_by'
>;

/**
 * Skill update input (partial updates)
 */
export type SkillUpdate = Partial<Omit<Skill, 'id' | 'version_hash' | 'created_at' | 'origin'>>;
