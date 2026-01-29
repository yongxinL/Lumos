/**
 * Semantic Validator for Constrained JSON Decoding
 *
 * Provides advanced validation beyond JSON Schema:
 * - Cross-field dependency validation
 * - Business rule enforcement
 * - Auto-correction for known fixable issues
 * - Validation result with detailed diagnostics
 *
 * Design Principles:
 * - Declarative rule definitions
 * - Auto-correction when safe (with warnings)
 * - Detailed error reporting with suggestions
 * - Extensible via custom rule registration
 */

import { SemanticValidationError, type ValidationErrorDetail } from './errors';

/**
 * Semantic validation rule definition
 */
export interface SemanticRule<T = unknown> {
  /** Unique rule identifier */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Severity: 'error' fails validation, 'warning' logs but passes */
  severity: 'error' | 'warning';
  /** Predicate function that returns true if valid */
  validate: (data: T) => boolean;
  /** Error message when validation fails */
  errorMessage: string | ((data: T) => string);
  /** Optional auto-correction function */
  autoCorrect?: (data: T) => { corrected: T; corrections: CorrectionRecord[] };
  /** Fields this rule validates (for reporting) */
  fields: string[];
  /** Categories for grouping rules */
  categories?: string[];
}

/**
 * Record of an auto-correction
 */
export interface CorrectionRecord {
  /** Path to the corrected field */
  path: string;
  /** Original value */
  from: unknown;
  /** Corrected value */
  to: unknown;
  /** Reason for correction */
  reason: string;
  /** Rule that made the correction */
  ruleId: string;
}

/**
 * Validation result with detailed diagnostics
 */
export interface SemanticValidationResult<T = unknown> {
  /** Whether validation passed */
  valid: boolean;
  /** Validated (and possibly corrected) data */
  data: T;
  /** Validation errors */
  errors: ValidationErrorDetail[];
  /** Warnings (non-fatal issues) */
  warnings: ValidationErrorDetail[];
  /** Auto-corrections applied */
  corrections: CorrectionRecord[];
  /** Rules that were evaluated */
  evaluatedRules: string[];
  /** Validation duration in milliseconds */
  durationMs: number;
}

/**
 * Semantic Validator class
 *
 * Manages semantic validation rules and applies them to data
 */
export class SemanticValidator<T extends Record<string, unknown> = Record<string, unknown>> {
  private rules: Map<string, SemanticRule<T>> = new Map();
  private ruleOrder: string[] = [];

  constructor(rules?: SemanticRule<T>[]) {
    if (rules) {
      for (const rule of rules) {
        this.addRule(rule);
      }
    }
  }

  /**
   * Add a validation rule
   */
  addRule(rule: SemanticRule<T>): this {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule with id '${rule.id}' already exists`);
    }
    this.rules.set(rule.id, rule);
    this.ruleOrder.push(rule.id);
    return this;
  }

  /**
   * Remove a validation rule
   */
  removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      this.ruleOrder = this.ruleOrder.filter((id) => id !== ruleId);
    }
    return deleted;
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): SemanticRule<T> | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): SemanticRule<T>[] {
    return this.ruleOrder.map((id) => this.rules.get(id)!);
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: string): SemanticRule<T>[] {
    return this.getAllRules().filter((rule) => rule.categories?.includes(category));
  }

  /**
   * Validate data against all registered rules
   * @param data - Data to validate
   * @param options - Validation options
   * @returns Validation result with diagnostics
   */
  validate(
    data: T,
    options: {
      /** Enable auto-correction */
      autoCorrect?: boolean;
      /** Rules to skip */
      skipRules?: string[];
      /** Only run these rules */
      onlyRules?: string[];
      /** Stop on first error */
      stopOnFirstError?: boolean;
    } = {}
  ): SemanticValidationResult<T> {
    const startTime = Date.now();
    const result: SemanticValidationResult<T> = {
      valid: true,
      data: structuredClone(data), // Work on a copy
      errors: [],
      warnings: [],
      corrections: [],
      evaluatedRules: [],
      durationMs: 0,
    };

    // Determine which rules to run
    let rulesToRun = this.ruleOrder;
    if (options.onlyRules) {
      rulesToRun = rulesToRun.filter((id) => options.onlyRules!.includes(id));
    }
    if (options.skipRules) {
      rulesToRun = rulesToRun.filter((id) => !options.skipRules!.includes(id));
    }

    // Run each rule
    for (const ruleId of rulesToRun) {
      const rule = this.rules.get(ruleId)!;
      result.evaluatedRules.push(ruleId);

      try {
        const isValid = rule.validate(result.data);

        if (!isValid) {
          const errorMessage =
            typeof rule.errorMessage === 'function'
              ? rule.errorMessage(result.data)
              : rule.errorMessage;

          const errorDetail: ValidationErrorDetail = {
            path: rule.fields[0] || '/',
            message: errorMessage,
            keyword: 'semanticRule',
            suggestion: `Check rule: ${rule.name}`,
          };

          if (rule.severity === 'error') {
            // Try auto-correction if enabled
            if (options.autoCorrect && rule.autoCorrect) {
              const { corrected, corrections } = rule.autoCorrect(result.data);
              result.data = corrected;
              result.corrections.push(...corrections);

              // Re-validate after correction
              if (rule.validate(result.data)) {
                // Correction fixed the issue, add as warning instead
                result.warnings.push({
                  ...errorDetail,
                  message: `Auto-corrected: ${errorMessage}`,
                });
                continue;
              }
            }

            result.valid = false;
            result.errors.push(errorDetail);

            if (options.stopOnFirstError) {
              break;
            }
          } else {
            result.warnings.push(errorDetail);
          }
        }
      } catch (error) {
        // Rule threw an exception - treat as error
        result.valid = false;
        result.errors.push({
          path: '/',
          message: `Rule '${rule.id}' threw an error: ${error instanceof Error ? error.message : String(error)}`,
          keyword: 'semanticRuleError',
        });

        if (options.stopOnFirstError) {
          break;
        }
      }
    }

    result.durationMs = Date.now() - startTime;
    return result;
  }

  /**
   * Validate and throw on error
   */
  validateOrThrow(
    data: T,
    options: {
      autoCorrect?: boolean;
      skipRules?: string[];
      onlyRules?: string[];
    } = {}
  ): T {
    const result = this.validate(data, { ...options, stopOnFirstError: false });

    if (!result.valid) {
      throw new SemanticValidationError(
        `Semantic validation failed: ${result.errors.map((e) => e.message).join('; ')}`,
        result.evaluatedRules.join(', '),
        result.errors,
        result.corrections.map((c) => ({
          path: c.path,
          from: c.from,
          to: c.to,
          reason: c.reason,
        }))
      );
    }

    return result.data;
  }
}

// ============================================================================
// Pre-built Rules for ActionProposal
// ============================================================================

/**
 * Create semantic rules for ActionProposal validation
 */
export function createActionProposalRules(): SemanticRule<Record<string, unknown>>[] {
  return [
    // Rule: Confidence must be in valid range [0, 1]
    {
      id: 'confidence-range',
      name: 'Confidence Range',
      description: 'Confidence score must be between 0 and 1',
      severity: 'error',
      validate: (data) => {
        const confidence = data.confidence;
        return typeof confidence === 'number' && confidence >= 0 && confidence <= 1;
      },
      errorMessage: (data) => `Confidence ${data.confidence} is out of valid range [0, 1]`,
      autoCorrect: (data) => {
        const corrected = { ...data };
        const confidence = data.confidence as number;
        const newValue = Math.max(0, Math.min(1, confidence));
        corrected.confidence = newValue;
        return {
          corrected,
          corrections: [
            {
              path: '/confidence',
              from: confidence,
              to: newValue,
              reason: 'Clamped to valid range [0, 1]',
              ruleId: 'confidence-range',
            },
          ],
        };
      },
      fields: ['confidence'],
      categories: ['range', 'numerical'],
    },

    // Rule: Operation format must be "module:action"
    {
      id: 'operation-format',
      name: 'Operation Format',
      description: 'Operation must follow "module:action" pattern with lowercase',
      severity: 'error',
      validate: (data) => {
        const operation = data.operation;
        return typeof operation === 'string' && /^[a-z_]+:[a-z_]+$/.test(operation);
      },
      errorMessage: (data) =>
        `Operation '${data.operation}' must be in format 'module:action' with lowercase letters and underscores`,
      autoCorrect: (data) => {
        const corrected = { ...data };
        const operation = String(data.operation)
          .toLowerCase()
          .replace(/[^a-z_:]/g, '_');
        // Ensure there's exactly one colon
        const parts = operation.split(':');
        const newValue =
          parts.length >= 2 ? `${parts[0]}:${parts.slice(1).join('_')}` : `${operation}:unknown`;
        corrected.operation = newValue;
        return {
          corrected,
          corrections: [
            {
              path: '/operation',
              from: data.operation,
              to: newValue,
              reason: 'Normalized to module:action format',
              ruleId: 'operation-format',
            },
          ],
        };
      },
      fields: ['operation'],
      categories: ['format', 'pattern'],
    },

    // Rule: High-risk operations MUST require confirmation
    {
      id: 'high-risk-confirmation',
      name: 'High Risk Confirmation',
      description: 'High-risk operations must require user confirmation',
      severity: 'error',
      validate: (data) => {
        if (data.risk_level !== 'high') return true;
        return data.requires_confirmation === true;
      },
      errorMessage: 'High-risk operations must require confirmation',
      autoCorrect: (data) => {
        const corrected = { ...data };
        corrected.requires_confirmation = true;
        return {
          corrected,
          corrections: [
            {
              path: '/requires_confirmation',
              from: data.requires_confirmation,
              to: true,
              reason: 'High-risk operations require user confirmation',
              ruleId: 'high-risk-confirmation',
            },
          ],
        };
      },
      fields: ['risk_level', 'requires_confirmation'],
      categories: ['security', 'confirmation'],
    },

    // Rule: Delete operations should be high risk
    {
      id: 'delete-risk-level',
      name: 'Delete Risk Level',
      description: 'Delete operations must be classified as high risk',
      severity: 'error',
      validate: (data) => {
        const operation = String(data.operation);
        if (!operation.includes('delete')) return true;
        return data.risk_level === 'high';
      },
      errorMessage: (data) =>
        `Delete operation '${data.operation}' must have risk_level 'high', got '${data.risk_level}'`,
      autoCorrect: (data) => {
        const corrected = { ...data };
        corrected.risk_level = 'high';
        return {
          corrected,
          corrections: [
            {
              path: '/risk_level',
              from: data.risk_level,
              to: 'high',
              reason: 'Delete operations are inherently high-risk',
              ruleId: 'delete-risk-level',
            },
          ],
        };
      },
      fields: ['operation', 'risk_level'],
      categories: ['security', 'risk'],
    },

    // Rule: Delete operations should be IRREVERSIBLE or COMPENSATABLE
    {
      id: 'delete-reversibility',
      name: 'Delete Reversibility',
      description: 'Delete operations must have appropriate reversibility classification',
      severity: 'error',
      validate: (data) => {
        const operation = String(data.operation);
        if (!operation.includes('delete')) return true;
        return ['COMPENSATABLE', 'IRREVERSIBLE'].includes(String(data.reversibility));
      },
      errorMessage: (data) =>
        `Delete operation '${data.operation}' must have reversibility 'COMPENSATABLE' or 'IRREVERSIBLE', got '${data.reversibility}'`,
      autoCorrect: (data) => {
        const corrected = { ...data };
        corrected.reversibility = 'IRREVERSIBLE';
        return {
          corrected,
          corrections: [
            {
              path: '/reversibility',
              from: data.reversibility,
              to: 'IRREVERSIBLE',
              reason: 'Delete operations are typically irreversible',
              ruleId: 'delete-reversibility',
            },
          ],
        };
      },
      fields: ['operation', 'reversibility'],
      categories: ['security', 'rollback'],
    },

    // Rule: Delete operations must require confirmation
    {
      id: 'delete-confirmation',
      name: 'Delete Confirmation',
      description: 'Delete operations must require user confirmation',
      severity: 'error',
      validate: (data) => {
        const operation = String(data.operation);
        if (!operation.includes('delete')) return true;
        return data.requires_confirmation === true;
      },
      errorMessage: 'Delete operations must require confirmation',
      autoCorrect: (data) => {
        const corrected = { ...data };
        corrected.requires_confirmation = true;
        return {
          corrected,
          corrections: [
            {
              path: '/requires_confirmation',
              from: data.requires_confirmation,
              to: true,
              reason: 'Delete operations require explicit user confirmation',
              ruleId: 'delete-confirmation',
            },
          ],
        };
      },
      fields: ['operation', 'requires_confirmation'],
      categories: ['security', 'confirmation'],
    },

    // Rule: Read operations should be low risk
    {
      id: 'read-risk-level',
      name: 'Read Risk Level',
      description: 'Read/view operations should be classified as low risk',
      severity: 'warning',
      validate: (data) => {
        const operation = String(data.operation);
        if (!operation.includes('read') && !operation.includes('view')) return true;
        return data.risk_level === 'low';
      },
      errorMessage: (data) =>
        `Read operation '${data.operation}' should have risk_level 'low', got '${data.risk_level}'`,
      autoCorrect: (data) => {
        const corrected = { ...data };
        corrected.risk_level = 'low';
        return {
          corrected,
          corrections: [
            {
              path: '/risk_level',
              from: data.risk_level,
              to: 'low',
              reason: 'Read operations are low-risk',
              ruleId: 'read-risk-level',
            },
          ],
        };
      },
      fields: ['operation', 'risk_level'],
      categories: ['optimization', 'risk'],
    },

    // Rule: Read operations should have FULL reversibility
    {
      id: 'read-reversibility',
      name: 'Read Reversibility',
      description: 'Read operations should have FULL reversibility (no state change)',
      severity: 'warning',
      validate: (data) => {
        const operation = String(data.operation);
        if (!operation.includes('read') && !operation.includes('view')) return true;
        return data.reversibility === 'FULL';
      },
      errorMessage: (data) =>
        `Read operation '${data.operation}' should have reversibility 'FULL', got '${data.reversibility}'`,
      autoCorrect: (data) => {
        const corrected = { ...data };
        corrected.reversibility = 'FULL';
        return {
          corrected,
          corrections: [
            {
              path: '/reversibility',
              from: data.reversibility,
              to: 'FULL',
              reason: 'Read operations do not change state',
              ruleId: 'read-reversibility',
            },
          ],
        };
      },
      fields: ['operation', 'reversibility'],
      categories: ['optimization', 'rollback'],
    },

    // Rule: Read operations should not require confirmation
    {
      id: 'read-no-confirmation',
      name: 'Read No Confirmation',
      description: 'Read operations should not require confirmation',
      severity: 'warning',
      validate: (data) => {
        const operation = String(data.operation);
        if (!operation.includes('read') && !operation.includes('view')) return true;
        return data.requires_confirmation === false;
      },
      errorMessage: 'Read operations should not require confirmation',
      autoCorrect: (data) => {
        const corrected = { ...data };
        corrected.requires_confirmation = false;
        return {
          corrected,
          corrections: [
            {
              path: '/requires_confirmation',
              from: data.requires_confirmation,
              to: false,
              reason: 'Read operations are safe and do not need confirmation',
              ruleId: 'read-no-confirmation',
            },
          ],
        };
      },
      fields: ['operation', 'requires_confirmation'],
      categories: ['optimization', 'ux'],
    },

    // Rule: Create operations should be at least medium risk
    {
      id: 'create-risk-level',
      name: 'Create Risk Level',
      description: 'Create operations should be at least medium risk',
      severity: 'warning',
      validate: (data) => {
        const operation = String(data.operation);
        if (!operation.includes('create')) return true;
        return ['medium', 'high'].includes(String(data.risk_level));
      },
      errorMessage: (data) =>
        `Create operation '${data.operation}' should have risk_level 'medium' or 'high', got '${data.risk_level}'`,
      autoCorrect: (data) => {
        const corrected = { ...data };
        corrected.risk_level = 'medium';
        return {
          corrected,
          corrections: [
            {
              path: '/risk_level',
              from: data.risk_level,
              to: 'medium',
              reason: 'Create operations modify state and should be at least medium risk',
              ruleId: 'create-risk-level',
            },
          ],
        };
      },
      fields: ['operation', 'risk_level'],
      categories: ['security', 'risk'],
    },

    // Rule: Intent should not be empty or too short
    {
      id: 'intent-length',
      name: 'Intent Length',
      description: 'Intent must be at least 5 characters',
      severity: 'error',
      validate: (data) => {
        const intent = String(data.intent || '').trim();
        return intent.length >= 5;
      },
      errorMessage: (data) =>
        `Intent '${data.intent}' is too short (minimum 5 characters, got ${String(data.intent || '').length})`,
      fields: ['intent'],
      categories: ['content', 'quality'],
    },

    // Rule: Intent should not exceed maximum length
    {
      id: 'intent-max-length',
      name: 'Intent Max Length',
      description: 'Intent must not exceed 500 characters',
      severity: 'error',
      validate: (data) => {
        const intent = String(data.intent || '');
        return intent.length <= 500;
      },
      errorMessage: (data) =>
        `Intent exceeds maximum length (500 characters, got ${String(data.intent || '').length})`,
      autoCorrect: (data) => {
        const corrected = { ...data };
        const intent = String(data.intent || '');
        corrected.intent = intent.substring(0, 497) + '...';
        return {
          corrected,
          corrections: [
            {
              path: '/intent',
              from: intent,
              to: corrected.intent,
              reason: 'Truncated to maximum 500 characters',
              ruleId: 'intent-max-length',
            },
          ],
        };
      },
      fields: ['intent'],
      categories: ['content', 'limits'],
    },

    // Rule: Confidential data requires high risk or medium + confirmation
    {
      id: 'confidential-data-handling',
      name: 'Confidential Data Handling',
      description: 'Confidential data operations must have appropriate safeguards',
      severity: 'warning',
      validate: (data) => {
        if (!['confidential', 'restricted'].includes(String(data.data_classification))) {
          return true;
        }
        // Must be high risk OR (medium risk with confirmation)
        if (data.risk_level === 'high') return true;
        if (data.risk_level === 'medium' && data.requires_confirmation === true) return true;
        return false;
      },
      errorMessage: (data) =>
        `${data.data_classification} data operations must be high-risk or require confirmation`,
      autoCorrect: (data) => {
        const corrected = { ...data };
        corrected.requires_confirmation = true;
        return {
          corrected,
          corrections: [
            {
              path: '/requires_confirmation',
              from: data.requires_confirmation,
              to: true,
              reason: 'Confidential/restricted data requires explicit confirmation',
              ruleId: 'confidential-data-handling',
            },
          ],
        };
      },
      fields: ['data_classification', 'risk_level', 'requires_confirmation'],
      categories: ['security', 'compliance'],
    },

    // Rule: Low confidence proposals should require confirmation
    {
      id: 'low-confidence-confirmation',
      name: 'Low Confidence Confirmation',
      description: 'Proposals with low confidence (< 0.7) should require confirmation',
      severity: 'warning',
      validate: (data) => {
        const confidence = data.confidence as number;
        if (confidence >= 0.7) return true;
        return data.requires_confirmation === true;
      },
      errorMessage: (data) =>
        `Low confidence (${data.confidence}) proposal should require confirmation`,
      autoCorrect: (data) => {
        const corrected = { ...data };
        corrected.requires_confirmation = true;
        return {
          corrected,
          corrections: [
            {
              path: '/requires_confirmation',
              from: data.requires_confirmation,
              to: true,
              reason: 'Low confidence proposals need user verification',
              ruleId: 'low-confidence-confirmation',
            },
          ],
        };
      },
      fields: ['confidence', 'requires_confirmation'],
      categories: ['quality', 'ux'],
    },
  ];
}

/**
 * Create a pre-configured SemanticValidator for ActionProposal
 */
export function createActionProposalValidator(): SemanticValidator<Record<string, unknown>> {
  return new SemanticValidator(createActionProposalRules());
}
