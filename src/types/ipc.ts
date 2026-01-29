/**
 * IPC (Inter-Process Communication) Type Definitions
 * Defines type-safe message structures for main-renderer communication
 * AC-1.2.3.2: Type-safe IPC message definitions for all operations
 */

import type { Skill, Policy, TrustLevel, ActionProposal, AuditLog, MCPServer } from './index';

// ============================================================================
// Core IPC Message Types
// ============================================================================

/**
 * Generic IPC request structure
 */
export interface IPCRequest<T = unknown> {
  id: string;
  channel: string;
  payload: T;
  timestamp: string;
}

/**
 * Generic IPC response structure
 * AC-1.2.3.3: Request-response pattern with timeout and error handling
 */
export interface IPCResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: IPCError;
  timestamp: string;
}

/**
 * IPC error structure
 */
export interface IPCError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Generic IPC event structure
 * AC-1.2.3.4: Event subscription pattern for streaming updates
 */
export interface IPCEvent<T = unknown> {
  type: IPCEventType;
  payload: T;
  timestamp: string;
}

// ============================================================================
// IPC Channels (Request-Response)
// ============================================================================

/**
 * All available IPC channels for request-response communication
 */
export type IPCChannel =
  // Input Channels
  | 'input:submit-text'
  | 'input:start-recording'
  | 'input:stop-recording'
  | 'input:confirm-transcription'
  | 'input:get-state'
  // Skill Channels
  | 'skills:list'
  | 'skills:get'
  | 'skills:activate'
  | 'skills:deactivate'
  | 'skills:reload'
  // Policy Channels
  | 'policies:list'
  | 'policies:get'
  | 'policies:evaluate'
  | 'policies:reload'
  // Trust Channels
  | 'trust:get-levels'
  | 'trust:get-level'
  | 'trust:promote'
  | 'trust:demote'
  | 'trust:get-attestation-status'
  // Proposal Channels
  | 'proposals:get-pending'
  | 'proposals:confirm'
  | 'proposals:reject'
  | 'proposals:get-history'
  // Audit Channels
  | 'audit:query'
  | 'audit:export'
  | 'audit:get-stats'
  // MCP Channels
  | 'mcp:list-servers'
  | 'mcp:get-server'
  | 'mcp:list-tools'
  | 'mcp:call-tool'
  // System Channels
  | 'system:get-info'
  | 'system:get-version'
  | 'system:check-updates'
  | 'system:restart';

// ============================================================================
// IPC Event Types (Pub-Sub)
// ============================================================================

/**
 * All available IPC event types for pub-sub communication
 */
export type IPCEventType =
  // Input Events
  | 'input:transcription-update'
  | 'input:transcription-preview'
  | 'input:transcription-complete'
  | 'input:recording-started'
  | 'input:recording-stopped'
  // Proposal Events
  | 'proposal:new'
  | 'proposal:approved'
  | 'proposal:rejected'
  | 'proposal:expired'
  // Action Events
  | 'action:queued'
  | 'action:executing'
  | 'action:completed'
  | 'action:failed'
  | 'action:rolled-back'
  // Trust Events
  | 'trust:level-updated'
  | 'trust:attestation-required'
  | 'trust:attestation-completed'
  // Skill Events
  | 'skill:activated'
  | 'skill:deactivated'
  | 'skill:updated'
  // Policy Events
  | 'policy:updated'
  | 'policy:violated'
  // MCP Events
  | 'mcp:server-connected'
  | 'mcp:server-disconnected'
  | 'mcp:tool-discovered'
  // System Events
  | 'system:error'
  | 'system:update-available'
  | 'system:update-downloaded';

// ============================================================================
// Payload Type Mappings
// ============================================================================

/**
 * Maps IPC channels to their expected payload types
 */
export interface IPCChannelPayloads {
  // Input
  'input:submit-text': string;
  'input:start-recording': void;
  'input:stop-recording': void;
  'input:confirm-transcription': TranscriptionPreview;
  'input:get-state': void;

  // Skills
  'skills:list': SkillListQuery;
  'skills:get': { skillId: string };
  'skills:activate': { skillId: string };
  'skills:deactivate': { skillId: string };
  'skills:reload': void;

  // Policies
  'policies:list': void;
  'policies:get': { policyId: string };
  'policies:evaluate': PolicyEvaluationRequest;
  'policies:reload': void;

  // Trust
  'trust:get-levels': void;
  'trust:get-level': { skillId: string };
  'trust:promote': TrustPromotionRequest;
  'trust:demote': TrustDemotionRequest;
  'trust:get-attestation-status': { skillId: string };

  // Proposals
  'proposals:get-pending': void;
  'proposals:confirm': { proposalId: string };
  'proposals:reject': { proposalId: string; reason?: string };
  'proposals:get-history': ProposalHistoryQuery;

  // Audit
  'audit:query': AuditQueryRequest;
  'audit:export': AuditExportRequest;
  'audit:get-stats': AuditStatsQuery;

  // MCP
  'mcp:list-servers': void;
  'mcp:get-server': { serverId: string };
  'mcp:list-tools': { serverId: string };
  'mcp:call-tool': MCPToolCallRequest;

  // System
  'system:get-info': void;
  'system:get-version': void;
  'system:check-updates': void;
  'system:restart': void;
}

/**
 * Maps IPC channels to their response types
 */
export interface IPCChannelResponses {
  // Input
  'input:submit-text': InputSubmissionResult;
  'input:start-recording': { recordingId: string };
  'input:stop-recording': { transcription: string };
  'input:confirm-transcription': InputSubmissionResult;
  'input:get-state': InputState;

  // Skills
  'skills:list': Skill[];
  'skills:get': Skill;
  'skills:activate': { success: boolean };
  'skills:deactivate': { success: boolean };
  'skills:reload': { count: number };

  // Policies
  'policies:list': Policy[];
  'policies:get': Policy;
  'policies:evaluate': PolicyEvaluationResult;
  'policies:reload': { count: number };

  // Trust
  'trust:get-levels': TrustLevel[];
  'trust:get-level': TrustLevel;
  'trust:promote': { newLevel: string };
  'trust:demote': { newLevel: string };
  'trust:get-attestation-status': AttestationStatus;

  // Proposals
  'proposals:get-pending': ActionProposal[];
  'proposals:confirm': { proposalId: string; confirmed: boolean };
  'proposals:reject': { proposalId: string; rejected: boolean };
  'proposals:get-history': ActionProposal[];

  // Audit
  'audit:query': AuditLog[];
  'audit:export': { path: string; format: string };
  'audit:get-stats': AuditStats;

  // MCP
  'mcp:list-servers': MCPServer[];
  'mcp:get-server': MCPServer;
  'mcp:list-tools': MCPTool[];
  'mcp:call-tool': MCPToolResult;

  // System
  'system:get-info': SystemInfo;
  'system:get-version': { version: string };
  'system:check-updates': UpdateInfo;
  'system:restart': void;
}

/**
 * Maps IPC event types to their payload types
 */
export interface IPCEventPayloads {
  // Input
  'input:transcription-update': { partial: string; confidence: number };
  'input:transcription-preview': TranscriptionPreview;
  'input:transcription-complete': { text: string; confidence: number };
  'input:recording-started': { recordingId: string };
  'input:recording-stopped': { recordingId: string };

  // Proposal
  'proposal:new': { proposal: ActionProposal };
  'proposal:approved': { proposalId: string };
  'proposal:rejected': { proposalId: string; reason?: string };
  'proposal:expired': { proposalId: string };

  // Action
  'action:queued': { actionId: string };
  'action:executing': { actionId: string; description: string };
  'action:completed': { actionId: string; result: unknown };
  'action:failed': { actionId: string; error: string };
  'action:rolled-back': { actionId: string };

  // Trust
  'trust:level-updated': { skillId: string; newLevel: string };
  'trust:attestation-required': { skillId: string; reason: string };
  'trust:attestation-completed': { skillId: string; result: boolean };

  // Skill
  'skill:activated': { skillId: string };
  'skill:deactivated': { skillId: string };
  'skill:updated': { skillId: string };

  // Policy
  'policy:updated': { policyId: string };
  'policy:violated': { policyId: string; violation: string };

  // MCP
  'mcp:server-connected': { serverId: string };
  'mcp:server-disconnected': { serverId: string };
  'mcp:tool-discovered': { serverId: string; toolName: string };

  // System
  'system:error': { error: string; details?: unknown };
  'system:update-available': UpdateInfo;
  'system:update-downloaded': UpdateInfo;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface TranscriptionPreview {
  text: string;
  confidence: number;
  language: string;
  duration: number;
}

export interface InputSubmissionResult {
  inputId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface InputState {
  isRecording: boolean;
  currentRecordingId?: string;
  isProcessing: boolean;
}

export interface SkillListQuery {
  active?: boolean;
  category?: string;
}

export interface PolicyEvaluationRequest {
  skillId: string;
  action: string;
  context: Record<string, unknown>;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  appliedPolicies: string[];
  violations: string[];
  reasoning: string;
}

export interface TrustPromotionRequest {
  skillId: string;
  reason: string;
}

export interface TrustDemotionRequest {
  skillId: string;
  reason: string;
}

export interface AttestationStatus {
  required: boolean;
  lastAttested?: string;
  nextRequired?: string;
}

export interface ProposalHistoryQuery {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
}

export interface AuditQueryRequest {
  startDate?: string;
  endDate?: string;
  skillId?: string;
  actionType?: string;
  limit?: number;
  offset?: number;
}

export interface AuditExportRequest {
  format: 'json' | 'csv' | 'pdf';
  startDate?: string;
  endDate?: string;
  skillId?: string;
}

export interface AuditStatsQuery {
  period: 'day' | 'week' | 'month' | 'year';
}

export interface AuditStats {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  rolledBackActions: number;
  topSkills: Array<{ skillId: string; count: number }>;
  topActions: Array<{ actionType: string; count: number }>;
}

export interface MCPToolCallRequest {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  electron: string;
  chrome: string;
  node: string;
  appVersion: string;
}

export interface UpdateInfo {
  available: boolean;
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
}
