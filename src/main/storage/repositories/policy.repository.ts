/**
 * Policy repository
 *
 * Type-safe database operations for policies.
 */

import type { Database, Statement } from 'better-sqlite3';
import { uuid, versionHash, iso8601 } from '../../../types';
import type { Policy, UUID } from '../../../types';
import { QueryError, EntityNotFoundError, DuplicateEntityError } from '../errors';

export class PolicyRepository {
  // Database instance not stored directly, use passed reference

  // Cached prepared statements
  private selectByIdStmt: Statement;
  private selectEnabledStmt: Statement;
  private selectAllStmt: Statement;
  private insertStmt: Statement;
  private updateStmt: Statement;
  private toggleEnabledStmt: Statement;
  private deleteStmt: Statement;

  constructor(db: Database) {
    this.selectByIdStmt = db.prepare('SELECT * FROM policies WHERE id = ?');
    this.selectEnabledStmt = db.prepare(`
      SELECT * FROM policies
      WHERE enabled = 1
      ORDER BY priority DESC
    `);
    this.selectAllStmt = db.prepare('SELECT * FROM policies ORDER BY priority DESC');
    this.insertStmt = db.prepare(`
      INSERT INTO policies (
        id, name, description, version_hash, rules,
        priority, enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.updateStmt = db.prepare(`
      UPDATE policies
      SET name = ?, description = ?, rules = ?, priority = ?, updated_at = ?
      WHERE id = ?
    `);
    this.toggleEnabledStmt = db.prepare(`
      UPDATE policies
      SET enabled = ?, updated_at = ?
      WHERE id = ?
    `);
    this.deleteStmt = db.prepare('DELETE FROM policies WHERE id = ?');
  }

  /**
   * Find policy by ID
   */
  findById(id: UUID): Policy | null {
    try {
      const row = this.selectByIdStmt.get(id) as Record<string, unknown> | undefined;
      return row ? this.deserialize(row) : null;
    } catch (error) {
      throw new QueryError(
        `Failed to find policy by id: ${id}`,
        this.selectByIdStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find all enabled policies (for evaluation)
   */
  findEnabled(): Policy[] {
    try {
      const rows = this.selectEnabledStmt.all() as Record<string, unknown>[];
      return rows.map((row) => this.deserialize(row));
    } catch (error) {
      throw new QueryError(
        'Failed to find enabled policies',
        this.selectEnabledStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find all policies
   */
  findAll(): Policy[] {
    try {
      const rows = this.selectAllStmt.all() as Record<string, unknown>[];
      return rows.map((row) => this.deserialize(row));
    } catch (error) {
      throw new QueryError(
        'Failed to find all policies',
        this.selectAllStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create a new policy
   */
  create(policy: Policy): void {
    try {
      this.insertStmt.run(
        policy.id,
        policy.name,
        policy.description,
        policy.version_hash,
        JSON.stringify(policy.rules),
        policy.priority,
        policy.enabled ? 1 : 0,
        policy.created_at,
        policy.updated_at
      );
    } catch (error) {
      if ((error as Error).message.includes('UNIQUE constraint')) {
        throw new DuplicateEntityError('Policy', 'id', policy.id);
      }
      throw new QueryError(
        `Failed to create policy: ${policy.id}`,
        this.insertStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update an existing policy
   */
  update(policy: Policy): void {
    try {
      const result = this.updateStmt.run(
        policy.name,
        policy.description,
        JSON.stringify(policy.rules),
        policy.priority,
        new Date().toISOString(),
        policy.id
      );

      if (result.changes === 0) {
        throw new EntityNotFoundError('Policy', policy.id);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to update policy: ${policy.id}`,
        this.updateStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Toggle policy enabled/disabled
   */
  toggleEnabled(id: UUID, enabled: boolean): void {
    try {
      const result = this.toggleEnabledStmt.run(enabled ? 1 : 0, new Date().toISOString(), id);

      if (result.changes === 0) {
        throw new EntityNotFoundError('Policy', id);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to toggle policy: ${id}`,
        this.toggleEnabledStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete a policy
   */
  delete(id: UUID): void {
    try {
      const result = this.deleteStmt.run(id);
      if (result.changes === 0) {
        throw new EntityNotFoundError('Policy', id);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to delete policy: ${id}`,
        this.deleteStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Deserialize database row to Policy object
   */
  private deserialize(row: Record<string, unknown>): Policy {
    return {
      id: uuid(row.id as string),
      name: row.name as string,
      description: row.description as string,
      version_hash: versionHash(row.version_hash as string),
      rules: JSON.parse(row.rules as string),
      priority: row.priority as number,
      enabled: (row.enabled as number) === 1,
      created_at: iso8601(row.created_at as string),
      updated_at: iso8601(row.updated_at as string),
    };
  }
}
