/**
 * Fast Path Service Unit Tests
 *
 * Tests for pattern-based input classification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FastPathService } from '../fastPath';
import type { FastPathRoutingInput } from '@/types';

describe('FastPathService', () => {
  let service: FastPathService;

  beforeEach(() => {
    service = new FastPathService();
  });

  describe('classify', () => {
    it('should classify calendar scheduling as action', () => {
      const input: FastPathRoutingInput = {
        text: 'Schedule a meeting tomorrow at 2pm',
        type: 'text',
        timestamp: new Date().toISOString() as any,
        source: 'user_text',
      };

      const result = service.classify(input);

      expect(result.classification).toBe('action');
      expect(result.route_to).toBe('evaluation_llm');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should classify file creation as action', () => {
      const input: FastPathRoutingInput = {
        text: 'Create a new folder called Projects',
        type: 'text',
        timestamp: new Date().toISOString() as any,
        source: 'user_text',
      };

      const result = service.classify(input);

      expect(result.classification).toBe('action');
      expect(result.route_to).toBe('evaluation_llm');
    });

    it('should classify information queries as non-action', () => {
      const input: FastPathRoutingInput = {
        text: 'What is the weather today?',
        type: 'text',
        timestamp: new Date().toISOString() as any,
        source: 'user_text',
      };

      const result = service.classify(input);

      expect(result.classification).toBe('non_action');
      expect(result.route_to).toBe('expert_ai');
    });

    it('should classify how questions as non-action', () => {
      const input: FastPathRoutingInput = {
        text: 'How do I use this feature?',
        type: 'text',
        timestamp: new Date().toISOString() as any,
        source: 'user_text',
      };

      const result = service.classify(input);

      expect(result.classification).toBe('non_action');
      expect(result.route_to).toBe('expert_ai');
    });

    it('should classify ambiguous input as action (fail-safe)', () => {
      const input: FastPathRoutingInput = {
        text: 'xyz abc qwe',
        type: 'text',
        timestamp: new Date().toISOString() as any,
        source: 'user_text',
      };

      const result = service.classify(input);

      expect(result.classification).toBe('action');
      expect(result.route_to).toBe('evaluation_llm');
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it('should be case-insensitive', () => {
      const upperInput: FastPathRoutingInput = {
        text: 'SCHEDULE A MEETING',
        type: 'text',
        timestamp: new Date().toISOString() as any,
        source: 'user_text',
      };

      const lowerInput: FastPathRoutingInput = {
        text: 'schedule a meeting',
        type: 'text',
        timestamp: new Date().toISOString() as any,
        source: 'user_text',
      };

      const upperResult = service.classify(upperInput);
      const lowerResult = service.classify(lowerInput);

      expect(upperResult.classification).toBe(lowerResult.classification);
      expect(upperResult.route_to).toBe(lowerResult.route_to);
    });

    it('should classify task creation as action', () => {
      const input: FastPathRoutingInput = {
        text: 'Create a task to review the document',
        type: 'text',
        timestamp: new Date().toISOString() as any,
        source: 'user_text',
      };

      const result = service.classify(input);

      expect(result.classification).toBe('action');
      expect(result.route_to).toBe('evaluation_llm');
    });

    it('should have matched_pattern when pattern matches', () => {
      const input: FastPathRoutingInput = {
        text: 'Schedule a meeting',
        type: 'text',
        timestamp: new Date().toISOString() as any,
        source: 'user_text',
      };

      const result = service.classify(input);

      expect(result.matched_pattern).not.toBeNull();
      expect(typeof result.matched_pattern).toBe('string');
    });

    it('should measure classification time', () => {
      const input: FastPathRoutingInput = {
        text: 'Schedule a meeting',
        type: 'text',
        timestamp: new Date().toISOString() as any,
        source: 'user_text',
      };

      const result = service.classify(input);

      expect(result.classification_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.classification_time_ms).toBeLessThan(100); // Should be < 10ms target
    });

    it('should prioritize action patterns over non-action', () => {
      // "send" is an action pattern
      const input: FastPathRoutingInput = {
        text: 'Send me an update',
        type: 'text',
        timestamp: new Date().toISOString() as any,
        source: 'user_text',
      };

      const result = service.classify(input);

      expect(result.classification).toBe('action');
    });
  });

  describe('getMetrics', () => {
    it('should return service metrics', () => {
      const metrics = service.getMetrics();

      expect(metrics.action_patterns).toBeGreaterThan(0);
      expect(metrics.non_action_patterns).toBeGreaterThan(0);
      expect(metrics.target_classification_time_ms).toBe(10);
    });
  });
});
