/**
 * Fast Path Service
 *
 * Classifies input and routes to appropriate processor.
 * Pure TypeScript pattern matching for <10ms classification target.
 *
 * Design Decisions:
 * - Action patterns take priority over non-action patterns
 * - Ambiguous input defaults to Evaluation LLM (fail-safe)
 * - No LLM involvement (pure regex patterns)
 * - Case-insensitive pattern matching
 */

import type { FastPathRoutingInput, FastPathClassification } from '@/types';

/**
 * Action pattern definitions with priority ordering
 * Higher priority patterns are evaluated first
 */
const ACTION_PATTERNS = [
  // Calendar operations (high confidence)
  { pattern: /schedule\s+(meeting|event|call)/i, priority: 100, confidence: 0.95 },
  { pattern: /add.*to.*calendar/i, priority: 100, confidence: 0.95 },
  { pattern: /book\s+(a\s+)?meeting/i, priority: 100, confidence: 0.95 },
  { pattern: /create.*event/i, priority: 100, confidence: 0.9 },
  { pattern: /calendar.*add/i, priority: 95, confidence: 0.9 },

  // File operations (high confidence)
  { pattern: /create\s+(file|folder|directory)/i, priority: 100, confidence: 0.95 },
  { pattern: /delete\s+(file|folder|directory)/i, priority: 100, confidence: 0.95 },
  { pattern: /move\s+.*\s+(to|into)/i, priority: 100, confidence: 0.9 },
  { pattern: /copy\s+.*\s+to/i, priority: 100, confidence: 0.9 },
  { pattern: /rename\s+.*\s+(to|as)/i, priority: 100, confidence: 0.9 },

  // Task operations (medium-high confidence)
  { pattern: /create\s+(task|todo|reminder)/i, priority: 90, confidence: 0.9 },
  { pattern: /mark\s+.*\s+(complete|done|finished)/i, priority: 90, confidence: 0.85 },
  { pattern: /update\s+task/i, priority: 85, confidence: 0.85 },
  { pattern: /assign\s+task/i, priority: 85, confidence: 0.85 },

  // General action verbs with high confidence
  {
    pattern:
      /^(send|create|delete|update|modify|add|remove|execute|run|start|stop|pause|resume)\b/i,
    priority: 70,
    confidence: 0.8,
  },
] as const;

/**
 * Non-action pattern definitions with priority ordering
 * These are lower priority and typically routed to Expert AI for reasoning
 */
const NON_ACTION_PATTERNS = [
  // Information queries
  { pattern: /what\s+is/i, priority: 80, confidence: 0.9 },
  { pattern: /how\s+(do|can|does|did)/i, priority: 80, confidence: 0.9 },
  { pattern: /why\s+(is|did|do|are)/i, priority: 80, confidence: 0.9 },
  { pattern: /tell\s+(me|us)\s+(about|regarding)/i, priority: 80, confidence: 0.9 },
  { pattern: /explain/i, priority: 75, confidence: 0.85 },

  // Analysis and advice queries
  { pattern: /analyze|summarize|review/i, priority: 75, confidence: 0.85 },
  { pattern: /suggest|recommend|advise/i, priority: 70, confidence: 0.8 },
  { pattern: /help\s+(me|us)\s+(with|understand)/i, priority: 70, confidence: 0.8 },

  // Status and information queries
  { pattern: /what.*status|status.*what/i, priority: 70, confidence: 0.85 },
  { pattern: /show\s+me|display/i, priority: 65, confidence: 0.75 },
] as const;

interface PatternMatch {
  pattern: RegExp;
  priority: number;
  confidence: number;
}

export class FastPathService {
  private actionPatterns: PatternMatch[];
  private nonActionPatterns: PatternMatch[];

  constructor() {
    // Sort patterns by priority (descending) for evaluation order
    this.actionPatterns = [...ACTION_PATTERNS].sort((a, b) => b.priority - a.priority);
    this.nonActionPatterns = [...NON_ACTION_PATTERNS].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Classify input and determine routing
   *
   * Performance target: <10ms
   * Fail-safe: Ambiguous input defaults to 'evaluation_llm' (action path)
   */
  public classify(input: FastPathRoutingInput): FastPathClassification {
    const startTime = performance.now();

    try {
      // Normalize input text for pattern matching
      const normalizedText = this.normalizeInput(input.text);

      // Check action patterns first (higher priority)
      for (const patternMatch of this.actionPatterns) {
        if (patternMatch.pattern.test(normalizedText)) {
          return {
            classification: 'action',
            confidence: patternMatch.confidence,
            matched_pattern: patternMatch.pattern.source,
            route_to: 'evaluation_llm',
            classification_time_ms: performance.now() - startTime,
          };
        }
      }

      // Check non-action patterns
      for (const patternMatch of this.nonActionPatterns) {
        if (patternMatch.pattern.test(normalizedText)) {
          return {
            classification: 'non_action',
            confidence: patternMatch.confidence,
            matched_pattern: patternMatch.pattern.source,
            route_to: 'expert_ai',
            classification_time_ms: performance.now() - startTime,
          };
        }
      }

      // Default case: ambiguous input → evaluation_llm (fail-safe for actions)
      return {
        classification: 'action',
        confidence: 0.5,
        matched_pattern: null,
        route_to: 'evaluation_llm',
        classification_time_ms: performance.now() - startTime,
      };
    } catch (error) {
      // Fail-safe: errors default to evaluation_llm
      console.error('Fast path classification error:', error);
      return {
        classification: 'action',
        confidence: 0.3,
        matched_pattern: null,
        route_to: 'evaluation_llm',
        classification_time_ms: performance.now() - startTime,
      };
    }
  }

  /**
   * Normalize input text for pattern matching
   */
  private normalizeInput(text: string): string {
    return text
      .trim() // Remove leading/trailing whitespace
      .toLowerCase(); // Case-insensitive matching already in patterns, but normalize
  }

  /**
   * Get performance metrics for classification system
   */
  public getMetrics() {
    return {
      action_patterns: this.actionPatterns.length,
      non_action_patterns: this.nonActionPatterns.length,
      target_classification_time_ms: 10,
    };
  }
}

/**
 * Singleton instance
 */
let fastPathServiceInstance: FastPathService | null = null;

/**
 * Get or create Fast Path Service singleton
 */
export function getFastPathService(): FastPathService {
  if (!fastPathServiceInstance) {
    fastPathServiceInstance = new FastPathService();
  }
  return fastPathServiceInstance;
}
