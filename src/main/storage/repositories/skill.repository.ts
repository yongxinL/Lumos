/**
 * Skill repository
 *
 * Type-safe database operations for skills with prepared statement caching.
 */

import type { Database, Statement } from 'better-sqlite3';
import type { Skill, SkillStatus, UUID } from '../../../types';
import { uuid, versionHash, iso8601 } from '../../../types';
import { QueryError, EntityNotFoundError, DuplicateEntityError } from '../errors';

export class SkillRepository {
  // Database instance not stored directly, use passed reference

  // Cached prepared statements
  private selectByIdStmt: Statement;
  private selectByStatusStmt: Statement;
  private selectAllStmt: Statement;
  private insertStmt: Statement;
  private updateStatusStmt: Statement;
  private deleteStmt: Statement;

  constructor(db: Database) {
    // Prepare statements once for reuse
    this.selectByIdStmt = db.prepare('SELECT * FROM skills WHERE id = ?');
    this.selectByStatusStmt = db.prepare(
      'SELECT * FROM skills WHERE status = ? ORDER BY priority DESC'
    );
    this.selectAllStmt = db.prepare('SELECT * FROM skills ORDER BY priority DESC');
    this.insertStmt = db.prepare(`
      INSERT INTO skills (
        id, name, description, version_hash, status, origin,
        enabled_operations, policy_constraints, required_trust_level,
        priority, data_domain, conflict_resolution, proposal_schema,
        rollback_specification, created_at, activated_at, activated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.updateStatusStmt = db.prepare(`
      UPDATE skills
      SET status = ?, activated_at = ?, activated_by = ?
      WHERE id = ?
    `);
    this.deleteStmt = db.prepare('DELETE FROM skills WHERE id = ?');
  }

  /**
   * Find skill by ID
   */
  findById(id: UUID): Skill | null {
    try {
      const row = this.selectByIdStmt.get(id) as Record<string, unknown> | undefined;
      return row ? this.deserialize(row) : null;
    } catch (error) {
      throw new QueryError(
        `Failed to find skill by id: ${id}`,
        this.selectByIdStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find skills by status
   */
  findByStatus(status: SkillStatus): Skill[] {
    try {
      const rows = this.selectByStatusStmt.all(status) as Record<string, unknown>[];
      return rows.map((row) => this.deserialize(row));
    } catch (error) {
      throw new QueryError(
        `Failed to find skills by status: ${status}`,
        this.selectByStatusStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find all active skills
   */
  findActive(): Skill[] {
    return this.findByStatus('active');
  }

  /**
   * Find all skills
   */
  findAll(): Skill[] {
    try {
      const rows = this.selectAllStmt.all() as Record<string, unknown>[];
      return rows.map((row) => this.deserialize(row));
    } catch (error) {
      throw new QueryError(
        'Failed to find all skills',
        this.selectAllStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create a new skill
   */
  create(skill: Skill): void {
    try {
      this.insertStmt.run(
        skill.id,
        skill.name,
        skill.description,
        skill.version_hash,
        skill.status,
        skill.origin,
        JSON.stringify(skill.enabled_operations),
        JSON.stringify(skill.policy_constraints),
        skill.required_trust_level,
        skill.priority,
        skill.data_domain,
        skill.conflict_resolution,
        JSON.stringify(skill.proposal_schema),
        JSON.stringify(skill.rollback_specification),
        skill.created_at,
        skill.activated_at,
        skill.activated_by
      );
    } catch (error) {
      if ((error as Error).message.includes('UNIQUE constraint')) {
        throw new DuplicateEntityError('Skill', 'id', skill.id);
      }
      throw new QueryError(
        `Failed to create skill: ${skill.id}`,
        this.insertStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update skill status
   */
  updateStatus(id: UUID, status: SkillStatus, activatedBy?: string): void {
    try {
      const activatedAt = status === 'active' ? new Date().toISOString() : null;
      const result = this.updateStatusStmt.run(status, activatedAt, activatedBy || null, id);

      if (result.changes === 0) {
        throw new EntityNotFoundError('Skill', id);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to update skill status: ${id}`,
        this.updateStatusStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete a skill
   */
  delete(id: UUID): void {
    try {
      const result = this.deleteStmt.run(id);
      if (result.changes === 0) {
        throw new EntityNotFoundError('Skill', id);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to delete skill: ${id}`,
        this.deleteStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Deserialize database row to Skill object
   */
  private deserialize(row: Record<string, unknown>): Skill {
    return {
      id: uuid(row.id as string),
      name: row.name as string,
      description: row.description as string,
      version_hash: versionHash(row.version_hash as string),
      status: row.status as SkillStatus,
      origin: row.origin as 'human' | 'ai',
      enabled_operations: JSON.parse(row.enabled_operations as string),
      policy_constraints: JSON.parse(row.policy_constraints as string),
      required_trust_level: row.required_trust_level as 'OBSERVE' | 'SUPERVISED' | 'DELEGATED',
      priority: row.priority as number,
      data_domain: row.data_domain as 'enterprise' | 'personal' | 'both',
      conflict_resolution: row.conflict_resolution as 'policy_escalation' | 'user_choice',
      proposal_schema: JSON.parse(row.proposal_schema as string),
      rollback_specification: JSON.parse(row.rollback_specification as string),
      created_at: iso8601(row.created_at as string),
      activated_at: row.activated_at ? iso8601(row.activated_at as string) : null,
      activated_by: row.activated_by as string | null,
    };
  }
}
