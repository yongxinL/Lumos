/**
 * Expert AI Service
 *
 * Provides complex reasoning, action planning, and multi-turn conversations
 * using AI providers. Supports model switching between local and cloud providers.
 *
 * Design Decisions:
 * - In-memory conversation management (will be persisted in database layer later)
 * - Context pruning to stay within provider token limits
 * - Provider-agnostic interface for flexibility
 * - Streaming support for real-time feedback
 * - Action planning and rollback plan generation for governance
 *
 * @module ExpertAIService
 */

import { EventEmitter } from 'events';
import type {
  UUID,
  ActionProposal,
  Conversation,
  ExpertAIConfig,
  ExpertResponse,
  ActionPlan,
  ActionStep,
  RollbackPlanWithMetadata,
  ModelOption,
  ExpertProcessedInput,
  ExecutedActionData,
} from '@/types';
import { uuid, iso8601 } from '@/types';
import type { IAIProvider } from './providers/types';
import type { AIProviderRegistry } from './providers/registry';
import {
  NoProviderAvailableError,
  ProviderNotFoundError,
  ProviderUnhealthyError,
  GenerationError,
  ParsingError,
} from './expertAiErrors';

/**
 * Default configuration for Expert AI Service
 */
const DEFAULT_CONFIG: ExpertAIConfig = {
  defaultProvider: 'default-ollama',
  defaultModel: 'qwen2.5:3b',
  maxConversationLength: 50,
  contextWindowSize: 8000,
  temperature: 0.7,
  maxTokens: 1000,
};

/**
 * Expert AI Service
 *
 * Manages conversations, action planning, and rollback generation using AI providers.
 */
export class ExpertAIService extends EventEmitter {
  private config: ExpertAIConfig;
  private registry: AIProviderRegistry;
  private conversations: Map<UUID, Conversation> = new Map();
  private currentProviderId: string;
  private initialized: boolean = false;

  /**
   * Create Expert AI Service
   * @param registry - AI provider registry
   * @param config - Optional configuration overrides
   */
  constructor(registry: AIProviderRegistry, config?: Partial<ExpertAIConfig>) {
    super();
    this.registry = registry;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.currentProviderId = this.config.defaultProvider;
  }

  /**
   * Initialize the service
   * Verifies at least one provider is available
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Check if default provider exists
    const defaultProvider = this.registry.getProvider(this.currentProviderId);

    if (defaultProvider) {
      // Check if it's healthy
      const health = await defaultProvider.checkHealth();
      if (health.status === 'healthy') {
        this.initialized = true;
        this.emit('initialized', { provider: this.currentProviderId });
        return;
      }
    }

    // Try to find any healthy provider
    const allProviders = this.registry.getAllProviders();

    for (const { id, provider } of allProviders) {
      const health = await provider.checkHealth();
      if (health.status === 'healthy') {
        this.currentProviderId = id;
        this.initialized = true;
        this.emit('initialized', { provider: id });
        return;
      }
    }

    throw new NoProviderAvailableError('No healthy AI provider available');
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Process a user query (non-streaming)
   * @param input - Processed user input
   * @returns Expert AI response
   */
  async processQuery(input: ExpertProcessedInput): Promise<ExpertResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const provider = this.getProvider();

    // Create or get conversation
    const conversationId = input.conversationId || uuid(crypto.randomUUID());
    const conversation = this.getOrCreateConversation(conversationId);

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: input.text,
      timestamp: iso8601(new Date().toISOString()),
    });

    // Prune context if needed
    this.pruneContext(conversation);

    // Build prompt from conversation
    const prompt = this.buildPrompt(conversation, input.system);

    // Generate response
    try {
      const response = await provider.generate({
        model: this.config.defaultModel || 'qwen2.5:3b',
        prompt,
        system: input.system,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      // Add assistant message
      conversation.messages.push({
        role: 'assistant',
        content: response.text,
        timestamp: iso8601(new Date().toISOString()),
      });
      conversation.updatedAt = iso8601(new Date().toISOString());
      conversation.provider = response.provider;
      conversation.model = response.model;

      // Emit event
      this.emit('query:complete', { conversationId, provider: response.provider });

      return {
        conversationId,
        content: response.text,
        provider: response.provider,
        model: response.model,
        usage: response.usage,
        timing: response.timing,
        timestamp: response.timestamp as any, // Provider response timestamp is already ISO8601String
      };
    } catch (error) {
      throw new GenerationError(
        'Failed to generate response',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Process a user query with streaming response
   * @param input - Processed user input
   * @param onChunk - Callback for each text chunk
   * @returns Complete expert AI response
   */
  async processQueryStream(
    input: ExpertProcessedInput,
    onChunk: (text: string) => void
  ): Promise<ExpertResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const provider = this.getProvider();

    // Create or get conversation
    const conversationId = input.conversationId || uuid(crypto.randomUUID());
    const conversation = this.getOrCreateConversation(conversationId);

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: input.text,
      timestamp: iso8601(new Date().toISOString()),
    });

    // Prune context if needed
    this.pruneContext(conversation);

    // Build prompt from conversation
    const prompt = this.buildPrompt(conversation, input.system);

    // Generate streaming response
    try {
      const response = await provider.generateStream(
        {
          model: this.config.defaultModel || 'qwen2.5:3b',
          prompt,
          system: input.system,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        },
        (chunk) => {
          if (!chunk.done) {
            onChunk(chunk.text);
            this.emit('stream:chunk', { conversationId, text: chunk.text });
          }
        }
      );

      // Add assistant message
      conversation.messages.push({
        role: 'assistant',
        content: response.text,
        timestamp: iso8601(new Date().toISOString()),
      });
      conversation.updatedAt = iso8601(new Date().toISOString());
      conversation.provider = response.provider;
      conversation.model = response.model;

      // Emit event
      this.emit('stream:complete', { conversationId, provider: response.provider });

      return {
        conversationId,
        content: response.text,
        provider: response.provider,
        model: response.model,
        usage: response.usage,
        timing: response.timing,
        timestamp: response.timestamp as any, // Provider response timestamp is already ISO8601String
      };
    } catch (error) {
      throw new GenerationError(
        'Failed to generate streaming response',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate an action plan from an approved proposal
   * @param proposal - Action proposal to plan
   * @returns Detailed action plan
   */
  async planAction(proposal: ActionProposal): Promise<ActionPlan> {
    if (!this.initialized) {
      await this.initialize();
    }

    const provider = this.getProvider();

    const prompt = this.buildActionPlanPrompt(proposal);

    try {
      const response = await provider.generate({
        model: this.config.defaultModel || 'qwen2.5:3b',
        prompt,
        system:
          'You are an AI assistant that creates detailed, executable action plans. Always respond with valid JSON.',
        temperature: 0.3, // Lower temperature for more deterministic planning
        maxTokens: 1500,
        format: 'json', // Request JSON format
      });

      const plan = this.parseActionPlan(response.text, proposal);

      this.emit('plan:generated', { proposalId: proposal.id, planId: plan.id });

      return plan;
    } catch (error) {
      throw new GenerationError(
        'Failed to generate action plan',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate a rollback plan for an executed action
   * @param actionData - Executed action data
   * @returns Rollback plan with metadata
   */
  async generateRollbackPlan(actionData: ExecutedActionData): Promise<RollbackPlanWithMetadata> {
    if (!this.initialized) {
      await this.initialize();
    }

    const provider = this.getProvider();

    const prompt = this.buildRollbackPlanPrompt(actionData);

    try {
      const response = await provider.generate({
        model: this.config.defaultModel || 'qwen2.5:3b',
        prompt,
        system:
          'You are an AI assistant that creates rollback plans for executed actions. Always respond with valid JSON.',
        temperature: 0.1, // Very low temperature for consistent rollback plans
        maxTokens: 1000,
        format: 'json', // Request JSON format
      });

      const plan = this.parseRollbackPlan(response.text, actionData);

      this.emit('rollback:generated', { actionId: actionData.id, plan });

      return plan;
    } catch (error) {
      throw new GenerationError(
        'Failed to generate rollback plan',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Switch to a different AI provider
   * @param providerId - Provider instance ID
   */
  async switchProvider(providerId: string): Promise<void> {
    const provider = this.registry.getProvider(providerId);

    if (!provider) {
      throw new ProviderNotFoundError(providerId);
    }

    // Check if provider is healthy
    const health = await provider.checkHealth();
    if (health.status !== 'healthy') {
      throw new ProviderUnhealthyError(providerId);
    }

    this.currentProviderId = providerId;
    this.emit('provider:switched', { providerId });
  }

  /**
   * Get available AI models/providers
   * @returns List of available model options
   */
  async getAvailableModels(): Promise<ModelOption[]> {
    const allProviders = this.registry.getAllProviders();
    const modelOptions: ModelOption[] = [];

    for (const { id, provider } of allProviders) {
      try {
        const health = await provider.checkHealth();
        const models = await provider.listModels();

        for (const model of models) {
          modelOptions.push({
            id,
            name: provider.name,
            type: provider.type,
            model: model.id,
            healthy: health.status === 'healthy',
            capabilities: model.capabilities,
          });
        }
      } catch {
        // Skip providers that fail to respond
        continue;
      }
    }

    return modelOptions;
  }

  /**
   * Get a conversation by ID
   * @param conversationId - Conversation UUID
   * @returns Conversation or undefined
   */
  getConversation(conversationId: UUID): Conversation | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Clear a conversation
   * @param conversationId - Conversation UUID
   * @returns true if conversation was deleted
   */
  clearConversation(conversationId: UUID): boolean {
    const deleted = this.conversations.delete(conversationId);
    if (deleted) {
      this.emit('conversation:cleared', { conversationId });
    }
    return deleted;
  }

  /**
   * Clear all conversations
   */
  clearAllConversations(): void {
    this.conversations.clear();
    this.emit('conversations:cleared');
  }

  /**
   * Get current provider ID
   */
  getCurrentProviderId(): string {
    return this.currentProviderId;
  }

  /**
   * Get provider instance (private helper)
   */
  private getProvider(): IAIProvider {
    const provider = this.registry.getProvider(this.currentProviderId);

    if (!provider) {
      throw new ProviderNotFoundError(
        this.currentProviderId,
        `Provider '${this.currentProviderId}' not available`
      );
    }

    return provider;
  }

  /**
   * Get or create a conversation
   */
  private getOrCreateConversation(id: UUID): Conversation {
    if (!this.conversations.has(id)) {
      const now = iso8601(new Date().toISOString());
      this.conversations.set(id, {
        id,
        messages: [],
        createdAt: now,
        updatedAt: now,
      });
      this.emit('conversation:created', { conversationId: id });
    }
    return this.conversations.get(id)!;
  }

  /**
   * Prune conversation context to stay within limits
   */
  private pruneContext(conversation: Conversation): void {
    if (conversation.messages.length <= this.config.maxConversationLength) {
      return;
    }

    // Keep system messages and recent messages
    const systemMessages = conversation.messages.filter((m) => m.role === 'system');
    const recentMessages = conversation.messages
      .filter((m) => m.role !== 'system')
      .slice(-this.config.maxConversationLength);

    conversation.messages = [...systemMessages, ...recentMessages];
    this.emit('context:pruned', { conversationId: conversation.id });
  }

  /**
   * Build prompt from conversation history
   */
  private buildPrompt(conversation: Conversation, systemPrompt?: string): string {
    const messages: string[] = [];

    if (systemPrompt) {
      messages.push(`System: ${systemPrompt}`);
    }

    for (const message of conversation.messages) {
      if (message.role === 'system') {
        messages.push(`System: ${message.content}`);
      } else if (message.role === 'user') {
        messages.push(`User: ${message.content}`);
      } else if (message.role === 'assistant') {
        messages.push(`Assistant: ${message.content}`);
      }
    }

    return messages.join('\n\n');
  }

  /**
   * Build action plan prompt
   */
  private buildActionPlanPrompt(proposal: ActionProposal): string {
    return `Create a detailed action plan for the following proposal:

Operation: ${proposal.operation}
Intent: ${proposal.intent}
Target: ${JSON.stringify(proposal.target_entity)}
Risk Level: ${proposal.risk_level}
Reversibility: ${proposal.reversibility}

The action plan should include:
1. Prerequisites to check before execution
2. Step-by-step execution steps (ordered)
3. Expected outcomes after successful execution
4. Validation checks to verify success

Format as JSON with the following structure:
{
  "prerequisites": ["prerequisite 1", "prerequisite 2", ...],
  "steps": [
    {
      "order": 1,
      "action": "action name",
      "description": "detailed description",
      "estimatedDurationMs": 1000
    }
  ],
  "expectedOutcomes": ["outcome 1", "outcome 2", ...],
  "validationChecks": ["check 1", "check 2", ...]
}`;
  }

  /**
   * Build rollback plan prompt
   */
  private buildRollbackPlanPrompt(actionData: ExecutedActionData): string {
    return `Create a rollback plan for the following executed action:

Operation: ${actionData.operation}
Executed At: ${actionData.executedAt}
Success: ${actionData.result.success}
Result: ${JSON.stringify(actionData.result.output || {})}
${actionData.result.error ? `Error: ${actionData.result.error}` : ''}

${actionData.proposal ? `Original Intent: ${actionData.proposal.intent}` : ''}
${actionData.proposal ? `Reversibility: ${actionData.proposal.reversibility}` : ''}

The rollback plan should include:
1. Rollback type (FULL, PARTIAL, COMPENSATABLE, or IRREVERSIBLE)
2. Method description (how to perform the rollback)
3. Step-by-step rollback steps (ordered)
4. Estimated success rate (0.0-1.0)
5. Warnings (if any)
6. Conditions required for rollback (if any)

Format as JSON with the following structure:
{
  "type": "FULL | PARTIAL | COMPENSATABLE | IRREVERSIBLE",
  "method": "description of rollback method",
  "steps": [
    {
      "order": 1,
      "description": "rollback step description",
      "operation": "module:action",
      "estimatedDurationMs": 500
    }
  ],
  "estimatedSuccessRate": 0.95,
  "warnings": ["warning 1", ...],
  "conditions": ["condition 1", ...]
}`;
  }

  /**
   * Parse action plan from AI response
   */
  private parseActionPlan(content: string, proposal: ActionProposal): ActionPlan {
    try {
      const parsed = JSON.parse(content);

      const steps: ActionStep[] = (parsed.steps || []).map((s: any, index: number) => ({
        order: s.order || index + 1,
        action: s.action || `Step ${index + 1}`,
        description: s.description || '',
        estimatedDurationMs: s.estimatedDurationMs,
        requiredTools: s.requiredTools,
      }));

      return {
        id: uuid(crypto.randomUUID()),
        proposalId: proposal.id,
        steps,
        prerequisites: parsed.prerequisites || [],
        expectedOutcomes: parsed.expectedOutcomes || [],
        validationChecks: parsed.validationChecks || [],
        estimatedDurationMs: steps.reduce((sum, s) => sum + (s.estimatedDurationMs || 0), 0),
        createdAt: iso8601(new Date().toISOString()),
      };
    } catch (error) {
      // Fallback to simple plan if JSON parsing fails
      throw new ParsingError(
        'Failed to parse action plan JSON',
        content,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Parse rollback plan from AI response
   */
  private parseRollbackPlan(
    content: string,
    _actionData: ExecutedActionData
  ): RollbackPlanWithMetadata {
    try {
      const parsed = JSON.parse(content);

      const steps = (parsed.steps || []).map((s: any, index: number) => ({
        order: s.order || index + 1,
        description: s.description || `Rollback step ${index + 1}`,
        operation: s.operation || 'unknown:rollback',
        estimatedDurationMs: s.estimatedDurationMs,
      }));

      return {
        type: parsed.type || 'PARTIAL',
        method: parsed.method || 'Manual rollback required',
        steps,
        estimatedSuccessRate: parsed.estimatedSuccessRate || 0.5,
        warnings: parsed.warnings || [],
        conditions: parsed.conditions || [],
      };
    } catch (error) {
      // Fallback to conservative plan if JSON parsing fails
      throw new ParsingError(
        'Failed to parse rollback plan JSON',
        content,
        error instanceof Error ? error : undefined
      );
    }
  }
}

/**
 * Singleton instance of Expert AI Service
 */
let expertAiServiceInstance: ExpertAIService | null = null;

/**
 * Get singleton instance of Expert AI Service
 * @param registry - AI provider registry
 * @param config - Optional configuration
 * @returns Expert AI Service instance
 */
export function getExpertAiService(
  registry: AIProviderRegistry,
  config?: Partial<ExpertAIConfig>
): ExpertAIService {
  if (!expertAiServiceInstance) {
    expertAiServiceInstance = new ExpertAIService(registry, config);
  }
  return expertAiServiceInstance;
}

/**
 * Reset singleton instance (for testing)
 */
export function resetExpertAiService(): void {
  if (expertAiServiceInstance) {
    expertAiServiceInstance.removeAllListeners();
    expertAiServiceInstance.clearAllConversations();
  }
  expertAiServiceInstance = null;
}
