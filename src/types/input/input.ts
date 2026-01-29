/**
 * Input processing type definitions
 *
 * Types for handling and interpreting user input.
 */

import type { UUID, ISO8601String, OperationType, DataDomain, EntityReference } from '../common';
import type { ActionProposal } from '../governance/proposal';

/**
 * Raw user input
 */
export interface UserInput {
  /** Unique identifier */
  id: UUID;
  /** When input was received */
  timestamp: ISO8601String;
  /** User who provided input */
  user_id: string;
  /** Raw text input */
  text: string;
  /** Input context (chat history, current view, etc.) */
  context?: InputContext;
  /** Input modality */
  modality: 'text' | 'voice' | 'ui_action';
}

/**
 * Context for interpreting user input
 */
export interface InputContext {
  /** Current conversation history */
  conversation_history?: ConversationMessage[];
  /** Current view or page in UI */
  current_view?: string;
  /** Currently selected entity (if any) */
  selected_entity?: EntityReference;
  /** Recent actions performed */
  recent_actions?: UUID[];
  /** User preferences */
  preferences?: Record<string, unknown>;
}

/**
 * Conversation message for context
 */
export interface ConversationMessage {
  /** Message ID */
  id: UUID;
  /** Timestamp */
  timestamp: ISO8601String;
  /** Who sent the message */
  role: 'user' | 'assistant' | 'system';
  /** Message content */
  content: string;
  /** Associated action (if any) */
  action_id?: UUID;
}

/**
 * Processed input after intent classification
 */
export interface ProcessedInput {
  /** Original input ID */
  input_id: UUID;
  /** Classified intent */
  intent: IntentType;
  /** Confidence score (0-1) */
  confidence: number;
  /** Extracted entities and parameters */
  entities: ExtractedEntity[];
  /** Inferred operation (if actionable) */
  operation: OperationType | null;
  /** Suggested data domain */
  data_domain: DataDomain | null;
  /** Whether input requires clarification */
  needs_clarification: boolean;
  /** Clarifying questions (if needed) */
  clarification_questions?: string[];
  /** Generated proposals (if actionable) */
  proposals?: ActionProposal[];
}

/**
 * Intent classification types
 */
export type IntentType =
  | 'action_request' // User wants to perform an action
  | 'information_query' // User wants information
  | 'clarification' // User is providing clarification
  | 'confirmation' // User is confirming/denying a proposal
  | 'configuration' // User wants to configure settings
  | 'feedback' // User is providing feedback
  | 'greeting' // Social interaction
  | 'unknown'; // Unable to classify

/**
 * Extracted entity from input
 */
export interface ExtractedEntity {
  /** Entity type */
  type: string;
  /** Entity value */
  value: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Source text span */
  span: {
    start: number;
    end: number;
  };
  /** Resolved entity reference (if applicable) */
  resolved?: EntityReference;
}

/**
 * Fast path result for simple, unambiguous queries
 */
export interface FastPathResult {
  /** Whether fast path was used */
  used_fast_path: boolean;
  /** Intent type */
  intent: IntentType;
  /** Direct response (if available) */
  response?: string;
  /** Data retrieved (if applicable) */
  data?: unknown;
  /** Response time in milliseconds */
  response_time_ms: number;
}

/**
 * Input validation result
 */
export interface InputValidation {
  /** Whether input is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Warnings (valid but potentially problematic) */
  warnings: string[];
  /** Sanitized input (if validation passed) */
  sanitized_input?: string;
}

/**
 * Input type classification
 */
export type InputType = 'text' | 'voice' | 'ui_action';

/**
 * Routing destination for processed input
 */
export type Route = 'evaluation_llm' | 'expert_ai' | 'fast_path_response';

/**
 * Recording state for audio input
 */
export interface RecordingState {
  /** Whether actively recording */
  is_recording: boolean;
  /** Duration of recording in milliseconds */
  duration_ms: number;
  /** Timestamp of state change */
  timestamp: ISO8601String;
}

/**
 * Simplified processed input for fast path routing
 */
export interface FastPathRoutingInput {
  /** Input text to classify */
  text: string;
  /** Input type (text or voice) */
  type: InputType;
  /** When input was received */
  timestamp: ISO8601String;
  /** Source of input */
  source: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Fast path classification result
 */
export interface FastPathClassification {
  /** Classification: action vs non-action */
  classification: 'action' | 'non_action';
  /** Confidence score (0-1) */
  confidence: number;
  /** Matched pattern if any */
  matched_pattern: string | null;
  /** Routing destination */
  route_to: Route;
  /** Time taken to classify in milliseconds */
  classification_time_ms: number;
}
