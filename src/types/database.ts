/**
 * Database type definitions for Lumos
 */

// Audit Log
export interface AuditLog {
  id: string;
  timestamp: string;
  event_type: string;
  actor_type: string;
  actor_id?: string;
  action_id?: string;
  operation?: string;
  outcome: string;
  input_hash?: string;
  output_hash?: string;
  duration_ms?: number;
  error_message?: string;
  rollback_of?: string;
  metadata?: string; // JSON
}

// Skill
export interface Skill {
  id: string;
  name: string;
  description: string;
  version_hash: string;
  status: string;
  origin: string;
  enabled_operations: string; // JSON array
  policy_constraints: string; // JSON array
  required_trust_level: string;
  priority: number;
  data_domain: string;
  conflict_resolution: string;
  proposal_schema: string; // JSON
  rollback_specification: string; // JSON
  created_at: string;
  activated_at?: string;
  activated_by?: string;
}

// Policy
export interface Policy {
  id: string;
  name: string;
  description: string;
  version_hash: string;
  rules: string; // JSON array
  priority: number;
  enabled: number;
  created_at: string;
  updated_at: string;
}

// Trust Level
export interface TrustLevel {
  operation: string;
  level: string;
  successes: number;
  failures: number;
  last_attestation?: string;
  attestation_due?: string;
  last_updated: string;
}

// Action Proposal
export interface ActionProposal {
  id: string;
  timestamp: string;
  intent: string;
  operation: string;
  target_entity?: string; // JSON
  data_domain: string;
  data_classification: string;
  reversibility: string;
  confidence: number;
  related_skills?: string; // JSON array
  rollback_plan?: string; // JSON
  evaluation_model: string;
  raw_user_input: string;
  requires_confirmation: number;
  risk_level: string;
  policy_result?: string; // JSON
  user_decision?: string;
  executed_at?: string;
  execution_result?: string; // JSON
}

// MCP Server
export interface MCPServer {
  id: string;
  name: string;
  version: string;
  status: string;
  capabilities: string; // JSON array
  tools: string; // JSON array
  registered_at: string;
  last_health_check?: string;
}

// Schema migrations tracking
export interface SchemaMigration {
  version: number;
  name: string;
  applied_at: string;
}
