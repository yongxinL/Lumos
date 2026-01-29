/**
 * Action proposal repository
 *
 * Type-safe database operations for action proposals.
 */

import type { Database, Statement } from 'better-sqlite3';
import type { ActionProposal, UUID } from '../../../types';
import { uuid, iso8601 } from '../../../types';
import { QueryError, EntityNotFoundError, DuplicateEntityError } from '../errors';

export class ProposalRepository {
  // Database instance not stored directly, use passed reference

  // Cached prepared statements
  private selectByIdStmt: Statement;
  private selectRecentStmt: Statement;
  private selectPendingStmt: Statement;
  private insertStmt: Statement;
  private updateDecisionStmt: Statement;
  private updateExecutionStmt: Statement;

  constructor(db: Database) {
    this.selectByIdStmt = db.prepare('SELECT * FROM action_proposals WHERE id = ?');
    this.selectRecentStmt = db.prepare(`
      SELECT * FROM action_proposals
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    this.selectPendingStmt = db.prepare(`
      SELECT * FROM action_proposals
      WHERE user_decision IS NULL AND executed_at IS NULL
      ORDER BY timestamp DESC
    `);
    this.insertStmt = db.prepare(`
      INSERT INTO action_proposals (
        id, timestamp, intent, operation, target_entity,
        data_domain, data_classification, reversibility, confidence,
        related_skills, rollback_plan, evaluation_model, raw_user_input,
        requires_confirmation, risk_level, policy_result, user_decision,
        executed_at, execution_result
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.updateDecisionStmt = db.prepare(`
      UPDATE action_proposals
      SET user_decision = ?
      WHERE id = ?
    `);
    this.updateExecutionStmt = db.prepare(`
      UPDATE action_proposals
      SET executed_at = ?, execution_result = ?
      WHERE id = ?
    `);
  }

  /**
   * Find proposal by ID
   */
  findById(id: UUID): ActionProposal | null {
    try {
      const row = this.selectByIdStmt.get(id) as Record<string, unknown> | undefined;
      return row ? this.deserialize(row) : null;
    } catch (error) {
      throw new QueryError(
        `Failed to find proposal by id: ${id}`,
        this.selectByIdStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get recent proposals
   */
  findRecent(limit: number = 50): ActionProposal[] {
    try {
      const rows = this.selectRecentStmt.all(limit) as Record<string, unknown>[];
      return rows.map((row) => this.deserialize(row));
    } catch (error) {
      throw new QueryError(
        'Failed to find recent proposals',
        this.selectRecentStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get pending proposals (awaiting user decision)
   */
  findPending(): ActionProposal[] {
    try {
      const rows = this.selectPendingStmt.all() as Record<string, unknown>[];
      return rows.map((row) => this.deserialize(row));
    } catch (error) {
      throw new QueryError(
        'Failed to find pending proposals',
        this.selectPendingStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create a new proposal
   */
  create(proposal: ActionProposal): void {
    try {
      this.insertStmt.run(
        proposal.id,
        proposal.timestamp,
        proposal.intent,
        proposal.operation,
        proposal.target_entity ? JSON.stringify(proposal.target_entity) : null,
        proposal.data_domain,
        proposal.data_classification,
        proposal.reversibility,
        proposal.confidence,
        JSON.stringify(proposal.related_skills),
        proposal.rollback_plan ? JSON.stringify(proposal.rollback_plan) : null,
        proposal.evaluation_model,
        proposal.raw_user_input,
        proposal.requires_confirmation ? 1 : 0,
        proposal.risk_level,
        proposal.policy_result ? JSON.stringify(proposal.policy_result) : null,
        proposal.user_decision || null,
        proposal.executed_at || null,
        proposal.execution_result ? JSON.stringify(proposal.execution_result) : null
      );
    } catch (error) {
      if ((error as Error).message.includes('UNIQUE constraint')) {
        throw new DuplicateEntityError('ActionProposal', 'id', proposal.id);
      }
      throw new QueryError(
        `Failed to create proposal: ${proposal.id}`,
        this.insertStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update user decision
   */
  updateDecision(id: UUID, decision: 'approved' | 'denied'): void {
    try {
      const result = this.updateDecisionStmt.run(decision, id);

      if (result.changes === 0) {
        throw new EntityNotFoundError('ActionProposal', id);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to update proposal decision: ${id}`,
        this.updateDecisionStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update execution result
   */
  updateExecution(id: UUID, executedAt: string, result: unknown): void {
    try {
      const updateResult = this.updateExecutionStmt.run(executedAt, JSON.stringify(result), id);

      if (updateResult.changes === 0) {
        throw new EntityNotFoundError('ActionProposal', id);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to update proposal execution: ${id}`,
        this.updateExecutionStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Deserialize database row to ActionProposal object
   */
  private deserialize(row: Record<string, unknown>): ActionProposal {
    return {
      id: uuid(row.id as string),
      timestamp: iso8601(row.timestamp as string),
      intent: row.intent as string,
      operation: row.operation as string,
      target_entity: row.target_entity ? JSON.parse(row.target_entity as string) : null,
      data_domain: row.data_domain as 'enterprise' | 'personal',
      data_classification: row.data_classification as
        | 'public'
        | 'internal'
        | 'confidential'
        | 'restricted',
      reversibility: row.reversibility as 'FULL' | 'PARTIAL' | 'COMPENSATABLE' | 'IRREVERSIBLE',
      confidence: row.confidence as number,
      related_skills: JSON.parse((row.related_skills as string) || '[]'),
      rollback_plan: row.rollback_plan ? JSON.parse(row.rollback_plan as string) : null,
      evaluation_model: row.evaluation_model as string,
      raw_user_input: row.raw_user_input as string,
      requires_confirmation: (row.requires_confirmation as number) === 1,
      risk_level: row.risk_level as 'low' | 'medium' | 'high',
      policy_result: row.policy_result ? JSON.parse(row.policy_result as string) : undefined,
      user_decision: row.user_decision as 'approved' | 'denied' | undefined,
      executed_at: row.executed_at ? iso8601(row.executed_at as string) : undefined,
      execution_result: row.execution_result
        ? JSON.parse(row.execution_result as string)
        : undefined,
    };
  }
}
