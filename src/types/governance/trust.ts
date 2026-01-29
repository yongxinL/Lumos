/**
 * Trust level type definitions
 *
 * Trust levels track the AI's reliability for different operation types
 * and determine the level of autonomy granted.
 */

import type { OperationType, TrustLevel, ISO8601String } from '../common';

/**
 * Trust level record for a specific operation type
 *
 * Tracks success/failure history and attestation status.
 */
export interface TrustLevelRecord {
  /** Operation type this record applies to */
  operation: OperationType;
  /** Current trust level */
  level: TrustLevel;
  /** Number of successful executions */
  successes: number;
  /** Number of failed executions */
  failures: number;
  /** When user last reviewed and confirmed trust level */
  last_attestation: ISO8601String | null;
  /** When next attestation is due */
  attestation_due: ISO8601String | null;
  /** Last time record was updated */
  last_updated: ISO8601String;
}

/**
 * Trust level promotion request
 *
 * AI can request promotion to higher trust level based on track record.
 */
export interface TrustPromotionRequest {
  /** Operation type requesting promotion */
  operation: OperationType;
  /** Current trust level */
  current_level: TrustLevel;
  /** Desired trust level */
  requested_level: TrustLevel;
  /** Justification for promotion */
  justification: string;
  /** Success metrics supporting the request */
  metrics: {
    total_operations: number;
    success_rate: number;
    consecutive_successes: number;
    time_since_last_failure: number; // milliseconds
  };
}

/**
 * Result of trust level promotion evaluation
 */
export interface PromotionResult {
  /** Whether promotion was granted */
  allowed: boolean;
  /** New trust level (if allowed) */
  new_level: TrustLevel | null;
  /** Explanation of decision */
  reason: string;
  /** Conditions that must be met for promotion (if denied) */
  requirements?: string[];
}

/**
 * Trust level attestation (user review)
 */
export interface TrustAttestation {
  /** Operation type being attested */
  operation: OperationType;
  /** Trust level confirmed by user */
  confirmed_level: TrustLevel;
  /** User providing attestation */
  attested_by: string;
  /** When attestation was provided */
  attested_at: ISO8601String;
  /** Optional notes from user */
  notes?: string;
}

/**
 * Thresholds for automatic trust level adjustments
 */
export interface TrustThresholds {
  /** Minimum success rate to maintain current level (0-1) */
  min_success_rate: number;
  /** Success rate required for promotion (0-1) */
  promotion_success_rate: number;
  /** Consecutive failures that trigger demotion */
  demotion_failure_threshold: number;
  /** Minimum operations before considering promotion */
  min_operations_for_promotion: number;
  /** Days before attestation expires */
  attestation_validity_days: number;
}
