/**
 * Evaluation LLM Service
 *
 * Uses Ollama with constrained JSON decoding to generate structured ActionProposal
 * objects from user input. Ensures fast, deterministic, and local-only operation.
 *
 * Design Decisions:
 * - Low temperature (0.1) for deterministic output
 * - JSON Schema-based constrained decoding via Ollama format parameter
 * - Retry logic for malformed JSON (up to 3 attempts)
 * - Confidence scoring based on model output
 * - Context window management for long inputs
 * - Business rule validation on top of schema validation
 *
 * Performance Target: 2-3 seconds per proposal generation
 */

import Ajv, { type ValidateFunction } from 'ajv';
import { OllamaClient } from './ollamaClient';
import { ACTION_PROPOSAL_SCHEMA } from '@/types/schemas/actionProposal.schema';
import {
  EvaluationError,
  EvaluationModelNotFoundError,
  EvaluationValidationError,
  EvaluationTimeoutError,
  EvaluationRetryExhaustedError,
} from './evaluationErrors';
import type { ActionProposal } from '@/types';
import { uuid, iso8601 } from '@/types';

/**
 * Input for proposal generation (simplified from full ProcessedInput)
 */
export interface ProposalGenerationInput {
  /** Unique input identifier */
  id: string;
  /** User input text */
  text: string;
  /** Input source (text or voice) */
  source: 'text' | 'voice';
  /** When input was received */
  timestamp: string;
  /** Additional metadata */
  metadata?: {
    /** Input text length */
    char_length?: number;
    /** Word count */
    word_count?: number;
    /** Audio duration (if voice) */
    duration_ms?: number;
    /** Transcription confidence (if voice) */
    confidence?: number;
  };
  /** Optional context */
  context?: {
    /** Recent conversation messages */
    conversation_history?: Array<{ role: string; content: string }>;
    /** Current view/page */
    current_view?: string;
  };
}

/**
 * Configuration for Evaluation LLM Service
 */
export interface EvaluationLLMConfig {
  /** Model name (default: 'qwen2.5:3b') */
  model: string;
  /** Temperature for generation (default: 0.1 for determinism) */
  temperature: number;
  /** Maximum retries on validation failure (default: 3) */
  maxRetries: number;
  /** Timeout per generation attempt in milliseconds (default: 30000) */
  timeoutMs: number;
  /** Maximum context window tokens (default: 4096) */
  maxContextTokens: number;
}

const DEFAULT_CONFIG: EvaluationLLMConfig = {
  model: 'qwen2.5:3b',
  temperature: 0.1,
  maxRetries: 3,
  timeoutMs: 30000,
  maxContextTokens: 4096,
};

/**
 * Evaluation LLM Service
 *
 * Generates ActionProposal objects from user input using local Ollama models.
 */
export class EvaluationLLMService {
  private ollama: OllamaClient;
  private config: EvaluationLLMConfig;
  private ajv: Ajv;
  private validateProposal: ValidateFunction;

  constructor(ollama: OllamaClient, config?: Partial<EvaluationLLMConfig>) {
    this.ollama = ollama;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize JSON Schema validator
    this.ajv = new Ajv({ allErrors: true, strict: false });
    this.validateProposal = this.ajv.compile(ACTION_PROPOSAL_SCHEMA);
  }

  /**
   * Initialize service and verify model availability
   * @throws EvaluationModelNotFoundError if model not available
   * @throws EvaluationError if Ollama service not healthy
   */
  public async initialize(): Promise<void> {
    // Check Ollama health
    const healthy = await this.ollama.checkHealth();
    if (!healthy) {
      throw new EvaluationError('Ollama service not available');
    }

    // Check if model exists
    const models = await this.ollama.listModels();
    const hasModel = models.some((m) => m.name.includes(this.config.model));

    if (!hasModel) {
      throw new EvaluationModelNotFoundError(this.config.model);
    }
  }

  /**
   * Generate ActionProposal from user input
   * @param input - User input to evaluate
   * @returns Generated and validated ActionProposal
   * @throws EvaluationError on generation failure
   * @throws EvaluationValidationError on validation failure
   * @throws EvaluationRetryExhaustedError if all retries fail
   */
  public async generateProposal(input: ProposalGenerationInput): Promise<ActionProposal> {
    const startTime = Date.now();

    // Build prompt
    const prompt = this.buildPrompt(input);

    // Generate with retries
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.ollama.generate({
          model: this.config.model,
          prompt,
          format: JSON.stringify(ACTION_PROPOSAL_SCHEMA),
          options: {
            temperature: this.config.temperature,
            top_p: 0.9,
            num_predict: 512, // Reasonable max tokens for proposal
          },
        });

        // Parse and validate
        const proposal = this.parseAndValidate(response, input);
        const duration = Date.now() - startTime;

        console.log(
          `✓ Proposal generated in ${duration}ms (attempt ${attempt}/${this.config.maxRetries})`
        );

        return proposal;
      } catch (error) {
        console.error(
          `✗ Proposal generation attempt ${attempt}/${this.config.maxRetries} failed:`,
          error
        );

        // Don't retry if it's a model not found error
        if (error instanceof EvaluationModelNotFoundError) {
          throw error;
        }

        // Don't retry if it's a timeout error
        if (error instanceof EvaluationTimeoutError) {
          throw error;
        }

        // If last attempt, throw retry exhausted error
        if (attempt === this.config.maxRetries) {
          throw new EvaluationRetryExhaustedError(
            this.config.maxRetries,
            error instanceof Error ? error : undefined
          );
        }

        // Wait before retry (exponential backoff)
        await this.sleep(1000 * attempt);
      }
    }

    // Should never reach here
    throw new EvaluationRetryExhaustedError(this.config.maxRetries);
  }

  /**
   * Check if service is available
   * @returns true if Ollama is healthy, false otherwise
   */
  public async isAvailable(): Promise<boolean> {
    return this.ollama.checkHealth();
  }

  /**
   * Get information about the current model
   * @returns Model metadata
   */
  public getModelInfo(): {
    name: string;
    type: 'local' | 'cloud';
    provider: string;
    capabilities: string[];
  } {
    return {
      name: this.config.model,
      type: 'local',
      provider: 'ollama',
      capabilities: ['json_mode', 'low_latency', 'constrained_decoding'],
    };
  }

  /**
   * Get current configuration
   * @returns Current service configuration (read-only copy)
   */
  public getConfig(): Readonly<EvaluationLLMConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime
   * @param config - Partial config to merge with existing
   */
  public updateConfig(config: Partial<EvaluationLLMConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // =====================================================================
  // Private methods
  // =====================================================================

  /**
   * Build prompt for proposal generation
   * @param input - User input
   * @returns Structured prompt for LLM
   */
  private buildPrompt(input: ProposalGenerationInput): string {
    // Add conversation context if available
    let contextSection = '';
    if (input.context?.conversation_history && input.context.conversation_history.length > 0) {
      const recentMessages = input.context.conversation_history
        .slice(-3)
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');
      contextSection = `\nRecent conversation:\n${recentMessages}\n`;
    }

    return `You are an AI assistant that analyzes user requests and generates structured action proposals.

${contextSection}
User Input: "${input.text}"

Your task:
1. Analyze the user's intent and summarize what they want to accomplish
2. Determine the operation type in format "module:action" (e.g., "incident:create", "calendar:read")
3. Identify the target entity if applicable (null for new entities)
4. Assess data domain (enterprise for work-related, personal for individual tasks)
5. Classify data sensitivity (public, internal, confidential, restricted)
6. Determine reversibility type based on operation:
   - FULL: Read operations, easily undoable creates
   - PARTIAL: Updates where some changes can't be reversed
   - COMPENSATABLE: Deletes that can be recreated
   - IRREVERSIBLE: Sends, publishes, irreversible operations
7. Assign confidence score (0.0-1.0) based on clarity:
   - 0.9-1.0: Clear, unambiguous intent
   - 0.7-0.9: Mostly clear, minor ambiguity
   - 0.5-0.7: Moderate ambiguity
   - Below 0.5: Unclear or insufficient information
8. Determine if confirmation is required (true for write/delete, false for reads)
9. Assess risk level:
   - low: Read operations, simple views
   - medium: Create/update operations, reversible changes
   - high: Delete operations, bulk operations, irreversible changes

Available operation types (examples):
- incident:create, incident:update, incident:read, incident:delete
- calendar:create, calendar:update, calendar:read, calendar:delete
- task:create, task:update, task:read, task:delete
- note:create, note:update, note:read, note:delete
- file:read, file:write, file:delete

Guidelines:
- Use lowercase with underscores for operation names (e.g., "incident:create" not "Incident:Create")
- Set requires_confirmation=true for any write/delete operations
- High-risk operations (deletes, bulk) must require confirmation
- Read operations should be low risk and not require confirmation
- Confidence should reflect clarity of user intent, not system capability
- Data classification: public (no sensitive data), internal (company info), confidential (restricted), restricted (highly sensitive)

Generate a valid ActionProposal JSON object following the schema exactly.`;
  }

  /**
   * Parse LLM response and validate against schema
   * @param response - Raw JSON string from LLM
   * @param input - Original input for context
   * @returns Validated ActionProposal
   * @throws EvaluationValidationError on validation failure
   */
  private parseAndValidate(response: string, input: ProposalGenerationInput): ActionProposal {
    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(response);
    } catch (error) {
      throw new EvaluationValidationError(
        'Invalid JSON response from LLM',
        ['Failed to parse JSON'],
        error instanceof Error ? error : undefined
      );
    }

    // Validate against schema
    const valid = this.validateProposal(parsed);
    if (!valid) {
      const errors = this.validateProposal.errors?.map(
        (err) => `${err.instancePath} ${err.message}`
      ) || ['Unknown validation error'];
      throw new EvaluationValidationError('Schema validation failed', errors);
    }

    // Add auto-generated fields
    const proposal: ActionProposal = {
      ...parsed,
      id: uuid(crypto.randomUUID()),
      timestamp: iso8601(new Date().toISOString()),
      evaluation_model: this.config.model,
      raw_user_input: input.text,
      related_skills: [], // Populated by policy engine later
      rollback_plan: null, // Generated by expert AI if needed
    };

    // Apply business rule validation and corrections
    this.validateAndCorrectBusinessRules(proposal);

    return proposal;
  }

  /**
   * Validate and correct business rules
   * Ensures proposal follows logical constraints beyond schema validation
   * @param proposal - Proposal to validate (modified in-place)
   * @throws EvaluationValidationError on critical business rule violations
   */
  private validateAndCorrectBusinessRules(proposal: ActionProposal): void {
    const errors: string[] = [];

    // 1. Confidence must be in valid range
    if (proposal.confidence < 0 || proposal.confidence > 1) {
      errors.push(`Confidence ${proposal.confidence} out of range [0, 1]`);
    }

    // 2. Operation format must be valid
    if (!/^[a-z_]+:[a-z_]+$/.test(proposal.operation)) {
      errors.push(
        `Operation '${proposal.operation}' must be in format 'module:action' with lowercase`
      );
    }

    // 3. High-risk operations MUST require confirmation
    if (proposal.risk_level === 'high' && !proposal.requires_confirmation) {
      console.warn('⚠ Correcting: High-risk operation must require confirmation');
      proposal.requires_confirmation = true;
    }

    // 4. Delete operations should be high risk
    if (proposal.operation.includes('delete')) {
      if (proposal.risk_level !== 'high') {
        console.warn(
          `⚠ Correcting: Delete operation risk level from ${proposal.risk_level} to high`
        );
        proposal.risk_level = 'high';
      }
      if (!['COMPENSATABLE', 'IRREVERSIBLE'].includes(proposal.reversibility)) {
        console.warn(
          `⚠ Correcting: Delete operation reversibility from ${proposal.reversibility} to IRREVERSIBLE`
        );
        proposal.reversibility = 'IRREVERSIBLE';
      }
      if (!proposal.requires_confirmation) {
        console.warn('⚠ Correcting: Delete operation must require confirmation');
        proposal.requires_confirmation = true;
      }
    }

    // 5. Read operations should be low risk and not require confirmation
    if (proposal.operation.includes('read') || proposal.operation.includes('view')) {
      if (proposal.risk_level !== 'low') {
        console.warn(`⚠ Correcting: Read operation risk level from ${proposal.risk_level} to low`);
        proposal.risk_level = 'low';
      }
      if (proposal.reversibility !== 'FULL') {
        console.warn(
          `⚠ Correcting: Read operation reversibility from ${proposal.reversibility} to FULL`
        );
        proposal.reversibility = 'FULL';
      }
      if (proposal.requires_confirmation) {
        console.warn('⚠ Correcting: Read operation should not require confirmation');
        proposal.requires_confirmation = false;
      }
    }

    // 6. Create operations should be at least medium risk
    if (proposal.operation.includes('create') && proposal.risk_level === 'low') {
      console.warn(
        `⚠ Correcting: Create operation risk level from ${proposal.risk_level} to medium`
      );
      proposal.risk_level = 'medium';
    }

    // 7. Intent should not be empty or too short
    if (proposal.intent.trim().length < 5) {
      errors.push(`Intent '${proposal.intent}' is too short (minimum 5 characters)`);
    }

    // Throw if there are critical errors
    if (errors.length > 0) {
      throw new EvaluationValidationError('Business rule validation failed', errors);
    }
  }

  /**
   * Sleep for specified duration
   * @param ms - Duration in milliseconds
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

let evaluationLlmServiceInstance: EvaluationLLMService | null = null;

/**
 * Get or create Evaluation LLM Service singleton
 * @param ollama - Ollama client instance (required for first call)
 * @param config - Optional configuration
 * @returns Evaluation LLM Service instance
 */
export function getEvaluationLlmService(
  ollama?: OllamaClient,
  config?: Partial<EvaluationLLMConfig>
): EvaluationLLMService {
  if (!evaluationLlmServiceInstance) {
    if (!ollama) {
      throw new EvaluationError('OllamaClient is required to create EvaluationLLMService instance');
    }
    evaluationLlmServiceInstance = new EvaluationLLMService(ollama, config);
  }
  return evaluationLlmServiceInstance;
}

/**
 * Reset singleton instance (primarily for testing)
 */
export function resetEvaluationLlmService(): void {
  evaluationLlmServiceInstance = null;
}
