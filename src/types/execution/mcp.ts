/**
 * MCP (Model Context Protocol) Server type definitions
 *
 * MCP servers provide tools and capabilities that the AI can use,
 * such as ServiceNow API access, calendar integration, etc.
 */

import type { UUID, ISO8601String } from '../common';

/**
 * MCP server status
 */
export type MCPServerStatus = 'active' | 'inactive' | 'error' | 'initializing';

/**
 * MCP tool definition
 */
export interface MCPTool {
  /** Tool name */
  name: string;
  /** Description of what the tool does */
  description: string;
  /** Input schema (JSON Schema) */
  input_schema: Record<string, unknown>;
  /** Whether tool requires authentication */
  requires_auth?: boolean;
}

/**
 * MCP server capability
 */
export type MCPCapability = 'tools' | 'resources' | 'prompts' | 'sampling';

/**
 * MCP server registration
 */
export interface MCPServer {
  /** Unique identifier */
  id: UUID;
  /** Human-readable name */
  name: string;
  /** Server version */
  version: string;
  /** Current status */
  status: MCPServerStatus;
  /** Capabilities provided by this server */
  capabilities: MCPCapability[];
  /** Tools available from this server */
  tools: MCPTool[];
  /** When server was registered */
  registered_at: ISO8601String;
  /** Last successful health check */
  last_health_check: ISO8601String | null;
  /** Configuration data */
  config?: Record<string, unknown>;
}

/**
 * MCP server health check result
 */
export interface MCPHealthCheck {
  /** Server being checked */
  server_id: UUID;
  /** Whether server is healthy */
  healthy: boolean;
  /** Response time in milliseconds */
  response_time_ms: number;
  /** When check was performed */
  checked_at: ISO8601String;
  /** Error message if unhealthy */
  error?: string;
}

/**
 * MCP tool invocation request
 */
export interface MCPToolInvocation {
  /** Server providing the tool */
  server_id: UUID;
  /** Tool to invoke */
  tool_name: string;
  /** Input parameters */
  parameters: Record<string, unknown>;
  /** Timeout in milliseconds */
  timeout_ms?: number;
}

/**
 * MCP tool invocation result
 */
export interface MCPToolResult {
  /** Whether invocation succeeded */
  success: boolean;
  /** Duration in milliseconds */
  duration_ms: number;
  /** Result data (if successful) */
  result?: unknown;
  /** Error message (if failed) */
  error?: string;
  /** When invocation completed */
  completed_at: ISO8601String;
}
