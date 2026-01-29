/**
 * Trust level repository
 *
 * Type-safe database operations for trust levels.
 */

import type { Database, Statement } from 'better-sqlite3';
import type { TrustLevelRecord, TrustLevel, OperationType } from '../../../types';
import { iso8601 } from '../../../types';
import { QueryError, EntityNotFoundError } from '../errors';

export class TrustRepository {
  // Database instance not stored directly, use passed reference

  // Cached prepared statements
  private selectByOperationStmt: Statement;
  private selectAllStmt: Statement;
  private upsertStmt: Statement;
  private updateLevelStmt: Statement;
  private incrementSuccessStmt: Statement;
  private incrementFailureStmt: Statement;
  private updateAttestationStmt: Statement;

  constructor(db: Database) {
    this.selectByOperationStmt = db.prepare('SELECT * FROM trust_levels WHERE operation = ?');
    this.selectAllStmt = db.prepare('SELECT * FROM trust_levels');
    this.upsertStmt = db.prepare(`
      INSERT INTO trust_levels (
        operation, level, successes, failures,
        last_attestation, attestation_due, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(operation) DO UPDATE SET
        level = excluded.level,
        last_updated = excluded.last_updated
    `);
    this.updateLevelStmt = db.prepare(`
      UPDATE trust_levels
      SET level = ?, last_updated = ?
      WHERE operation = ?
    `);
    this.incrementSuccessStmt = db.prepare(`
      UPDATE trust_levels
      SET successes = successes + 1, last_updated = ?
      WHERE operation = ?
    `);
    this.incrementFailureStmt = db.prepare(`
      UPDATE trust_levels
      SET failures = failures + 1, last_updated = ?
      WHERE operation = ?
    `);
    this.updateAttestationStmt = db.prepare(`
      UPDATE trust_levels
      SET last_attestation = ?, attestation_due = ?, last_updated = ?
      WHERE operation = ?
    `);
  }

  /**
   * Find trust level for a specific operation
   */
  findByOperation(operation: OperationType): TrustLevelRecord | null {
    try {
      const row = this.selectByOperationStmt.get(operation) as Record<string, unknown> | undefined;
      return row ? this.deserialize(row) : null;
    } catch (error) {
      throw new QueryError(
        `Failed to find trust level for operation: ${operation}`,
        this.selectByOperationStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find all trust levels
   */
  findAll(): TrustLevelRecord[] {
    try {
      const rows = this.selectAllStmt.all() as Record<string, unknown>[];
      return rows.map((row) => this.deserialize(row));
    } catch (error) {
      throw new QueryError(
        'Failed to find all trust levels',
        this.selectAllStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create or update trust level
   */
  upsert(record: TrustLevelRecord): void {
    try {
      this.upsertStmt.run(
        record.operation,
        record.level,
        record.successes,
        record.failures,
        record.last_attestation,
        record.attestation_due,
        record.last_updated
      );
    } catch (error) {
      throw new QueryError(
        `Failed to upsert trust level for operation: ${record.operation}`,
        this.upsertStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update trust level for an operation
   */
  updateLevel(operation: OperationType, level: TrustLevel): void {
    try {
      const result = this.updateLevelStmt.run(level, new Date().toISOString(), operation);

      if (result.changes === 0) {
        throw new EntityNotFoundError('TrustLevel', operation);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to update trust level for operation: ${operation}`,
        this.updateLevelStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Increment success count
   */
  incrementSuccess(operation: OperationType): void {
    try {
      const result = this.incrementSuccessStmt.run(new Date().toISOString(), operation);

      if (result.changes === 0) {
        throw new EntityNotFoundError('TrustLevel', operation);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to increment success for operation: ${operation}`,
        this.incrementSuccessStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Increment failure count
   */
  incrementFailure(operation: OperationType): void {
    try {
      const result = this.incrementFailureStmt.run(new Date().toISOString(), operation);

      if (result.changes === 0) {
        throw new EntityNotFoundError('TrustLevel', operation);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to increment failure for operation: ${operation}`,
        this.incrementFailureStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update attestation information
   */
  updateAttestation(
    operation: OperationType,
    lastAttestation: string,
    attestationDue: string
  ): void {
    try {
      const result = this.updateAttestationStmt.run(
        lastAttestation,
        attestationDue,
        new Date().toISOString(),
        operation
      );

      if (result.changes === 0) {
        throw new EntityNotFoundError('TrustLevel', operation);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to update attestation for operation: ${operation}`,
        this.updateAttestationStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Deserialize database row to TrustLevelRecord object
   */
  private deserialize(row: Record<string, unknown>): TrustLevelRecord {
    return {
      operation: row.operation as OperationType,
      level: row.level as TrustLevel,
      successes: row.successes as number,
      failures: row.failures as number,
      last_attestation: row.last_attestation ? iso8601(row.last_attestation as string) : null,
      attestation_due: row.attestation_due ? iso8601(row.attestation_due as string) : null,
      last_updated: iso8601(row.last_updated as string),
    };
  }
}
