/**
 * Policy type definitions
 *
 * Policies define rules and constraints that govern AI behavior and
 * determine what actions are allowed under what conditions.
 */

import type { UUID, VersionHash, ISO8601String, TrustLevel, OperationType } from '../common';
import type { SkillReference } from '../common';
import type { Skill } from './skill';

/**
 * Policy rule definition
 */
export interface PolicyRule {
  /** Rule type */
  type: 'allow' | 'deny' | 'require_confirmation';
  /** Operations this rule applies to (empty = all operations) */
  operations?: OperationType[];
  /** Conditions that must be met for rule to apply */
  conditions?: Record<string, unknown>;
  /** Denial reason shown to user (for deny rules) */
  reason?: string;
}

/**
 * Complete policy definition
 */
export interface Policy {
  /** Unique identifier */
  id: UUID;
  /** Human-readable name */
  name: string;
  /** Detailed description */
  description: string;
  /** SHA-256 hash of policy content for version tracking */
  version_hash: VersionHash;
  /** Policy rules (evaluated in order) */
  rules: PolicyRule[];
  /** Priority for rule evaluation (higher = evaluated first) */
  priority: number;
  /** Whether policy is currently active */
  enabled: boolean;
  /** When policy was created */
  created_at: ISO8601String;
  /** When policy was last modified */
  updated_at: ISO8601String;
}

/**
 * Result of policy evaluation for an action proposal
 */
export interface PolicyResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Whether user confirmation is required before execution */
  requires_confirmation: boolean;
  /** Skill that matched (if any) */
  matched_skill: SkillReference | null;
  /** Policy rules that were evaluated */
  rule_references: string[];
  /** Reason for denial (if not allowed) */
  denial_reason?: string;
  /** Trust level used for evaluation */
  trust_level_used: TrustLevel;
}

/**
 * Context for policy evaluation
 */
export interface EvaluationContext {
  /** User performing the action */
  user_id: string;
  /** Current trust levels by operation type */
  trust_levels: Map<OperationType, TrustLevel>;
  /** Currently active skills */
  active_skills: Skill[];
  /** Currently active policies */
  active_policies: Policy[];
  /** Additional context data */
  context?: Record<string, unknown>;
}

/**
 * Policy creation input
 */
export type PolicyCreate = Omit<Policy, 'id' | 'version_hash' | 'created_at' | 'updated_at'>;

/**
 * Policy update input
 */
export type PolicyUpdate = Partial<Omit<Policy, 'id' | 'version_hash' | 'created_at'>>;
