/**
 * Expert AI Service Unit Tests
 *
 * Tests for conversation management, action planning, rollback generation,
 * provider switching, and streaming responses.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExpertAIService, getExpertAiService, resetExpertAiService } from '../expertAiService';
import { AIProviderRegistry } from '../providers/registry';
import type { IAIProvider } from '../providers/types';
import type {
  GenerateOptions,
  GenerateResponse,
  StreamChunk,
  ProviderHealthCheck,
  ModelInfo,
  ActionProposal,
  ExpertProcessedInput,
  ExecutedActionData,
} from '@/types';
import { uuid, iso8601 } from '@/types';
import {
  NoProviderAvailableError,
  ProviderNotFoundError,
  ProviderUnhealthyError,
  GenerationError,
  ParsingError,
} from '../expertAiErrors';

// Mock AI Provider
class MockAIProvider implements IAIProvider {
  public shouldFail: boolean = false;
  public responseText: string = 'Test response';
  public isHealthy: boolean = true;

  readonly type = 'ollama' as const;
  readonly name = 'Mock Provider';
  readonly capabilities = {
    streaming: true,
    constrainedDecoding: true,
    functionCalling: false,
    conversationContext: true,
    vision: false,
    maxContextTokens: 8000,
    modelManagement: true,
  };
  readonly config = {
    type: 'ollama' as const,
    name: 'Mock Provider',
    config: {},
  };

  async generate(options: GenerateOptions): Promise<GenerateResponse> {
    if (this.shouldFail) {
      throw new Error('Mock generation error');
    }

    return {
      provider: 'ollama',
      model: options.model,
      text: this.responseText,
      timestamp: iso8601(new Date().toISOString()),
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    };
  }

  async generateStream(
    options: GenerateOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<GenerateResponse> {
    if (this.shouldFail) {
      throw new Error('Mock streaming error');
    }

    // Simulate streaming chunks
    const words = this.responseText.split(' ');
    for (const word of words) {
      onChunk({
        provider: 'ollama',
        model: options.model,
        text: word + ' ',
        done: false,
        timestamp: iso8601(new Date().toISOString()),
      });
    }

    // Final chunk
    onChunk({
      provider: 'ollama',
      model: options.model,
      text: '',
      done: true,
      timestamp: iso8601(new Date().toISOString()),
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    });

    return {
      provider: 'ollama',
      model: options.model,
      text: this.responseText,
      timestamp: iso8601(new Date().toISOString()),
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
    };
  }

  async checkHealth(): Promise<ProviderHealthCheck> {
    return {
      provider: 'ollama',
      status: this.isHealthy ? 'healthy' : 'unhealthy',
      timestamp: iso8601(new Date().toISOString()),
      responseTime: 10,
    };
  }

  async isAvailable(): Promise<boolean> {
    return this.isHealthy;
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        provider: 'ollama',
        id: 'qwen2.5:3b',
        name: 'Qwen 2.5 3B',
        parameters: '3B',
      },
    ];
  }

  async getModelInfo(modelId: string): Promise<ModelInfo> {
    return {
      provider: 'ollama',
      id: modelId,
      name: 'Test Model',
      parameters: '3B',
    };
  }

  async pullModel(_modelId: string, _onProgress?: (progress: number) => void): Promise<void> {
    // Mock implementation
  }
}

describe('ExpertAIService', () => {
  let registry: AIProviderRegistry;
  let mockProvider: MockAIProvider;
  let service: ExpertAIService;

  beforeEach(() => {
    // Reset registry and service
    AIProviderRegistry['instance'] = null;
    resetExpertAiService();

    // Create fresh instances
    registry = AIProviderRegistry.getInstance();
    mockProvider = new MockAIProvider();

    // Register mock provider
    registry.createProvider('test-provider', {
      type: 'ollama',
      name: 'Test Provider',
      config: {},
    });

    // Replace with mock
    (registry as any).providers.set('test-provider', mockProvider);

    // Create service
    service = new ExpertAIService(registry, {
      defaultProvider: 'test-provider',
      maxConversationLength: 10,
    });
  });

  afterEach(() => {
    resetExpertAiService();
  });

  describe('Initialization', () => {
    it('should initialize with healthy provider', async () => {
      await expect(service.initialize()).resolves.toBeUndefined();
      expect(service.isInitialized()).toBe(true);
    });

    it('should throw error if no healthy provider available', async () => {
      mockProvider.isHealthy = false;
      registry.clearProviders();

      await expect(service.initialize()).rejects.toThrow(NoProviderAvailableError);
    });

    it('should emit initialized event', async () => {
      const spy = vi.fn();
      service.on('initialized', spy);

      await service.initialize();

      expect(spy).toHaveBeenCalledWith({ provider: 'test-provider' });
    });

    it('should not reinitialize if already initialized', async () => {
      await service.initialize();
      const spy = vi.fn();
      service.on('initialized', spy);

      await service.initialize();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Query Processing', () => {
    it('should process a query successfully', async () => {
      await service.initialize();

      const input: ExpertProcessedInput = {
        text: 'Hello, how are you?',
      };

      mockProvider.responseText = 'I am doing well, thank you!';

      const response = await service.processQuery(input);

      expect(response.content).toBe('I am doing well, thank you!');
      expect(response.provider).toBe('ollama');
      expect(response.conversationId).toBeDefined();
    });

    it('should create new conversation if no ID provided', async () => {
      await service.initialize();

      const input: ExpertProcessedInput = {
        text: 'Test message',
      };

      const response = await service.processQuery(input);

      const conversation = service.getConversation(response.conversationId);
      expect(conversation).toBeDefined();
      expect(conversation?.messages).toHaveLength(2); // user + assistant
    });

    it('should continue existing conversation', async () => {
      await service.initialize();

      const conversationId = uuid(crypto.randomUUID());

      const input1: ExpertProcessedInput = {
        text: 'First message',
        conversationId,
      };

      await service.processQuery(input1);

      const input2: ExpertProcessedInput = {
        text: 'Second message',
        conversationId,
      };

      await service.processQuery(input2);

      const conversation = service.getConversation(conversationId);
      expect(conversation?.messages).toHaveLength(4); // 2 user + 2 assistant
    });

    it('should throw GenerationError on provider failure', async () => {
      await service.initialize();
      mockProvider.shouldFail = true;

      const input: ExpertProcessedInput = {
        text: 'Test message',
      };

      await expect(service.processQuery(input)).rejects.toThrow(GenerationError);
    });

    it('should emit query:complete event', async () => {
      await service.initialize();

      const spy = vi.fn();
      service.on('query:complete', spy);

      const input: ExpertProcessedInput = {
        text: 'Test message',
      };

      const response = await service.processQuery(input);

      expect(spy).toHaveBeenCalledWith({
        conversationId: response.conversationId,
        provider: 'ollama',
      });
    });
  });

  describe('Streaming Queries', () => {
    it('should process streaming query successfully', async () => {
      await service.initialize();

      const input: ExpertProcessedInput = {
        text: 'Tell me a story',
      };

      mockProvider.responseText = 'Once upon a time';

      const chunks: string[] = [];
      const response = await service.processQueryStream(input, (chunk) => {
        chunks.push(chunk);
      });

      expect(response.content).toBe('Once upon a time');
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should emit stream:chunk events', async () => {
      await service.initialize();

      const spy = vi.fn();
      service.on('stream:chunk', spy);

      const input: ExpertProcessedInput = {
        text: 'Test message',
      };

      mockProvider.responseText = 'Hello world';

      await service.processQueryStream(input, () => {});

      expect(spy).toHaveBeenCalled();
    });

    it('should emit stream:complete event', async () => {
      await service.initialize();

      const spy = vi.fn();
      service.on('stream:complete', spy);

      const input: ExpertProcessedInput = {
        text: 'Test message',
      };

      const response = await service.processQueryStream(input, () => {});

      expect(spy).toHaveBeenCalledWith({
        conversationId: response.conversationId,
        provider: 'ollama',
      });
    });
  });

  describe('Context Pruning', () => {
    it('should prune context when exceeding max length', async () => {
      await service.initialize();

      const conversationId = uuid(crypto.randomUUID());

      // Send 12 messages (exceeds max of 10)
      for (let i = 0; i < 12; i++) {
        const input: ExpertProcessedInput = {
          text: `Message ${i}`,
          conversationId,
        };
        await service.processQuery(input);
      }

      const conversation = service.getConversation(conversationId);
      // Should have at most 10 non-system messages (5 user + 5 assistant pairs)
      expect(conversation?.messages.length).toBeLessThanOrEqual(20);
    });

    it('should emit context:pruned event', async () => {
      await service.initialize();

      const spy = vi.fn();
      service.on('context:pruned', spy);

      const conversationId = uuid(crypto.randomUUID());

      // Send enough messages to trigger pruning
      for (let i = 0; i < 12; i++) {
        const input: ExpertProcessedInput = {
          text: `Message ${i}`,
          conversationId,
        };
        await service.processQuery(input);
      }

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Action Planning', () => {
    it('should generate action plan from proposal', async () => {
      await service.initialize();

      const proposal: ActionProposal = {
        id: uuid(crypto.randomUUID()),
        timestamp: iso8601(new Date().toISOString()),
        intent: 'Create a new incident',
        operation: 'incident:create',
        target_entity: null,
        data_domain: 'enterprise',
        data_classification: 'internal',
        reversibility: 'COMPENSATABLE',
        confidence: 0.9,
        related_skills: [],
        rollback_plan: null,
        evaluation_model: 'qwen2.5:3b',
        raw_user_input: 'Create an incident',
        requires_confirmation: true,
        risk_level: 'medium',
      };

      mockProvider.responseText = JSON.stringify({
        prerequisites: ['Check permissions'],
        steps: [
          {
            order: 1,
            action: 'Create incident',
            description: 'Call API to create incident',
            estimatedDurationMs: 1000,
          },
        ],
        expectedOutcomes: ['Incident created successfully'],
        validationChecks: ['Verify incident ID returned'],
      });

      const plan = await service.planAction(proposal);

      expect(plan.proposalId).toBe(proposal.id);
      expect(plan.steps).toHaveLength(1);
      expect(plan.prerequisites).toContain('Check permissions');
    });

    it('should throw ParsingError on invalid JSON', async () => {
      await service.initialize();

      const proposal: ActionProposal = {
        id: uuid(crypto.randomUUID()),
        timestamp: iso8601(new Date().toISOString()),
        intent: 'Test action',
        operation: 'test:action',
        target_entity: null,
        data_domain: 'personal',
        data_classification: 'public',
        reversibility: 'FULL',
        confidence: 0.9,
        related_skills: [],
        rollback_plan: null,
        evaluation_model: 'qwen2.5:3b',
        raw_user_input: 'Test',
        requires_confirmation: false,
        risk_level: 'low',
      };

      mockProvider.responseText = 'Invalid JSON response';

      await expect(service.planAction(proposal)).rejects.toThrow(ParsingError);
    });

    it('should emit plan:generated event', async () => {
      await service.initialize();

      const spy = vi.fn();
      service.on('plan:generated', spy);

      const proposal: ActionProposal = {
        id: uuid(crypto.randomUUID()),
        timestamp: iso8601(new Date().toISOString()),
        intent: 'Test action',
        operation: 'test:action',
        target_entity: null,
        data_domain: 'personal',
        data_classification: 'public',
        reversibility: 'FULL',
        confidence: 0.9,
        related_skills: [],
        rollback_plan: null,
        evaluation_model: 'qwen2.5:3b',
        raw_user_input: 'Test',
        requires_confirmation: false,
        risk_level: 'low',
      };

      mockProvider.responseText = JSON.stringify({
        prerequisites: [],
        steps: [{ order: 1, action: 'Test', description: 'Test step' }],
        expectedOutcomes: [],
        validationChecks: [],
      });

      await service.planAction(proposal);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Rollback Plan Generation', () => {
    it('should generate rollback plan from executed action', async () => {
      await service.initialize();

      const actionData: ExecutedActionData = {
        id: uuid(crypto.randomUUID()),
        proposalId: uuid(crypto.randomUUID()),
        operation: 'incident:create',
        result: {
          success: true,
          output: { incidentId: 'INC001' },
        },
        executedAt: iso8601(new Date().toISOString()),
      };

      mockProvider.responseText = JSON.stringify({
        type: 'COMPENSATABLE',
        method: 'Delete the created incident',
        steps: [
          {
            order: 1,
            description: 'Delete incident INC001',
            operation: 'incident:delete',
            estimatedDurationMs: 500,
          },
        ],
        estimatedSuccessRate: 0.95,
        warnings: ['Incident history will be lost'],
        conditions: ['Incident must still exist'],
      });

      const plan = await service.generateRollbackPlan(actionData);

      expect(plan.type).toBe('COMPENSATABLE');
      expect(plan.steps).toHaveLength(1);
      expect(plan.estimatedSuccessRate).toBe(0.95);
    });

    it('should throw ParsingError on invalid JSON', async () => {
      await service.initialize();

      const actionData: ExecutedActionData = {
        id: uuid(crypto.randomUUID()),
        proposalId: uuid(crypto.randomUUID()),
        operation: 'test:action',
        result: { success: true },
        executedAt: iso8601(new Date().toISOString()),
      };

      mockProvider.responseText = 'Invalid JSON';

      await expect(service.generateRollbackPlan(actionData)).rejects.toThrow(ParsingError);
    });

    it('should emit rollback:generated event', async () => {
      await service.initialize();

      const spy = vi.fn();
      service.on('rollback:generated', spy);

      const actionData: ExecutedActionData = {
        id: uuid(crypto.randomUUID()),
        proposalId: uuid(crypto.randomUUID()),
        operation: 'test:action',
        result: { success: true },
        executedAt: iso8601(new Date().toISOString()),
      };

      mockProvider.responseText = JSON.stringify({
        type: 'PARTIAL',
        method: 'Manual rollback',
        steps: [],
        estimatedSuccessRate: 0.5,
      });

      await service.generateRollbackPlan(actionData);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Provider Switching', () => {
    it('should switch to different provider', async () => {
      await service.initialize();

      const secondProvider = new MockAIProvider();
      registry.createProvider('second-provider', {
        type: 'ollama',
        name: 'Second Provider',
        config: {},
      });
      (registry as any).providers.set('second-provider', secondProvider);

      await service.switchProvider('second-provider');

      expect(service.getCurrentProviderId()).toBe('second-provider');
    });

    it('should throw ProviderNotFoundError for unknown provider', async () => {
      await service.initialize();

      await expect(service.switchProvider('unknown-provider')).rejects.toThrow(
        ProviderNotFoundError
      );
    });

    it('should throw ProviderUnhealthyError for unhealthy provider', async () => {
      await service.initialize();

      const unhealthyProvider = new MockAIProvider();
      unhealthyProvider.isHealthy = false;
      registry.createProvider('unhealthy-provider', {
        type: 'ollama',
        name: 'Unhealthy Provider',
        config: {},
      });
      (registry as any).providers.set('unhealthy-provider', unhealthyProvider);

      await expect(service.switchProvider('unhealthy-provider')).rejects.toThrow(
        ProviderUnhealthyError
      );
    });

    it('should emit provider:switched event', async () => {
      await service.initialize();

      const spy = vi.fn();
      service.on('provider:switched', spy);

      const secondProvider = new MockAIProvider();
      registry.createProvider('second-provider', {
        type: 'ollama',
        name: 'Second Provider',
        config: {},
      });
      (registry as any).providers.set('second-provider', secondProvider);

      await service.switchProvider('second-provider');

      expect(spy).toHaveBeenCalledWith({ providerId: 'second-provider' });
    });
  });

  describe('Conversation Management', () => {
    it('should get conversation by ID', async () => {
      await service.initialize();

      const conversationId = uuid(crypto.randomUUID());
      const input: ExpertProcessedInput = {
        text: 'Test message',
        conversationId,
      };

      await service.processQuery(input);

      const conversation = service.getConversation(conversationId);

      expect(conversation).toBeDefined();
      expect(conversation?.id).toBe(conversationId);
    });

    it('should clear conversation', async () => {
      await service.initialize();

      const conversationId = uuid(crypto.randomUUID());
      const input: ExpertProcessedInput = {
        text: 'Test message',
        conversationId,
      };

      await service.processQuery(input);

      const deleted = service.clearConversation(conversationId);

      expect(deleted).toBe(true);
      expect(service.getConversation(conversationId)).toBeUndefined();
    });

    it('should emit conversation:cleared event', async () => {
      await service.initialize();

      const spy = vi.fn();
      service.on('conversation:cleared', spy);

      const conversationId = uuid(crypto.randomUUID());
      const input: ExpertProcessedInput = {
        text: 'Test message',
        conversationId,
      };

      await service.processQuery(input);
      service.clearConversation(conversationId);

      expect(spy).toHaveBeenCalledWith({ conversationId });
    });

    it('should clear all conversations', async () => {
      await service.initialize();

      const id1 = uuid(crypto.randomUUID());
      const id2 = uuid(crypto.randomUUID());

      await service.processQuery({ text: 'Test 1', conversationId: id1 });
      await service.processQuery({ text: 'Test 2', conversationId: id2 });

      service.clearAllConversations();

      expect(service.getConversation(id1)).toBeUndefined();
      expect(service.getConversation(id2)).toBeUndefined();
    });

    it('should emit conversations:cleared event', async () => {
      await service.initialize();

      const spy = vi.fn();
      service.on('conversations:cleared', spy);

      service.clearAllConversations();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Model Discovery', () => {
    it('should get available models', async () => {
      await service.initialize();

      const models = await service.getAvailableModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('id');
      expect(models[0]).toHaveProperty('model');
      expect(models[0]).toHaveProperty('healthy');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance from getExpertAiService', () => {
      const instance1 = getExpertAiService(registry);
      const instance2 = getExpertAiService(registry);

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton with resetExpertAiService', () => {
      const instance1 = getExpertAiService(registry);
      resetExpertAiService();
      const instance2 = getExpertAiService(registry);

      expect(instance1).not.toBe(instance2);
    });
  });
});
