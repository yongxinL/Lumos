import Database from 'better-sqlite3';
import { migration_001_base_schema } from './migrations/001-base-schema';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
  down: (db: Database.Database) => void;
}

const migrations: Migration[] = [migration_001_base_schema];

/**
 * Create the schema_migrations table if it doesn't exist
 */
function createMigrationTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
}

/**
 * Get the current schema version
 */
function getCurrentVersion(db: Database.Database): number {
  const result = db.prepare('SELECT MAX(version) as max_version FROM schema_migrations').get() as {
    max_version: number | null;
  };

  return result.max_version || 0;
}

/**
 * Run all pending migrations
 */
export function runMigrations(db: Database.Database): void {
  createMigrationTable(db);

  const currentVersion = getCurrentVersion(db);

  const pendingMigrations = migrations.filter((m) => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    console.log('Database schema is up to date');
    return;
  }

  console.log(`Running ${pendingMigrations.length} pending migration(s)...`);

  for (const migration of pendingMigrations) {
    try {
      console.log(`Applying migration ${migration.version}: ${migration.name}`);
      migration.up(db);

      const appliedAt = new Date().toISOString();
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
        migration.version,
        migration.name,
        appliedAt
      );

      console.log(`Migration ${migration.version} applied successfully`);
    } catch (error) {
      console.error(`Failed to apply migration ${migration.version}: ${migration.name}`);
      throw error;
    }
  }

  console.log('All migrations completed successfully');
}

/**
 * Rollback the last migration (for development only)
 */
export function rollbackLastMigration(db: Database.Database): void {
  const currentVersion = getCurrentVersion(db);

  if (currentVersion === 0) {
    console.log('No migrations to rollback');
    return;
  }

  const migrationToRollback = migrations.find((m) => m.version === currentVersion);

  if (!migrationToRollback) {
    throw new Error(`Migration ${currentVersion} not found`);
  }

  console.log(`Rolling back migration ${currentVersion}: ${migrationToRollback.name}`);

  migrationToRollback.down(db);

  db.prepare('DELETE FROM schema_migrations WHERE version = ?').run(currentVersion);

  console.log(`Migration ${currentVersion} rolled back successfully`);
}
