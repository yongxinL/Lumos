/**
 * Audit log type definitions
 *
 * Comprehensive immutable record of all system events, actions, and decisions.
 */

import type { UUID, ISO8601String, ActorType, ActionOutcome, OperationType } from '../common';

/**
 * Audit event types
 */
export type AuditEventType =
  | 'action_proposed' // AI proposes an action
  | 'action_approved' // User approves a proposal
  | 'action_denied' // User denies a proposal
  | 'action_executed' // Action is executed
  | 'action_failed' // Action execution fails
  | 'action_rolled_back' // Action is rolled back
  | 'skill_activated' // Skill is activated
  | 'skill_deactivated' // Skill is deactivated
  | 'policy_created' // Policy is created
  | 'policy_updated' // Policy is updated
  | 'policy_evaluated' // Policy is evaluated for an action
  | 'trust_level_changed' // Trust level is modified
  | 'trust_attested' // User attests to trust level
  | 'mcp_server_registered' // MCP server is registered
  | 'mcp_server_health_check' // Health check performed
  | 'mcp_tool_invoked' // MCP tool is called
  | 'user_input_received' // User provides input
  | 'system_error' // System error occurred
  | 'config_changed'; // Configuration changed

/**
 * Complete audit log entry
 *
 * Immutable record of a system event. Cannot be modified or deleted once created.
 */
export interface AuditLog {
  /** Unique identifier */
  id: UUID;
  /** When event occurred */
  timestamp: ISO8601String;
  /** Type of event */
  event_type: AuditEventType;
  /** Who/what triggered the event */
  actor_type: ActorType;
  /** Actor identifier (user ID, system component, etc.) */
  actor_id: string | null;
  /** Related action ID (if applicable) */
  action_id: UUID | null;
  /** Operation performed (if applicable) */
  operation: OperationType | null;
  /** Event outcome */
  outcome: ActionOutcome;
  /** Hash of input data (for integrity checking) */
  input_hash: string | null;
  /** Hash of output data (for integrity checking) */
  output_hash: string | null;
  /** Duration in milliseconds (for operations) */
  duration_ms: number | null;
  /** Error message (if outcome is failure) */
  error_message: string | null;
  /** Reference to audit log entry being rolled back (if applicable) */
  rollback_of: UUID | null;
  /** Additional structured metadata */
  metadata: AuditMetadata;
}

/**
 * Audit metadata for additional context
 */
export interface AuditMetadata {
  /** IP address or client identifier */
  client_id?: string;
  /** User agent or client version */
  user_agent?: string;
  /** Related entities or references */
  related_entities?: Array<{
    type: string;
    id: string;
  }>;
  /** Tags for categorization */
  tags?: string[];
  /** Additional custom fields */
  [key: string]: unknown;
}

/**
 * Audit log query filter
 */
export interface AuditLogFilter {
  /** Filter by event types */
  event_types?: AuditEventType[];
  /** Filter by actor type */
  actor_type?: ActorType;
  /** Filter by actor ID */
  actor_id?: string;
  /** Filter by action ID */
  action_id?: UUID;
  /** Filter by operation */
  operation?: OperationType;
  /** Filter by outcome */
  outcome?: ActionOutcome;
  /** Filter by time range (start) */
  from_timestamp?: ISO8601String;
  /** Filter by time range (end) */
  to_timestamp?: ISO8601String;
  /** Filter by metadata tags */
  tags?: string[];
  /** Maximum number of results */
  limit?: number;
  /** Number of results to skip (pagination) */
  offset?: number;
}

/**
 * Audit log entry creation input
 */
export type AuditLogCreate = Omit<AuditLog, 'id'>;

/**
 * Audit log statistics
 */
export interface AuditStatistics {
  /** Total events logged */
  total_events: number;
  /** Events by type */
  events_by_type: Record<AuditEventType, number>;
  /** Events by actor type */
  events_by_actor: Record<ActorType, number>;
  /** Events by outcome */
  events_by_outcome: Record<ActionOutcome, number>;
  /** Average operation duration in milliseconds */
  avg_duration_ms: number;
  /** Time range covered */
  time_range: {
    earliest: ISO8601String;
    latest: ISO8601String;
  };
}

/**
 * Audit trail for a specific action
 *
 * Complete history of an action from proposal to execution/rollback.
 */
export interface ActionAuditTrail {
  /** Action ID */
  action_id: UUID;
  /** All audit entries related to this action (chronological order) */
  entries: AuditLog[];
  /** Summary of action lifecycle */
  summary: {
    proposed_at: ISO8601String;
    approved_at?: ISO8601String;
    executed_at?: ISO8601String;
    rolled_back_at?: ISO8601String;
    final_outcome: ActionOutcome;
    total_duration_ms: number;
  };
}
