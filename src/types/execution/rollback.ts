/**
 * Rollback type definitions
 *
 * Types for reversing executed actions when needed.
 */

import type { UUID, ISO8601String, RollbackPlan, EntityReference } from '../common';

/**
 * Rollback execution request
 */
export interface RollbackExecution {
  /** Unique identifier */
  id: UUID;
  /** Action execution being rolled back */
  action_execution_id: UUID;
  /** Original proposal ID */
  original_proposal_id: UUID;
  /** Rollback plan being executed */
  plan: RollbackPlan;
  /** When rollback started */
  started_at: ISO8601String;
  /** When rollback completed (if finished) */
  completed_at: ISO8601String | null;
  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  /** Rollback steps performed */
  steps: RollbackExecutionStep[];
  /** Whether rollback succeeded */
  success: boolean;
  /** Error message (if failed) */
  error?: string;
  /** Entities affected by rollback */
  affected_entities: EntityReference[];
}

/**
 * Individual step in rollback execution
 */
export interface RollbackExecutionStep {
  /** Step number (starting at 1) */
  step_number: number;
  /** Description of this rollback step */
  description: string;
  /** MCP tool used for rollback */
  tool_name: string;
  /** Input parameters for rollback operation */
  parameters: Record<string, unknown>;
  /** When step started */
  started_at: ISO8601String;
  /** When step completed */
  completed_at: ISO8601String | null;
  /** Whether step succeeded */
  success: boolean;
  /** Error message (if failed) */
  error?: string;
  /** Result data */
  result?: unknown;
}

/**
 * Rollback validation result
 *
 * Checks if a rollback is possible before attempting it.
 */
export interface RollbackValidation {
  /** Whether rollback is possible */
  possible: boolean;
  /** Estimated success probability (0-1) */
  success_probability: number;
  /** Warnings about rollback */
  warnings: string[];
  /** Blocking issues preventing rollback */
  blockers: string[];
  /** Estimated duration in milliseconds */
  estimated_duration_ms: number;
}

/**
 * Rollback summary statistics
 */
export interface RollbackSummary {
  /** Total rollbacks attempted */
  total_attempted: number;
  /** Fully successful rollbacks */
  fully_successful: number;
  /** Partially successful rollbacks */
  partially_successful: number;
  /** Failed rollbacks */
  failed: number;
  /** Average duration in milliseconds */
  avg_duration_ms: number;
  /** Full success rate (0-1) */
  success_rate: number;
}
