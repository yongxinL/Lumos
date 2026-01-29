/**
 * Constrained JSON Decoder
 *
 * Advanced JSON decoding with multi-layer validation:
 * 1. Pre-validation hooks (transform raw input)
 * 2. JSON parsing
 * 3. Schema validation (AJV with custom keywords)
 * 4. Post-schema hooks
 * 5. Semantic validation (business rules)
 * 6. Post-semantic hooks
 * 7. Post-validation hooks (final transforms)
 *
 * Features:
 * - Schema-based constrained decoding for LLMs (Ollama format parameter)
 * - Custom AJV keywords for cross-field validation
 * - Extensible hook system
 * - Detailed error reporting with recovery suggestions
 * - Auto-correction for known fixable issues
 * - Performance metrics and caching
 *
 * Design Principles:
 * - Fail fast with descriptive errors
 * - Auto-correct when safe (with warnings)
 * - Extensible via hooks and custom rules
 * - Production-ready error handling
 */

import {
  ConstrainedDecoderError,
  DecodingError,
  SchemaValidationError,
  SemanticValidationError,
  type ValidationErrorDetail,
} from './errors';
import { SchemaRegistry, type SchemaMetadata } from './schemaRegistry';
import {
  SemanticValidator,
  type SemanticRule,
  type SemanticValidationResult,
} from './semanticValidator';
import {
  ValidationHooksManager,
  type ValidationHook,
  type HookExecutionResult,
} from './validationHooks';

/**
 * Decoding options
 */
export interface DecodeOptions {
  /** Enable auto-correction for fixable issues */
  autoCorrect?: boolean;
  /** Skip specific semantic rules */
  skipRules?: string[];
  /** Only run specific semantic rules */
  onlyRules?: string[];
  /** Skip specific hooks */
  skipHooks?: string[];
  /** Enable async hooks */
  asyncHooks?: boolean;
  /** Stop on first error */
  stopOnFirstError?: boolean;
  /** Custom metadata to pass to hooks */
  metadata?: Record<string, unknown>;
}

/**
 * Decoding result with full diagnostics
 */
export interface DecodeResult<T = unknown> {
  /** Whether decoding and validation succeeded */
  success: boolean;
  /** Decoded and validated data (if success) */
  data?: T;
  /** Error information (if failed) */
  error?: {
    type: 'parsing' | 'schema' | 'semantic' | 'hook';
    message: string;
    details: ValidationErrorDetail[];
    recoverySuggestions?: string[];
  };
  /** Warnings (non-fatal issues) */
  warnings: string[];
  /** Auto-corrections applied */
  corrections: Array<{
    path: string;
    from: unknown;
    to: unknown;
    reason: string;
  }>;
  /** Validation metrics */
  metrics: {
    totalDurationMs: number;
    parsingDurationMs: number;
    schemaDurationMs: number;
    semanticDurationMs: number;
    hooksDurationMs: number;
    rulesEvaluated: number;
    hooksExecuted: number;
  };
  /** Schema metadata used */
  schema: {
    id: string;
    version: string;
  };
}

/**
 * Decoder configuration
 */
export interface DecoderConfig {
  /** Default auto-correct behavior */
  defaultAutoCorrect: boolean;
  /** Enable async hooks by default */
  defaultAsyncHooks: boolean;
  /** Maximum input length (bytes) */
  maxInputLength: number;
  /** Enable performance logging */
  enableMetrics: boolean;
  /** Log level */
  logLevel: 'none' | 'error' | 'warn' | 'debug';
}

const DEFAULT_CONFIG: DecoderConfig = {
  defaultAutoCorrect: true,
  defaultAsyncHooks: false,
  maxInputLength: 1024 * 1024, // 1MB
  enableMetrics: true,
  logLevel: 'warn',
};

/**
 * Constrained JSON Decoder
 *
 * Main class for decoding and validating JSON with advanced constraints
 */
export class ConstrainedJsonDecoder<T extends Record<string, unknown> = Record<string, unknown>> {
  private schemaRegistry: SchemaRegistry;
  private semanticValidator: SemanticValidator<T>;
  private hooksManager: ValidationHooksManager<T>;
  private config: DecoderConfig;
  private schemaId: string;

  constructor(
    schemaId: string,
    schemaRegistry: SchemaRegistry,
    semanticValidator?: SemanticValidator<T>,
    hooksManager?: ValidationHooksManager<T>,
    config?: Partial<DecoderConfig>
  ) {
    this.schemaId = schemaId;
    this.schemaRegistry = schemaRegistry;
    this.semanticValidator = semanticValidator || new SemanticValidator();
    this.hooksManager = hooksManager || new ValidationHooksManager();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Validate that schema exists
    if (!this.schemaRegistry.has(schemaId)) {
      throw new ConstrainedDecoderError(`Schema '${schemaId}' not found in registry`);
    }
  }

  /**
   * Decode JSON string with full validation pipeline
   */
  async decode(input: string, options?: DecodeOptions): Promise<DecodeResult<T>> {
    const startTime = Date.now();
    const opts = this.mergeOptions(options);

    const result: DecodeResult<T> = {
      success: false,
      warnings: [],
      corrections: [],
      metrics: {
        totalDurationMs: 0,
        parsingDurationMs: 0,
        schemaDurationMs: 0,
        semanticDurationMs: 0,
        hooksDurationMs: 0,
        rulesEvaluated: 0,
        hooksExecuted: 0,
      },
      schema: {
        id: this.schemaId,
        version: this.schemaRegistry.getMetadata(this.schemaId)?.version || 'unknown',
      },
    };

    try {
      // Input validation
      this.validateInput(input);

      // 1. Parse JSON
      const parseStart = Date.now();
      let data = this.parseJson(input);
      result.metrics.parsingDurationMs = Date.now() - parseStart;

      // 2. Pre-validation hooks
      const preHooksStart = Date.now();
      const preHooksResult = await this.executeHooks('pre-validation', data, opts);
      data = preHooksResult.data;
      result.warnings.push(...preHooksResult.warnings);
      result.metrics.hooksExecuted += preHooksResult.executedHooks.length;
      result.metrics.hooksDurationMs += Date.now() - preHooksStart;

      // 3. Schema validation
      const schemaStart = Date.now();
      const schemaResult = this.schemaRegistry.validate(this.schemaId, data);
      result.metrics.schemaDurationMs = Date.now() - schemaStart;

      if (!schemaResult.valid) {
        result.error = {
          type: 'schema',
          message: `Schema validation failed with ${schemaResult.errors.length} error(s)`,
          details: schemaResult.errors,
          recoverySuggestions: schemaResult.errors
            .filter((e) => e.suggestion)
            .map((e) => e.suggestion!),
        };
        result.metrics.totalDurationMs = Date.now() - startTime;
        return result;
      }

      // 4. Post-schema hooks
      const postSchemaStart = Date.now();
      const postSchemaResult = await this.executeHooks('post-schema', data, opts);
      data = postSchemaResult.data;
      result.warnings.push(...postSchemaResult.warnings);
      result.metrics.hooksExecuted += postSchemaResult.executedHooks.length;
      result.metrics.hooksDurationMs += Date.now() - postSchemaStart;

      // 5. Semantic validation
      const semanticStart = Date.now();
      const semanticResult = this.runSemanticValidation(data, opts);
      result.metrics.semanticDurationMs = Date.now() - semanticStart;
      result.metrics.rulesEvaluated = semanticResult.evaluatedRules.length;

      if (!semanticResult.valid) {
        result.error = {
          type: 'semantic',
          message: `Semantic validation failed: ${semanticResult.errors.map((e) => e.message).join('; ')}`,
          details: semanticResult.errors,
        };
        result.corrections.push(
          ...semanticResult.corrections.map((c) => ({
            path: c.path,
            from: c.from,
            to: c.to,
            reason: c.reason,
          }))
        );
        result.metrics.totalDurationMs = Date.now() - startTime;
        return result;
      }

      // Update data with any semantic corrections
      data = semanticResult.data;
      result.corrections.push(
        ...semanticResult.corrections.map((c) => ({
          path: c.path,
          from: c.from,
          to: c.to,
          reason: c.reason,
        }))
      );
      result.warnings.push(...semanticResult.warnings.map((w) => w.message));

      // 6. Post-semantic hooks
      const postSemanticStart = Date.now();
      const postSemanticResult = await this.executeHooks('post-semantic', data, opts);
      data = postSemanticResult.data;
      result.warnings.push(...postSemanticResult.warnings);
      result.metrics.hooksExecuted += postSemanticResult.executedHooks.length;
      result.metrics.hooksDurationMs += Date.now() - postSemanticStart;

      // 7. Post-validation hooks
      const postValStart = Date.now();
      const postValResult = await this.executeHooks('post-validation', data, opts);
      data = postValResult.data;
      result.warnings.push(...postValResult.warnings);
      result.metrics.hooksExecuted += postValResult.executedHooks.length;
      result.metrics.hooksDurationMs += Date.now() - postValStart;

      // Success!
      result.success = true;
      result.data = data;
      result.metrics.totalDurationMs = Date.now() - startTime;

      this.log('debug', `Decode successful in ${result.metrics.totalDurationMs}ms`);

      return result;
    } catch (error) {
      result.metrics.totalDurationMs = Date.now() - startTime;

      if (error instanceof DecodingError) {
        result.error = {
          type: 'parsing',
          message: error.message,
          details: [{ path: '/', message: error.message }],
        };
      } else if (error instanceof SchemaValidationError) {
        result.error = {
          type: 'schema',
          message: error.message,
          details: error.errors,
          recoverySuggestions: error.recoverySuggestions.map((s) => s.action),
        };
      } else if (error instanceof SemanticValidationError) {
        result.error = {
          type: 'semantic',
          message: error.message,
          details: error.errors,
        };
        result.corrections.push(
          ...error.autoCorrections.map((c) => ({
            path: c.path,
            from: c.from,
            to: c.to,
            reason: c.reason,
          }))
        );
      } else if (error instanceof ConstrainedDecoderError) {
        result.error = {
          type: 'hook',
          message: error.message,
          details: [{ path: '/', message: error.message }],
        };
      } else {
        result.error = {
          type: 'parsing',
          message: error instanceof Error ? error.message : String(error),
          details: [{ path: '/', message: String(error) }],
        };
      }

      this.log('error', `Decode failed: ${result.error.message}`);
      return result;
    }
  }

  /**
   * Decode with synchronous validation only (no async hooks)
   */
  decodeSync(input: string, options?: Omit<DecodeOptions, 'asyncHooks'>): DecodeResult<T> {
    const startTime = Date.now();
    const opts = this.mergeOptions({ ...options, asyncHooks: false });

    const result: DecodeResult<T> = {
      success: false,
      warnings: [],
      corrections: [],
      metrics: {
        totalDurationMs: 0,
        parsingDurationMs: 0,
        schemaDurationMs: 0,
        semanticDurationMs: 0,
        hooksDurationMs: 0,
        rulesEvaluated: 0,
        hooksExecuted: 0,
      },
      schema: {
        id: this.schemaId,
        version: this.schemaRegistry.getMetadata(this.schemaId)?.version || 'unknown',
      },
    };

    try {
      // Input validation
      this.validateInput(input);

      // 1. Parse JSON
      const parseStart = Date.now();
      let data = this.parseJson(input);
      result.metrics.parsingDurationMs = Date.now() - parseStart;

      // 2. Pre-validation hooks (sync only)
      const preHooksStart = Date.now();
      const preHooksResult = this.hooksManager.executePhase(
        'pre-validation',
        data,
        this.schemaId,
        opts.metadata
      );
      data = preHooksResult.data;
      result.warnings.push(...preHooksResult.warnings);
      result.metrics.hooksExecuted += preHooksResult.executedHooks.length;
      result.metrics.hooksDurationMs += Date.now() - preHooksStart;

      // 3. Schema validation
      const schemaStart = Date.now();
      const schemaResult = this.schemaRegistry.validate(this.schemaId, data);
      result.metrics.schemaDurationMs = Date.now() - schemaStart;

      if (!schemaResult.valid) {
        result.error = {
          type: 'schema',
          message: `Schema validation failed with ${schemaResult.errors.length} error(s)`,
          details: schemaResult.errors,
        };
        result.metrics.totalDurationMs = Date.now() - startTime;
        return result;
      }

      // 4. Semantic validation
      const semanticStart = Date.now();
      const semanticResult = this.runSemanticValidation(data, opts);
      result.metrics.semanticDurationMs = Date.now() - semanticStart;
      result.metrics.rulesEvaluated = semanticResult.evaluatedRules.length;

      if (!semanticResult.valid) {
        result.error = {
          type: 'semantic',
          message: `Semantic validation failed`,
          details: semanticResult.errors,
        };
        result.metrics.totalDurationMs = Date.now() - startTime;
        return result;
      }

      data = semanticResult.data;
      result.corrections.push(
        ...semanticResult.corrections.map((c) => ({
          path: c.path,
          from: c.from,
          to: c.to,
          reason: c.reason,
        }))
      );
      result.warnings.push(...semanticResult.warnings.map((w) => w.message));

      // 5. Post-validation hooks (sync only)
      const postValStart = Date.now();
      const postValResult = this.hooksManager.executePhase(
        'post-validation',
        data,
        this.schemaId,
        opts.metadata
      );
      data = postValResult.data;
      result.warnings.push(...postValResult.warnings);
      result.metrics.hooksExecuted += postValResult.executedHooks.length;
      result.metrics.hooksDurationMs += Date.now() - postValStart;

      // Success!
      result.success = true;
      result.data = data;
      result.metrics.totalDurationMs = Date.now() - startTime;

      return result;
    } catch (error) {
      result.metrics.totalDurationMs = Date.now() - startTime;

      if (error instanceof DecodingError) {
        result.error = {
          type: 'parsing',
          message: error.message,
          details: [{ path: '/', message: error.message }],
        };
      } else {
        result.error = {
          type: 'parsing',
          message: error instanceof Error ? error.message : String(error),
          details: [{ path: '/', message: String(error) }],
        };
      }

      return result;
    }
  }

  /**
   * Decode and throw on error (for simpler error handling)
   */
  async decodeOrThrow(input: string, options?: DecodeOptions): Promise<T> {
    const result = await this.decode(input, options);

    if (!result.success) {
      const error = result.error!;
      switch (error.type) {
        case 'parsing':
          throw new DecodingError(error.message, input);
        case 'schema':
          throw new SchemaValidationError(error.message, this.schemaId, error.details);
        case 'semantic':
          throw new SemanticValidationError(
            error.message,
            'semantic',
            error.details,
            result.corrections.map((c) => ({
              path: c.path,
              from: c.from,
              to: c.to,
              reason: c.reason,
            }))
          );
        default:
          throw new ConstrainedDecoderError(error.message);
      }
    }

    return result.data!;
  }

  /**
   * Get the schema for Ollama constrained decoding
   */
  getOllamaSchema(): string {
    return JSON.stringify(this.schemaRegistry.getOllamaSchema(this.schemaId));
  }

  /**
   * Get schema metadata
   */
  getSchemaMetadata(): SchemaMetadata | undefined {
    return this.schemaRegistry.getMetadata(this.schemaId);
  }

  /**
   * Add a semantic validation rule
   */
  addSemanticRule(rule: SemanticRule<T>): this {
    this.semanticValidator.addRule(rule);
    return this;
  }

  /**
   * Remove a semantic validation rule
   */
  removeSemanticRule(ruleId: string): boolean {
    return this.semanticValidator.removeRule(ruleId);
  }

  /**
   * Add a validation hook
   */
  addHook(hook: ValidationHook<T>): this {
    this.hooksManager.register(hook);
    return this;
  }

  /**
   * Remove a validation hook
   */
  removeHook(hookId: string): boolean {
    return this.hooksManager.unregister(hookId);
  }

  /**
   * Enable/disable a hook
   */
  setHookEnabled(hookId: string, enabled: boolean): boolean {
    return this.hooksManager.setEnabled(hookId, enabled);
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<DecoderConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DecoderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Merge options with defaults
   */
  private mergeOptions(options?: DecodeOptions): Required<DecodeOptions> {
    return {
      autoCorrect: options?.autoCorrect ?? this.config.defaultAutoCorrect,
      skipRules: options?.skipRules ?? [],
      onlyRules: options?.onlyRules ?? [],
      skipHooks: options?.skipHooks ?? [],
      asyncHooks: options?.asyncHooks ?? this.config.defaultAsyncHooks,
      stopOnFirstError: options?.stopOnFirstError ?? false,
      metadata: options?.metadata ?? {},
    };
  }

  /**
   * Validate input string
   */
  private validateInput(input: string): void {
    if (!input || typeof input !== 'string') {
      throw new DecodingError('Input must be a non-empty string', String(input));
    }

    if (input.length > this.config.maxInputLength) {
      throw new DecodingError(
        `Input exceeds maximum length (${input.length} > ${this.config.maxInputLength})`,
        input.substring(0, 100)
      );
    }
  }

  /**
   * Parse JSON string
   */
  private parseJson(input: string): T {
    try {
      const parsed = JSON.parse(input);

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new DecodingError('JSON must parse to an object', input);
      }

      return parsed as T;
    } catch (error) {
      if (error instanceof DecodingError) {
        throw error;
      }

      // Extract position from SyntaxError
      let position: number | undefined;
      if (error instanceof SyntaxError && error.message) {
        const match = error.message.match(/position (\d+)/i);
        if (match) {
          position = parseInt(match[1], 10);
        }
      }

      throw new DecodingError(
        `JSON parsing failed: ${error instanceof Error ? error.message : String(error)}`,
        input,
        position,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Execute hooks for a phase
   */
  private async executeHooks(
    phase: 'pre-validation' | 'post-schema' | 'post-semantic' | 'post-validation',
    data: T,
    options: Required<DecodeOptions>
  ): Promise<HookExecutionResult<T>> {
    if (options.asyncHooks) {
      return this.hooksManager.executePhaseAsync(phase, data, this.schemaId, options.metadata);
    }

    return this.hooksManager.executePhase(phase, data, this.schemaId, options.metadata);
  }

  /**
   * Run semantic validation
   */
  private runSemanticValidation(
    data: T,
    options: Required<DecodeOptions>
  ): SemanticValidationResult<T> {
    return this.semanticValidator.validate(data, {
      autoCorrect: options.autoCorrect,
      skipRules: options.skipRules.length > 0 ? options.skipRules : undefined,
      onlyRules: options.onlyRules.length > 0 ? options.onlyRules : undefined,
      stopOnFirstError: options.stopOnFirstError,
    });
  }

  /**
   * Log message based on config
   */
  private log(level: 'error' | 'warn' | 'debug', message: string): void {
    if (this.config.logLevel === 'none') return;

    const levels = { error: 0, warn: 1, debug: 2 };
    const configLevel = levels[this.config.logLevel] ?? 1;
    const messageLevel = levels[level];

    if (messageLevel <= configLevel) {
      const prefix = `[ConstrainedJsonDecoder:${this.schemaId}]`;
      switch (level) {
        case 'error':
          console.error(`${prefix} ${message}`);
          break;
        case 'warn':
          console.warn(`${prefix} ${message}`);
          break;
        case 'debug':
          console.log(`${prefix} ${message}`);
          break;
      }
    }
  }
}
