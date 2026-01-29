/**
 * Unit tests for Evaluation LLM Service
 *
 * Tests proposal generation, validation, retry logic, and business rules.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EvaluationLLMService, type ProposalGenerationInput } from '../evaluationLlmService';
import { OllamaClient } from '../ollamaClient';
import {
  EvaluationError,
  EvaluationModelNotFoundError,
  EvaluationValidationError,
  EvaluationRetryExhaustedError,
} from '../evaluationErrors';

describe('EvaluationLLMService', () => {
  let service: EvaluationLLMService;
  let mockOllama: OllamaClient;

  beforeEach(() => {
    // Create mock Ollama client
    mockOllama = {
      checkHealth: vi.fn().mockResolvedValue(true),
      listModels: vi
        .fn()
        .mockResolvedValue([
          { name: 'qwen2.5:3b', size: 1024, modified_at: '2026-01-28T00:00:00Z' },
        ]),
      generate: vi.fn(),
      generateStream: vi.fn(),
      getModelInfo: vi.fn(),
      pullModel: vi.fn(),
      getConfig: vi.fn(),
      updateConfig: vi.fn(),
    } as any;

    service = new EvaluationLLMService(mockOllama, {
      model: 'qwen2.5:3b',
      temperature: 0.1,
      maxRetries: 3,
      timeoutMs: 30000,
    });
  });

  describe('initialization', () => {
    it('should initialize successfully when model is available', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
      expect(mockOllama.checkHealth).toHaveBeenCalled();
      expect(mockOllama.listModels).toHaveBeenCalled();
    });

    it('should throw EvaluationError when Ollama is not healthy', async () => {
      vi.mocked(mockOllama.checkHealth).mockResolvedValue(false);

      await expect(service.initialize()).rejects.toThrow(EvaluationError);
      await expect(service.initialize()).rejects.toThrow('Ollama service not available');
    });

    it('should throw EvaluationModelNotFoundError when model not found', async () => {
      vi.mocked(mockOllama.listModels).mockResolvedValue([
        { name: 'llama3.2:latest', size: 2048, modified_at: '2026-01-28T00:00:00Z' },
      ]);

      await expect(service.initialize()).rejects.toThrow(EvaluationModelNotFoundError);
    });
  });

  describe('generateProposal', () => {
    const validInput: ProposalGenerationInput = {
      id: 'test-1',
      text: 'Create a high-priority ticket for server downtime',
      source: 'text',
      timestamp: '2026-01-30T10:00:00Z',
      metadata: {
        char_length: 47,
        word_count: 7,
      },
    };

    const validProposalJSON = JSON.stringify({
      intent: 'Create a high-priority ticket for server downtime',
      operation: 'incident:create',
      target_entity: null,
      data_domain: 'enterprise',
      data_classification: 'internal',
      reversibility: 'FULL',
      confidence: 0.95,
      requires_confirmation: true,
      risk_level: 'medium',
    });

    it('should generate a valid proposal on first attempt', async () => {
      vi.mocked(mockOllama.generate).mockResolvedValue(validProposalJSON);

      const proposal = await service.generateProposal(validInput);

      expect(proposal).toBeDefined();
      expect(proposal.intent).toBe('Create a high-priority ticket for server downtime');
      expect(proposal.operation).toBe('incident:create');
      expect(proposal.data_domain).toBe('enterprise');
      expect(proposal.confidence).toBe(0.95);
      expect(proposal.requires_confirmation).toBe(true);
      expect(proposal.risk_level).toBe('medium');

      // Check auto-generated fields
      expect(proposal.id).toBeDefined();
      expect(proposal.timestamp).toBeDefined();
      expect(proposal.evaluation_model).toBe('qwen2.5:3b');
      expect(proposal.raw_user_input).toBe(validInput.text);
      expect(proposal.related_skills).toEqual([]);
      expect(proposal.rollback_plan).toBeNull();
    });

    it('should handle delete operations with high risk', async () => {
      const deleteProposalJSON = JSON.stringify({
        intent: 'Delete all meeting notes from last week',
        operation: 'note:delete',
        target_entity: { type: 'note', id: 'unknown', source: 'local' },
        data_domain: 'personal',
        data_classification: 'internal',
        reversibility: 'IRREVERSIBLE',
        confidence: 0.85,
        requires_confirmation: true,
        risk_level: 'high',
      });

      vi.mocked(mockOllama.generate).mockResolvedValue(deleteProposalJSON);

      const input: ProposalGenerationInput = {
        id: 'test-2',
        text: 'Delete all meeting notes from last week',
        source: 'text',
        timestamp: '2026-01-30T10:00:00Z',
      };

      const proposal = await service.generateProposal(input);

      expect(proposal.operation).toBe('note:delete');
      expect(proposal.risk_level).toBe('high');
      expect(proposal.requires_confirmation).toBe(true);
      expect(proposal.reversibility).toBe('IRREVERSIBLE');
    });

    it('should handle read operations with low risk', async () => {
      const readProposalJSON = JSON.stringify({
        intent: 'View recent incidents',
        operation: 'incident:read',
        target_entity: null,
        data_domain: 'enterprise',
        data_classification: 'internal',
        reversibility: 'FULL',
        confidence: 0.95,
        requires_confirmation: false,
        risk_level: 'low',
      });

      vi.mocked(mockOllama.generate).mockResolvedValue(readProposalJSON);

      const input: ProposalGenerationInput = {
        id: 'test-3',
        text: 'Show me recent incidents',
        source: 'text',
        timestamp: '2026-01-30T10:00:00Z',
      };

      const proposal = await service.generateProposal(input);

      expect(proposal.operation).toBe('incident:read');
      expect(proposal.risk_level).toBe('low');
      expect(proposal.requires_confirmation).toBe(false);
      expect(proposal.reversibility).toBe('FULL');
    });

    it('should retry on invalid JSON', async () => {
      vi.mocked(mockOllama.generate)
        .mockRejectedValueOnce(new Error('Invalid JSON'))
        .mockResolvedValueOnce(validProposalJSON);

      const proposal = await service.generateProposal(validInput);

      expect(proposal).toBeDefined();
      expect(mockOllama.generate).toHaveBeenCalledTimes(2);
    });

    it('should throw EvaluationRetryExhaustedError after max retries', async () => {
      vi.mocked(mockOllama.generate).mockRejectedValue(new Error('Invalid JSON'));

      await expect(service.generateProposal(validInput)).rejects.toThrow(
        EvaluationRetryExhaustedError
      );
      expect(mockOllama.generate).toHaveBeenCalledTimes(3);
    });

    it('should throw EvaluationValidationError on malformed JSON', async () => {
      vi.mocked(mockOllama.generate).mockResolvedValue('{ invalid json');

      await expect(service.generateProposal(validInput)).rejects.toThrow(EvaluationValidationError);
    });

    it('should throw EvaluationValidationError on schema violation', async () => {
      const invalidProposalJSON = JSON.stringify({
        intent: 'Test',
        // Missing required fields
      });

      vi.mocked(mockOllama.generate).mockResolvedValue(invalidProposalJSON);

      await expect(service.generateProposal(validInput)).rejects.toThrow(EvaluationValidationError);
    });

    it('should apply business rule corrections for high-risk operations', async () => {
      // LLM generates delete operation with medium risk (should be corrected to high)
      const incorrectProposalJSON = JSON.stringify({
        intent: 'Delete user account',
        operation: 'user:delete',
        target_entity: null,
        data_domain: 'enterprise',
        data_classification: 'confidential',
        reversibility: 'PARTIAL', // Should be corrected to IRREVERSIBLE
        confidence: 0.9,
        requires_confirmation: false, // Should be corrected to true
        risk_level: 'medium', // Should be corrected to high
      });

      vi.mocked(mockOllama.generate).mockResolvedValue(incorrectProposalJSON);

      const input: ProposalGenerationInput = {
        id: 'test-4',
        text: 'Delete user account',
        source: 'text',
        timestamp: '2026-01-30T10:00:00Z',
      };

      const proposal = await service.generateProposal(input);

      // Business rules should correct these
      expect(proposal.risk_level).toBe('high');
      expect(proposal.requires_confirmation).toBe(true);
      expect(proposal.reversibility).toBe('IRREVERSIBLE');
    });

    it('should apply business rule corrections for read operations', async () => {
      // LLM generates read operation with high risk (should be corrected to low)
      const incorrectProposalJSON = JSON.stringify({
        intent: 'View calendar events',
        operation: 'calendar:read',
        target_entity: null,
        data_domain: 'personal',
        data_classification: 'public',
        reversibility: 'PARTIAL', // Should be corrected to FULL
        confidence: 0.9,
        requires_confirmation: true, // Should be corrected to false
        risk_level: 'high', // Should be corrected to low
      });

      vi.mocked(mockOllama.generate).mockResolvedValue(incorrectProposalJSON);

      const input: ProposalGenerationInput = {
        id: 'test-5',
        text: 'Show my calendar',
        source: 'text',
        timestamp: '2026-01-30T10:00:00Z',
      };

      const proposal = await service.generateProposal(input);

      // Business rules should correct these
      expect(proposal.risk_level).toBe('low');
      expect(proposal.requires_confirmation).toBe(false);
      expect(proposal.reversibility).toBe('FULL');
    });

    it('should handle voice input with metadata', async () => {
      vi.mocked(mockOllama.generate).mockResolvedValue(validProposalJSON);

      const voiceInput: ProposalGenerationInput = {
        id: 'test-6',
        text: 'Create a high-priority ticket for server downtime',
        source: 'voice',
        timestamp: '2026-01-30T10:00:00Z',
        metadata: {
          char_length: 47,
          word_count: 7,
          duration_ms: 3500,
          confidence: 0.92,
        },
      };

      const proposal = await service.generateProposal(voiceInput);

      expect(proposal).toBeDefined();
      expect(proposal.raw_user_input).toBe(voiceInput.text);
    });

    it('should include conversation context in prompt', async () => {
      vi.mocked(mockOllama.generate).mockResolvedValue(validProposalJSON);

      const inputWithContext: ProposalGenerationInput = {
        id: 'test-7',
        text: 'Do that for the server',
        source: 'text',
        timestamp: '2026-01-30T10:00:00Z',
        context: {
          conversation_history: [
            { role: 'user', content: 'What should I do about the downtime?' },
            { role: 'assistant', content: 'You should create a high-priority incident ticket' },
          ],
        },
      };

      await service.generateProposal(inputWithContext);

      expect(mockOllama.generate).toHaveBeenCalled();
      const callArgs = vi.mocked(mockOllama.generate).mock.calls[0][0];
      expect(callArgs.prompt).toContain('Recent conversation:');
      expect(callArgs.prompt).toContain('user: What should I do about the downtime?');
    });
  });

  describe('business rule validation', () => {
    it('should reject confidence out of range', async () => {
      const invalidProposalJSON = JSON.stringify({
        intent: 'Test operation',
        operation: 'test:create',
        target_entity: null,
        data_domain: 'personal',
        data_classification: 'public',
        reversibility: 'FULL',
        confidence: 1.5, // Invalid: > 1.0
        requires_confirmation: false,
        risk_level: 'low',
      });

      vi.mocked(mockOllama.generate).mockResolvedValue(invalidProposalJSON);

      const input: ProposalGenerationInput = {
        id: 'test-8',
        text: 'Test',
        source: 'text',
        timestamp: '2026-01-30T10:00:00Z',
      };

      await expect(service.generateProposal(input)).rejects.toThrow(EvaluationValidationError);
      await expect(service.generateProposal(input)).rejects.toThrow('Confidence');
    });

    it('should reject invalid operation format', async () => {
      const invalidProposalJSON = JSON.stringify({
        intent: 'Test operation',
        operation: 'InvalidFormat', // Should be module:action
        target_entity: null,
        data_domain: 'personal',
        data_classification: 'public',
        reversibility: 'FULL',
        confidence: 0.9,
        requires_confirmation: false,
        risk_level: 'low',
      });

      vi.mocked(mockOllama.generate).mockResolvedValue(invalidProposalJSON);

      const input: ProposalGenerationInput = {
        id: 'test-9',
        text: 'Test',
        source: 'text',
        timestamp: '2026-01-30T10:00:00Z',
      };

      await expect(service.generateProposal(input)).rejects.toThrow(EvaluationValidationError);
      await expect(service.generateProposal(input)).rejects.toThrow('Operation');
    });

    it('should reject intent that is too short', async () => {
      const invalidProposalJSON = JSON.stringify({
        intent: 'Go', // Too short (< 5 chars)
        operation: 'test:create',
        target_entity: null,
        data_domain: 'personal',
        data_classification: 'public',
        reversibility: 'FULL',
        confidence: 0.9,
        requires_confirmation: false,
        risk_level: 'low',
      });

      vi.mocked(mockOllama.generate).mockResolvedValue(invalidProposalJSON);

      const input: ProposalGenerationInput = {
        id: 'test-10',
        text: 'Test',
        source: 'text',
        timestamp: '2026-01-30T10:00:00Z',
      };

      await expect(service.generateProposal(input)).rejects.toThrow(EvaluationValidationError);
      await expect(service.generateProposal(input)).rejects.toThrow('Intent');
    });
  });

  describe('service methods', () => {
    it('should check availability', async () => {
      const available = await service.isAvailable();

      expect(available).toBe(true);
      expect(mockOllama.checkHealth).toHaveBeenCalled();
    });

    it('should return model info', () => {
      const info = service.getModelInfo();

      expect(info).toEqual({
        name: 'qwen2.5:3b',
        type: 'local',
        provider: 'ollama',
        capabilities: ['json_mode', 'low_latency', 'constrained_decoding'],
      });
    });

    it('should get config', () => {
      const config = service.getConfig();

      expect(config.model).toBe('qwen2.5:3b');
      expect(config.temperature).toBe(0.1);
      expect(config.maxRetries).toBe(3);
    });

    it('should update config', () => {
      service.updateConfig({ temperature: 0.2 });

      const config = service.getConfig();
      expect(config.temperature).toBe(0.2);
      expect(config.model).toBe('qwen2.5:3b'); // Other fields unchanged
    });
  });
});
