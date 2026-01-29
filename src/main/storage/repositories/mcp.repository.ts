/**
 * MCP Server repository
 *
 * Type-safe database operations for MCP servers.
 */

import type { Database, Statement } from 'better-sqlite3';
import type { MCPServer, MCPServerStatus, UUID } from '../../../types';
import { uuid, iso8601 } from '../../../types';
import { QueryError, EntityNotFoundError, DuplicateEntityError } from '../errors';

export class MCPRepository {
  // Database instance not stored directly, use passed reference

  // Cached prepared statements
  private selectByIdStmt: Statement;
  private selectByStatusStmt: Statement;
  private selectAllStmt: Statement;
  private insertStmt: Statement;
  private updateStatusStmt: Statement;
  private updateHealthCheckStmt: Statement;
  private deleteStmt: Statement;

  constructor(db: Database) {
    this.selectByIdStmt = db.prepare('SELECT * FROM mcp_servers WHERE id = ?');
    this.selectByStatusStmt = db.prepare('SELECT * FROM mcp_servers WHERE status = ?');
    this.selectAllStmt = db.prepare('SELECT * FROM mcp_servers ORDER BY name ASC');
    this.insertStmt = db.prepare(`
      INSERT INTO mcp_servers (
        id, name, version, status, capabilities,
        tools, registered_at, last_health_check
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.updateStatusStmt = db.prepare(`
      UPDATE mcp_servers
      SET status = ?
      WHERE id = ?
    `);
    this.updateHealthCheckStmt = db.prepare(`
      UPDATE mcp_servers
      SET last_health_check = ?
      WHERE id = ?
    `);
    this.deleteStmt = db.prepare('DELETE FROM mcp_servers WHERE id = ?');
  }

  /**
   * Find MCP server by ID
   */
  findById(id: UUID): MCPServer | null {
    try {
      const row = this.selectByIdStmt.get(id) as Record<string, unknown> | undefined;
      return row ? this.deserialize(row) : null;
    } catch (error) {
      throw new QueryError(
        `Failed to find MCP server by id: ${id}`,
        this.selectByIdStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find MCP servers by status
   */
  findByStatus(status: MCPServerStatus): MCPServer[] {
    try {
      const rows = this.selectByStatusStmt.all(status) as Record<string, unknown>[];
      return rows.map((row) => this.deserialize(row));
    } catch (error) {
      throw new QueryError(
        `Failed to find MCP servers by status: ${status}`,
        this.selectByStatusStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find all active MCP servers
   */
  findActive(): MCPServer[] {
    return this.findByStatus('active');
  }

  /**
   * Find all MCP servers
   */
  findAll(): MCPServer[] {
    try {
      const rows = this.selectAllStmt.all() as Record<string, unknown>[];
      return rows.map((row) => this.deserialize(row));
    } catch (error) {
      throw new QueryError(
        'Failed to find all MCP servers',
        this.selectAllStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Register a new MCP server
   */
  create(server: MCPServer): void {
    try {
      this.insertStmt.run(
        server.id,
        server.name,
        server.version,
        server.status,
        JSON.stringify(server.capabilities),
        JSON.stringify(server.tools),
        server.registered_at,
        server.last_health_check
      );
    } catch (error) {
      if ((error as Error).message.includes('UNIQUE constraint')) {
        throw new DuplicateEntityError('MCPServer', 'id', server.id);
      }
      throw new QueryError(
        `Failed to create MCP server: ${server.id}`,
        this.insertStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update MCP server status
   */
  updateStatus(id: UUID, status: MCPServerStatus): void {
    try {
      const result = this.updateStatusStmt.run(status, id);

      if (result.changes === 0) {
        throw new EntityNotFoundError('MCPServer', id);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to update MCP server status: ${id}`,
        this.updateStatusStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Update health check timestamp
   */
  updateHealthCheck(id: UUID, timestamp: string): void {
    try {
      const result = this.updateHealthCheckStmt.run(timestamp, id);

      if (result.changes === 0) {
        throw new EntityNotFoundError('MCPServer', id);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to update MCP server health check: ${id}`,
        this.updateHealthCheckStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete an MCP server
   */
  delete(id: UUID): void {
    try {
      const result = this.deleteStmt.run(id);
      if (result.changes === 0) {
        throw new EntityNotFoundError('MCPServer', id);
      }
    } catch (error) {
      if (error instanceof EntityNotFoundError) throw error;
      throw new QueryError(
        `Failed to delete MCP server: ${id}`,
        this.deleteStmt.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Deserialize database row to MCPServer object
   */
  private deserialize(row: Record<string, unknown>): MCPServer {
    return {
      id: uuid(row.id as string),
      name: row.name as string,
      version: row.version as string,
      status: row.status as MCPServerStatus,
      capabilities: JSON.parse(row.capabilities as string),
      tools: JSON.parse(row.tools as string),
      registered_at: iso8601(row.registered_at as string),
      last_health_check: row.last_health_check ? iso8601(row.last_health_check as string) : null,
    };
  }
}
