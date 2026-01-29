/**
 * Common type definitions and branded types for Lumos
 *
 * Branded types prevent accidental mixing of string-based IDs and provide
 * type safety across the application.
 */

// Branded types for type-safe IDs and strings
export type ISO8601String = string & { readonly __brand: 'ISO8601String' };
export type VersionHash = string & { readonly __brand: 'VersionHash' };
export type UUID = string & { readonly __brand: 'UUID' };
export type JSONString = string & { readonly __brand: 'JSONString' };

// Helper functions to create branded types
export function uuid(value: string): UUID {
  return value as UUID;
}

export function iso8601(value: string): ISO8601String {
  return value as ISO8601String;
}

export function versionHash(value: string): VersionHash {
  return value as VersionHash;
}

export function jsonString(value: string): JSONString {
  return value as JSONString;
}

// Trust Level enum
/**
 * Trust levels define the degree of autonomy granted to the AI assistant
 * - OBSERVE: AI can only view and analyze, requires approval for all actions
 * - SUPERVISED: AI can propose actions, requires confirmation for execution
 * - DELEGATED: AI can execute approved operations autonomously
 */
export type TrustLevel = 'OBSERVE' | 'SUPERVISED' | 'DELEGATED';

// Rollback type
/**
 * Rollback capabilities for different action types
 * - FULL: Complete state restoration possible
 * - PARTIAL: Some aspects can be reversed
 * - COMPENSATABLE: Requires compensating actions (e.g., delete after create)
 * - IRREVERSIBLE: Cannot be undone (e.g., sending emails)
 */
export type RollbackType = 'FULL' | 'PARTIAL' | 'COMPENSATABLE' | 'IRREVERSIBLE';

// Data domain classification
/**
 * Data domain determines which ServiceNow instance to target
 * - enterprise: Corporate ServiceNow instance
 * - personal: Personal development instance (PDI)
 */
export type DataDomain = 'enterprise' | 'personal';

// Data classification levels
/**
 * Data sensitivity classification following standard security models
 * - public: No confidentiality requirements
 * - internal: For internal use only
 * - confidential: Sensitive business information
 * - restricted: Highly sensitive, requires special handling
 */
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

// Skill status
/**
 * Skill lifecycle status
 * - pending: Awaiting user approval/activation
 * - active: Enabled and available for use
 * - deprecated: Disabled, kept for historical reference
 */
export type SkillStatus = 'pending' | 'active' | 'deprecated';

// Skill origin
/**
 * Source of skill definition
 * - human: User-defined skill
 * - ai: AI-generated skill proposal
 */
export type SkillOrigin = 'human' | 'ai';

// Actor type
/**
 * Entity performing an action
 * - user: Human user action
 * - ai: AI assistant action
 * - system: Automated system action
 */
export type ActorType = 'user' | 'ai' | 'system';

// Action outcome
/**
 * Result of an executed action
 * - success: Completed successfully
 * - failure: Failed with error
 * - pending: Awaiting execution
 * - rolled_back: Successfully reversed
 */
export type ActionOutcome = 'success' | 'failure' | 'pending' | 'rolled_back';

// Conflict resolution strategy
/**
 * How to handle conflicts between skills
 * - policy_escalation: Apply policy rules to resolve
 * - user_choice: Ask user to choose
 */
export type ConflictResolution = 'policy_escalation' | 'user_choice';

// Operation type (ServiceNow CRUD operations)
/**
 * ServiceNow operations following the pattern: module:action
 * Examples: incident:create, calendar:read, task:update, user:delete
 */
export type OperationType = string; // Format: "module:action" (e.g., "incident:create")

// Risk level
/**
 * Risk assessment for proposed actions
 * - low: Minimal impact, easily reversible
 * - medium: Moderate impact, may require effort to reverse
 * - high: Significant impact, difficult or impossible to reverse
 */
export type RiskLevel = 'low' | 'medium' | 'high';

// Entity reference for targeting ServiceNow records
/**
 * Reference to a ServiceNow entity
 */
export interface EntityReference {
  /** Entity type (e.g., "incident", "calendar_event", "task") */
  type: string;
  /** Entity ID or sys_id */
  id: string;
  /** Source system or instance */
  source: string;
}

// Skill reference with version
/**
 * Reference to a specific version of a skill
 */
export interface SkillReference {
  /** Skill UUID */
  id: UUID;
  /** Content hash for version tracking */
  version_hash: VersionHash;
}

// JSON Schema type (for proposal and rollback schemas)
export type JSONSchema = Record<string, unknown>;

// Rollback specification
/**
 * Defines how to rollback an action
 */
export interface RollbackSpec {
  /** Type of rollback supported */
  type: RollbackType;
  /** Steps to perform rollback (if applicable) */
  steps?: string[];
  /** Conditions under which rollback is possible */
  conditions?: string[];
  /** Warning message if rollback is IRREVERSIBLE or PARTIAL */
  warning?: string;
}

// Rollback plan for a specific action
/**
 * Concrete rollback plan for an executed action
 */
export interface RollbackPlan {
  /** Steps to execute for rollback */
  steps: Array<{
    operation: OperationType;
    target: EntityReference;
    parameters: Record<string, unknown>;
  }>;
  /** Estimated success probability */
  success_probability: number;
  /** Human-readable description */
  description: string;
}

// Common utility types
/**
 * Makes all properties and nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Makes all properties and nested properties readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Makes specific fields required while keeping others as-is
 */
export type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Makes specific fields optional while keeping others as-is
 */
export type OptionalField<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
