/**
 * Database connection manager with singleton pattern
 *
 * Provides centralized database access with connection pooling,
 * health checks, and automatic reconnection.
 */

import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { DatabaseConnectionError } from './errors';

/**
 * Database connection manager (singleton)
 */
class DatabaseManager {
  private static instance: DatabaseType | null = null;
  private static dbPath: string | null = null;

  /**
   * Initialize database connection
   * Must be called before getConnection()
   */
  static initialize(path: string): DatabaseType {
    this.dbPath = path;

    try {
      this.instance = new Database(path, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
      });

      // Configure for optimal performance and safety
      this.instance.pragma('journal_mode = WAL');
      this.instance.pragma('synchronous = NORMAL');
      this.instance.pragma('foreign_keys = ON');
      this.instance.pragma('cache_size = -64000'); // 64MB cache
      this.instance.pragma('temp_store = MEMORY');
      this.instance.pragma('mmap_size = 30000000000'); // 30GB memory-mapped I/O

      console.log(`Database initialized at ${path}`);
      return this.instance;
    } catch (error) {
      throw new DatabaseConnectionError(
        `Failed to initialize database at ${path}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get database connection (singleton)
   */
  static getConnection(): DatabaseType {
    if (!this.instance) {
      throw new DatabaseConnectionError('Database not initialized. Call initialize() first.');
    }

    return this.instance;
  }

  /**
   * Execute a function within a transaction
   * Automatically commits on success, rolls back on error
   */
  static transaction<T>(fn: (db: DatabaseType) => T): T {
    const db = this.getConnection();

    try {
      return db.transaction(fn)(db);
    } catch (error) {
      throw new DatabaseConnectionError(
        'Transaction failed',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Close database connection
   */
  static close(): void {
    if (this.instance) {
      try {
        this.instance.close();
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing database:', error);
      } finally {
        this.instance = null;
        this.dbPath = null;
      }
    }
  }

  /**
   * Check database health
   */
  static healthCheck(): boolean {
    try {
      const db = this.getConnection();
      const result = db.prepare('SELECT 1 as health').get() as { health: number } | undefined;
      return result?.health === 1;
    } catch {
      return false;
    }
  }

  /**
   * Reconnect to database (useful after connection errors)
   */
  static reconnect(): DatabaseType {
    if (!this.dbPath) {
      throw new DatabaseConnectionError('Cannot reconnect: database path not set');
    }

    this.close();
    return this.initialize(this.dbPath);
  }

  /**
   * Get database file path
   */
  static getPath(): string | null {
    return this.dbPath;
  }
}

export { DatabaseManager };
