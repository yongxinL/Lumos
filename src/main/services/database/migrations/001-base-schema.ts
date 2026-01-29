import Database from 'better-sqlite3';
import { Migration } from '../migrations';

export const migration_001_base_schema: Migration = {
  version: 1,
  name: 'base_schema',

  up(db: Database.Database) {
    // Create audit log table (append-only)
    db.exec(`
      CREATE TABLE audit_log (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor_type TEXT NOT NULL,
        actor_id TEXT,
        action_id TEXT,
        operation TEXT,
        outcome TEXT NOT NULL,
        input_hash TEXT,
        output_hash TEXT,
        duration_ms INTEGER,
        error_message TEXT,
        rollback_of TEXT REFERENCES audit_log(id),
        metadata TEXT
      )
    `);

    // Create skills table
    db.exec(`
      CREATE TABLE skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        version_hash TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        origin TEXT NOT NULL,
        enabled_operations TEXT NOT NULL,
        policy_constraints TEXT NOT NULL,
        required_trust_level TEXT NOT NULL,
        priority INTEGER NOT NULL,
        data_domain TEXT NOT NULL,
        conflict_resolution TEXT NOT NULL,
        proposal_schema TEXT NOT NULL,
        rollback_specification TEXT NOT NULL,
        created_at TEXT NOT NULL,
        activated_at TEXT,
        activated_by TEXT
      )
    `);

    // Create policies table
    db.exec(`
      CREATE TABLE policies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        version_hash TEXT NOT NULL UNIQUE,
        rules TEXT NOT NULL,
        priority INTEGER NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create trust levels table
    db.exec(`
      CREATE TABLE trust_levels (
        operation TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        successes INTEGER NOT NULL DEFAULT 0,
        failures INTEGER NOT NULL DEFAULT 0,
        last_attestation TEXT,
        attestation_due TEXT,
        last_updated TEXT NOT NULL
      )
    `);

    // Create action proposals table
    db.exec(`
      CREATE TABLE action_proposals (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        intent TEXT NOT NULL,
        operation TEXT NOT NULL,
        target_entity TEXT,
        data_domain TEXT NOT NULL,
        data_classification TEXT NOT NULL,
        reversibility TEXT NOT NULL,
        confidence REAL NOT NULL,
        related_skills TEXT,
        rollback_plan TEXT,
        evaluation_model TEXT NOT NULL,
        raw_user_input TEXT NOT NULL,
        requires_confirmation INTEGER NOT NULL,
        risk_level TEXT NOT NULL,
        policy_result TEXT,
        user_decision TEXT,
        executed_at TEXT,
        execution_result TEXT
      )
    `);

    // Create MCP servers table
    db.exec(`
      CREATE TABLE mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        status TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        tools TEXT NOT NULL,
        registered_at TEXT NOT NULL,
        last_health_check TEXT
      )
    `);

    // Create indexes for audit log queries
    db.exec(`
      CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
      CREATE INDEX idx_audit_event_type ON audit_log(event_type);
      CREATE INDEX idx_audit_operation ON audit_log(operation);
      CREATE INDEX idx_audit_outcome ON audit_log(outcome);
    `);

    // Create indexes for skill lookups
    db.exec(`
      CREATE INDEX idx_skills_status ON skills(status);
      CREATE INDEX idx_skills_priority ON skills(priority DESC);
    `);

    // Create indexes for proposal history
    db.exec(`
      CREATE INDEX idx_proposals_timestamp ON action_proposals(timestamp);
      CREATE INDEX idx_proposals_operation ON action_proposals(operation);
    `);

    // Create triggers to enforce audit log append-only constraint
    db.exec(`
      CREATE TRIGGER prevent_audit_update
      BEFORE UPDATE ON audit_log
      BEGIN
        SELECT RAISE(ABORT, 'Audit log records are immutable');
      END;
    `);

    db.exec(`
      CREATE TRIGGER prevent_audit_delete
      BEFORE DELETE ON audit_log
      BEGIN
        SELECT RAISE(ABORT, 'Audit log records cannot be deleted');
      END;
    `);
  },

  down(db: Database.Database) {
    // Drop triggers
    db.exec(`DROP TRIGGER IF EXISTS prevent_audit_update`);
    db.exec(`DROP TRIGGER IF EXISTS prevent_audit_delete`);

    // Drop indexes
    db.exec(`
      DROP INDEX IF EXISTS idx_audit_timestamp;
      DROP INDEX IF EXISTS idx_audit_event_type;
      DROP INDEX IF EXISTS idx_audit_operation;
      DROP INDEX IF EXISTS idx_audit_outcome;
      DROP INDEX IF EXISTS idx_skills_status;
      DROP INDEX IF EXISTS idx_skills_priority;
      DROP INDEX IF EXISTS idx_proposals_timestamp;
      DROP INDEX IF EXISTS idx_proposals_operation;
    `);

    // Drop tables
    db.exec(`
      DROP TABLE IF EXISTS mcp_servers;
      DROP TABLE IF EXISTS action_proposals;
      DROP TABLE IF EXISTS trust_levels;
      DROP TABLE IF EXISTS policies;
      DROP TABLE IF EXISTS skills;
      DROP TABLE IF EXISTS audit_log;
    `);
  },
};
