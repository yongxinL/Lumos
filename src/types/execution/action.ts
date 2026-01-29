/**
 * Action execution type definitions
 *
 * Types for executing approved action proposals through MCP tools.
 */

import type { UUID, ISO8601String, OperationType, EntityReference, ActionOutcome } from '../common';
import type { MCPToolResult } from './mcp';

/**
 * Action execution request
 *
 * Created after an action proposal has been approved.
 */
export interface ActionExecution {
  /** Unique identifier */
  id: UUID;
  /** Proposal that was approved */
  proposal_id: UUID;
  /** When execution started */
  started_at: ISO8601String;
  /** When execution completed (if finished) */
  completed_at: ISO8601String | null;
  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  /** Operation being performed */
  operation: OperationType;
  /** Target entity */
  target_entity: EntityReference | null;
  /** Execution steps performed */
  steps: ActionExecutionStep[];
  /** Final outcome */
  outcome: ActionOutcome | null;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Individual step in action execution
 */
export interface ActionExecutionStep {
  /** Step number (starting at 1) */
  step_number: number;
  /** Description of this step */
  description: string;
  /** MCP tool used for this step */
  tool_name: string;
  /** MCP server ID */
  server_id: UUID;
  /** Input parameters */
  parameters: Record<string, unknown>;
  /** When step started */
  started_at: ISO8601String;
  /** When step completed */
  completed_at: ISO8601String | null;
  /** Whether step succeeded */
  success: boolean;
  /** Tool invocation result */
  result?: MCPToolResult;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Action execution summary
 */
export interface ExecutionSummary {
  /** Total executions */
  total: number;
  /** Successful executions */
  successful: number;
  /** Failed executions */
  failed: number;
  /** Currently running */
  running: number;
  /** Rolled back */
  rolled_back: number;
  /** Average duration in milliseconds */
  avg_duration_ms: number;
  /** Success rate (0-1) */
  success_rate: number;
}
