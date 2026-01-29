/**
 * AI Provider Tests
 *
 * Unit tests for AI provider abstraction layer.
 * Tests registry, Ollama provider implementation, and error mapping.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AIProviderConfig } from '@/types';
import {
  AIProviderRegistry,
  getProviderRegistry,
  resetProviderRegistry,
  createDefaultOllamaProvider,
  OllamaProvider,
  createOllamaProvider,
  OLLAMA_CAPABILITIES,
  ProviderConfigurationError,
  ProviderConnectionError,
  ProviderTimeoutError,
  ProviderModelNotFoundError,
} from '../providers';
import {
  OllamaConnectionError,
  OllamaTimeoutError,
  OllamaModelNotFoundError,
} from '../ollamaErrors';

// Mock OllamaClient
vi.mock('../ollamaClient', () => {
  const EventEmitter = require('events');

  class MockOllamaClient extends EventEmitter {
    constructor() {
      super();
    }

    async generate(): Promise<string> {
      return 'Generated text';
    }

    async generateStream(_request: any, onChunk: (chunk: any) => void): Promise<string> {
      // Simulate streaming
      onChunk({
        model: 'qwen2.5:3b',
        created_at: '2026-01-30T00:00:00Z',
        response: 'Hello',
        done: false,
      });
      onChunk({
        model: 'qwen2.5:3b',
        created_at: '2026-01-30T00:00:01Z',
        response: ' World',
        done: true,
        context: [1, 2, 3],
        total_duration: 1000000,
        prompt_eval_count: 10,
        eval_count: 5,
      });
      return 'Hello World';
    }

    async checkHealth() {
      return { status: 'ok' as const };
    }

    async listModels() {
      return {
        models: [
          {
            name: 'qwen2.5:3b',
            modified_at: '2026-01-30T00:00:00Z',
            size: 1000000,
            digest: 'abc123',
            details: {
              format: 'gguf',
              family: 'qwen',
              parameter_size: '3B',
              quantization_level: 'Q4_0',
            },
          },
        ],
      };
    }

    async getModelInfo(modelName: string) {
      if (modelName === 'not-found') {
        throw new OllamaModelNotFoundError(modelName);
      }
      return {
        name: modelName,
        modified_at: '2026-01-30T00:00:00Z',
        size: 1000000,
        digest: 'abc123',
        details: {
          format: 'gguf',
          family: 'qwen',
          parameter_size: '3B',
          quantization_level: 'Q4_0',
        },
      };
    }

    async pullModel(_modelName: string, onProgress?: (progress: any) => void) {
      if (onProgress) {
        onProgress({ status: 'downloading', total: 100, completed: 50 });
        onProgress({ status: 'complete', total: 100, completed: 100 });
      }
    }
  }

  return {
    OllamaClient: MockOllamaClient,
  };
});

describe('AIProviderRegistry', () => {
  let registry: AIProviderRegistry;

  beforeEach(() => {
    resetProviderRegistry();
    registry = getProviderRegistry();
  });

  afterEach(() => {
    registry.clearProviders();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getProviderRegistry();
      const instance2 = getProviderRegistry();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getProviderRegistry();
      resetProviderRegistry();
      const instance2 = getProviderRegistry();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Provider Type Registration', () => {
    it('should have Ollama provider registered by default', () => {
      expect(registry.isProviderTypeRegistered('ollama')).toBe(true);
    });

    it('should list registered provider types', () => {
      const types = registry.getRegisteredTypes();
      expect(types).toContain('ollama');
    });

    it('should get provider registration details', () => {
      const registration = registry.getRegistration('ollama');
      expect(registration).toBeDefined();
      expect(registration?.type).toBe('ollama');
      expect(registration?.name).toBe('Ollama');
      expect(registration?.factory).toBeDefined();
      expect(registration?.defaultCapabilities).toBeDefined();
    });
  });

  describe('Provider Instance Management', () => {
    const testConfig: AIProviderConfig = {
      type: 'ollama',
      name: 'Test Ollama',
      config: { baseUrl: 'http://localhost:11434' },
      timeout: 120000,
      maxRetries: 3,
      retryDelay: 1000,
    };

    it('should create provider instance', () => {
      const provider = registry.createProvider('test-1', testConfig);
      expect(provider).toBeDefined();
      expect(provider.type).toBe('ollama');
      expect(provider.name).toBe('Test Ollama');
    });

    it('should throw error for unregistered provider type', () => {
      const invalidConfig: AIProviderConfig = {
        type: 'invalid' as any,
        name: 'Invalid',
        config: {},
      };

      expect(() => registry.createProvider('test-invalid', invalidConfig)).toThrow(
        ProviderConfigurationError
      );
    });

    it('should get provider by ID', () => {
      registry.createProvider('test-2', testConfig);
      const provider = registry.getProvider('test-2');
      expect(provider).toBeDefined();
      expect(provider?.type).toBe('ollama');
    });

    it('should check if provider exists', () => {
      expect(registry.hasProvider('test-3')).toBe(false);
      registry.createProvider('test-3', testConfig);
      expect(registry.hasProvider('test-3')).toBe(true);
    });

    it('should remove provider', () => {
      registry.createProvider('test-4', testConfig);
      expect(registry.hasProvider('test-4')).toBe(true);
      const removed = registry.removeProvider('test-4');
      expect(removed).toBe(true);
      expect(registry.hasProvider('test-4')).toBe(false);
    });

    it('should get all providers', () => {
      registry.createProvider('test-5', testConfig);
      registry.createProvider('test-6', testConfig);
      const all = registry.getAllProviders();
      expect(all.length).toBe(2);
      expect(all.map((p) => p.id)).toContain('test-5');
      expect(all.map((p) => p.id)).toContain('test-6');
    });

    it('should clear all providers', () => {
      registry.createProvider('test-7', testConfig);
      registry.createProvider('test-8', testConfig);
      expect(registry.getAllProviders().length).toBe(2);
      registry.clearProviders();
      expect(registry.getAllProviders().length).toBe(0);
    });

    it('should get or create provider', () => {
      const provider1 = registry.getOrCreateProvider('test-9', testConfig);
      const provider2 = registry.getOrCreateProvider('test-9', testConfig);
      expect(provider1).toBe(provider2);
    });
  });

  describe('Helper Functions', () => {
    it('should create default Ollama provider', () => {
      const provider = createDefaultOllamaProvider();
      expect(provider).toBeDefined();
      expect(provider.type).toBe('ollama');
      expect(provider.name).toBe('Ollama');
    });

    it('should create default Ollama provider with custom params', () => {
      const provider = createDefaultOllamaProvider('http://custom:11434', 'Custom Ollama');
      expect(provider.name).toBe('Custom Ollama');
    });
  });
});

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    const config: AIProviderConfig = {
      type: 'ollama',
      name: 'Test Ollama',
      config: { baseUrl: 'http://localhost:11434' },
      timeout: 120000,
      maxRetries: 3,
      retryDelay: 1000,
    };
    provider = createOllamaProvider(config);
  });

  describe('Configuration', () => {
    it('should have correct type and name', () => {
      expect(provider.type).toBe('ollama');
      expect(provider.name).toBe('Test Ollama');
    });

    it('should have capabilities', () => {
      expect(provider.capabilities).toEqual(OLLAMA_CAPABILITIES);
      expect(provider.capabilities.streaming).toBe(true);
      expect(provider.capabilities.constrainedDecoding).toBe(true);
      expect(provider.capabilities.modelManagement).toBe(true);
    });

    it('should throw error for invalid provider type', () => {
      const invalidConfig: AIProviderConfig = {
        type: 'openai' as any,
        name: 'Invalid',
        config: {},
      };

      expect(() => new OllamaProvider(invalidConfig)).toThrow(
        'Invalid provider type for OllamaProvider: openai'
      );
    });
  });

  describe('Text Generation', () => {
    it('should generate text', async () => {
      const response = await provider.generate({
        model: 'qwen2.5:3b',
        prompt: 'Hello',
        temperature: 0.1,
      });

      expect(response.provider).toBe('ollama');
      expect(response.model).toBe('qwen2.5:3b');
      expect(response.text).toBe('Generated text');
      expect(response.timestamp).toBeDefined();
      expect(response.timing?.total).toBeGreaterThan(0);
    });

    it('should generate text with streaming', async () => {
      const chunks: any[] = [];

      const response = await provider.generateStream(
        {
          model: 'qwen2.5:3b',
          prompt: 'Hello',
          temperature: 0.1,
        },
        (chunk) => {
          chunks.push(chunk);
        }
      );

      expect(response.provider).toBe('ollama');
      expect(response.model).toBe('qwen2.5:3b');
      expect(response.text).toBe('Hello World');
      expect(chunks.length).toBe(2);

      // Check first chunk
      expect(chunks[0].text).toBe('Hello');
      expect(chunks[0].done).toBe(false);

      // Check final chunk
      expect(chunks[1].text).toBe(' World');
      expect(chunks[1].done).toBe(true);
      expect(chunks[1].context).toEqual([1, 2, 3]);
      expect(chunks[1].usage).toBeDefined();
      expect(chunks[1].usage?.promptTokens).toBe(10);
      expect(chunks[1].usage?.completionTokens).toBe(5);
      expect(chunks[1].timing).toBeDefined();
    });
  });

  describe('Health Checks', () => {
    it('should check health', async () => {
      const health = await provider.checkHealth();
      expect(health.provider).toBe('ollama');
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(health.availableModels).toBe(1);
    });

    it('should check availability', async () => {
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('Model Management', () => {
    it('should list models', async () => {
      const models = await provider.listModels();
      expect(models).toHaveLength(1);
      expect(models[0].provider).toBe('ollama');
      expect(models[0].id).toBe('qwen2.5:3b');
      expect(models[0].name).toBe('qwen2.5:3b');
      expect(models[0].size).toBe(1000000);
      expect(models[0].parameters).toBe('3B');
      expect(models[0].metadata).toBeDefined();
    });

    it('should get model info', async () => {
      const model = await provider.getModelInfo('qwen2.5:3b');
      expect(model.provider).toBe('ollama');
      expect(model.id).toBe('qwen2.5:3b');
      expect(model.name).toBe('qwen2.5:3b');
    });

    it('should throw error for model not found', async () => {
      await expect(provider.getModelInfo('not-found')).rejects.toThrow(ProviderModelNotFoundError);
    });

    it('should pull model with progress', async () => {
      const progressUpdates: number[] = [];

      await provider.pullModel('qwen2.5:3b', (progress) => {
        progressUpdates.push(progress);
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0]).toBe(50);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });
  });

  describe('Error Mapping', () => {
    it('should map connection errors', async () => {
      // Mock a connection error
      const mockClient = provider['client'] as any;
      mockClient.generate = vi
        .fn()
        .mockRejectedValue(
          new OllamaConnectionError('Connection refused', new Error('ECONNREFUSED'))
        );

      await expect(provider.generate({ model: 'test', prompt: 'test' })).rejects.toThrow(
        ProviderConnectionError
      );
    });

    it('should map timeout errors', async () => {
      const mockClient = provider['client'] as any;
      mockClient.generate = vi
        .fn()
        .mockRejectedValue(new OllamaTimeoutError(30000, new Error('Timeout')));

      await expect(provider.generate({ model: 'test', prompt: 'test' })).rejects.toThrow(
        ProviderTimeoutError
      );
    });

    it('should map model not found errors', async () => {
      const mockClient = provider['client'] as any;
      mockClient.generate = vi
        .fn()
        .mockRejectedValue(new OllamaModelNotFoundError('unknown-model'));

      await expect(provider.generate({ model: 'test', prompt: 'test' })).rejects.toThrow(
        ProviderModelNotFoundError
      );
    });
  });
});
