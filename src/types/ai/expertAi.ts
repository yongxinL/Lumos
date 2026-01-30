/**
 * Expert AI Service Type Definitions
 *
 * Types for the Expert AI service that handles complex reasoning,
 * action planning, and multi-turn conversations.
 */

import type { UUID, ISO8601String, OperationType } from '../common';
import type { ActionProposal } from '../governance/proposal';
import type { AIProviderType } from './provider';

/**
 * Conversation message
 */
export interface Message {
  /**
   * Role of the message sender
   */
  role: 'system' | 'user' | 'assistant';

  /**
   * Message content
   */
  content: string;

  /**
   * Timestamp of message (ISO8601)
   */
  timestamp?: ISO8601String;

  /**
   * Optional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Conversation state
 */
export interface Conversation {
  /**
   * Unique conversation identifier
   */
  id: UUID;

  /**
   * Conversation messages
   */
  messages: Message[];

  /**
   * When conversation was created
   */
  createdAt: ISO8601String;

  /**
   * When conversation was last updated
   */
  updatedAt: ISO8601String;

  /**
   * Provider used for this conversation
   */
  provider?: AIProviderType;

  /**
   * Model used for this conversation
   */
  model?: string;

  /**
   * Optional conversation metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Expert AI configuration
 */
export interface ExpertAIConfig {
  /**
   * Default provider to use
   */
  defaultProvider: string;

  /**
   * Default model to use
   */
  defaultModel?: string;

  /**
   * Maximum conversation length (message count)
   */
  maxConversationLength: number;

  /**
   * Context window size in tokens
   */
  contextWindowSize: number;

  /**
   * Temperature for general queries (0-1)
   */
  temperature?: number;

  /**
   * Maximum tokens to generate per response
   */
  maxTokens?: number;
}

/**
 * Expert AI response
 */
export interface ExpertResponse {
  /**
   * Conversation ID
   */
  conversationId: UUID;

  /**
   * Generated content
   */
  content: string;

  /**
   * Provider used
   */
  provider: AIProviderType;

  /**
   * Model used
   */
  model: string;

  /**
   * Token usage statistics
   */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };

  /**
   * Timing information (milliseconds)
   */
  timing?: {
    total?: number;
    modelLoad?: number;
    promptEval?: number;
    completion?: number;
  };

  /**
   * Response timestamp
   */
  timestamp: ISO8601String;
}

/**
 * Action plan step
 */
export interface ActionStep {
  /**
   * Step order (1-indexed)
   */
  order: number;

  /**
   * Action to perform
   */
  action: string;

  /**
   * Detailed description
   */
  description: string;

  /**
   * Expected duration in milliseconds
   */
  estimatedDurationMs?: number;

  /**
   * Tools or skills required
   */
  requiredTools?: string[];
}

/**
 * Action plan
 */
export interface ActionPlan {
  /**
   * Unique plan identifier
   */
  id: UUID;

  /**
   * Associated proposal ID
   */
  proposalId: UUID;

  /**
   * Execution steps
   */
  steps: ActionStep[];

  /**
   * Prerequisites that must be met
   */
  prerequisites: string[];

  /**
   * Expected outcomes
   */
  expectedOutcomes: string[];

  /**
   * Validation checks after execution
   */
  validationChecks: string[];

  /**
   * Estimated total duration in milliseconds
   */
  estimatedDurationMs?: number;

  /**
   * When plan was created
   */
  createdAt?: ISO8601String;
}

/**
 * Rollback plan with metadata
 */
export interface RollbackPlanWithMetadata {
  /**
   * Rollback type
   */
  type: 'FULL' | 'PARTIAL' | 'COMPENSATABLE' | 'IRREVERSIBLE';

  /**
   * Rollback method description
   */
  method: string;

  /**
   * Rollback steps
   */
  steps: Array<{
    order: number;
    description: string;
    operation: OperationType;
    estimatedDurationMs?: number;
  }>;

  /**
   * Estimated success rate (0-1)
   */
  estimatedSuccessRate: number;

  /**
   * Warnings about rollback
   */
  warnings?: string[];

  /**
   * Conditions required for rollback
   */
  conditions?: string[];
}

/**
 * Model option for UI selection
 */
export interface ModelOption {
  /**
   * Provider instance ID
   */
  id: string;

  /**
   * Provider name
   */
  name: string;

  /**
   * Provider type
   */
  type: AIProviderType;

  /**
   * Model identifier
   */
  model: string;

  /**
   * Whether provider is currently healthy
   */
  healthy: boolean;

  /**
   * Optional model capabilities
   */
  capabilities?: {
    streaming?: boolean;
    vision?: boolean;
    maxTokens?: number;
  };
}

/**
 * Processed input for Expert AI
 */
export interface ProcessedInput {
  /**
   * User input text
   */
  text: string;

  /**
   * Optional conversation ID for continuity
   */
  conversationId?: UUID;

  /**
   * Optional system instructions
   */
  system?: string;

  /**
   * Optional metadata
   */
  metadata?: {
    userId?: string;
    sessionId?: string;
    source?: string;
    [key: string]: unknown;
  };
}

/**
 * Executed action data for rollback generation
 */
export interface ExecutedActionData {
  /**
   * Action execution ID
   */
  id: UUID;

  /**
   * Original proposal ID
   */
  proposalId: UUID;

  /**
   * Operation performed
   */
  operation: OperationType;

  /**
   * Execution result
   */
  result: {
    success: boolean;
    output?: Record<string, unknown>;
    error?: string;
    durationMs?: number;
  };

  /**
   * When action was executed
   */
  executedAt: ISO8601String;

  /**
   * Original proposal (for context)
   */
  proposal?: ActionProposal;
}
