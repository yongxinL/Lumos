/**
 * Constrained JSON Decoder Error Classes
 *
 * Custom error types for constrained decoding failures with detailed diagnostics.
 * Provides structured error handling, recovery suggestions, and debugging context.
 *
 * Error Hierarchy:
 * - ConstrainedDecoderError (base class)
 *   - SchemaValidationError (JSON Schema validation failed)
 *   - SemanticValidationError (Cross-field / business rule validation failed)
 *   - DecodingError (JSON parsing failed)
 *   - SchemaRegistrationError (Schema compilation or registration failed)
 *   - ValidationHookError (Custom validation hook threw an error)
 */

/**
 * Validation error detail with path and context
 */
export interface ValidationErrorDetail {
  /** JSON path to the error (e.g., "/intent" or "/target_entity/id") */
  path: string;
  /** Error message */
  message: string;
  /** Expected value or constraint (if applicable) */
  expected?: string;
  /** Actual value received (if applicable) */
  actual?: unknown;
  /** Keyword that caused the error (e.g., "type", "pattern", "minimum") */
  keyword?: string;
  /** Suggested fix (if available) */
  suggestion?: string;
}

/**
 * Recovery suggestion for validation errors
 */
export interface RecoverySuggestion {
  /** Suggested action to fix the error */
  action: string;
  /** Confidence in this suggestion (0-1) */
  confidence: number;
  /** JSON path to apply fix (if applicable) */
  path?: string;
  /** Suggested value (if applicable) */
  suggestedValue?: unknown;
}

/**
 * Base error class for Constrained JSON Decoder
 */
export class ConstrainedDecoderError extends Error {
  /** Timestamp when error occurred */
  public readonly timestamp: string;

  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, new.target.prototype);

    // Preserve original stack trace if cause exists
    if (cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp,
      cause: this.cause?.message,
    };
  }
}

/**
 * JSON Schema validation failed
 */
export class SchemaValidationError extends ConstrainedDecoderError {
  /** Recovery suggestions based on errors */
  public readonly recoverySuggestions: RecoverySuggestion[];

  constructor(
    message: string,
    public readonly schemaId: string,
    public readonly errors: ValidationErrorDetail[],
    cause?: Error
  ) {
    super(message, cause);
    this.recoverySuggestions = this.generateRecoverySuggestions();
  }

  /**
   * Get errors grouped by path
   */
  getErrorsByPath(): Map<string, ValidationErrorDetail[]> {
    const grouped = new Map<string, ValidationErrorDetail[]>();
    for (const error of this.errors) {
      const existing = grouped.get(error.path) || [];
      existing.push(error);
      grouped.set(error.path, existing);
    }
    return grouped;
  }

  /**
   * Get total error count
   */
  get errorCount(): number {
    return this.errors.length;
  }

  /**
   * Generate recovery suggestions based on error patterns
   */
  private generateRecoverySuggestions(): RecoverySuggestion[] {
    const suggestions: RecoverySuggestion[] = [];

    for (const error of this.errors) {
      // Type mismatch
      if (error.keyword === 'type' && error.expected) {
        suggestions.push({
          action: `Convert value at ${error.path} to ${error.expected}`,
          confidence: 0.9,
          path: error.path,
        });
      }

      // Pattern mismatch
      if (error.keyword === 'pattern') {
        suggestions.push({
          action: `Ensure value at ${error.path} matches the required pattern`,
          confidence: 0.7,
          path: error.path,
          suggestedValue: error.suggestion,
        });
      }

      // Missing required field
      if (error.keyword === 'required') {
        suggestions.push({
          action: `Add required field ${error.path}`,
          confidence: 0.95,
          path: error.path,
        });
      }

      // Enum violation
      if (error.keyword === 'enum' && error.expected) {
        suggestions.push({
          action: `Use one of the allowed values: ${error.expected}`,
          confidence: 0.9,
          path: error.path,
        });
      }

      // Range violations
      if (error.keyword === 'minimum' || error.keyword === 'maximum') {
        suggestions.push({
          action: `Adjust value at ${error.path} to be within allowed range`,
          confidence: 0.85,
          path: error.path,
        });
      }
    }

    return suggestions;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      schemaId: this.schemaId,
      errorCount: this.errorCount,
      errors: this.errors,
      recoverySuggestions: this.recoverySuggestions,
    };
  }
}

/**
 * Semantic/business rule validation failed
 */
export class SemanticValidationError extends ConstrainedDecoderError {
  constructor(
    message: string,
    public readonly rule: string,
    public readonly errors: ValidationErrorDetail[],
    public readonly autoCorrections: Array<{
      path: string;
      from: unknown;
      to: unknown;
      reason: string;
    }> = [],
    cause?: Error
  ) {
    super(message, cause);
  }

  /**
   * Check if any auto-corrections were applied
   */
  get hasAutoCorrections(): boolean {
    return this.autoCorrections.length > 0;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      rule: this.rule,
      errors: this.errors,
      autoCorrections: this.autoCorrections,
    };
  }
}

/**
 * JSON parsing/decoding failed
 */
export class DecodingError extends ConstrainedDecoderError {
  constructor(
    message: string,
    public readonly rawInput: string,
    public readonly parsePosition?: number,
    cause?: Error
  ) {
    super(message, cause);
  }

  /**
   * Get snippet around parse error position
   */
  getErrorContext(contextLength: number = 50): string {
    if (this.parsePosition === undefined) {
      return this.rawInput.substring(0, contextLength);
    }

    const start = Math.max(0, this.parsePosition - contextLength / 2);
    const end = Math.min(this.rawInput.length, this.parsePosition + contextLength / 2);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < this.rawInput.length ? '...' : '';

    return `${prefix}${this.rawInput.substring(start, end)}${suffix}`;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      rawInputLength: this.rawInput.length,
      parsePosition: this.parsePosition,
      errorContext: this.getErrorContext(),
    };
  }
}

/**
 * Schema registration or compilation failed
 */
export class SchemaRegistrationError extends ConstrainedDecoderError {
  constructor(
    message: string,
    public readonly schemaId: string,
    public readonly schemaPath?: string,
    cause?: Error
  ) {
    super(message, cause);
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      schemaId: this.schemaId,
      schemaPath: this.schemaPath,
    };
  }
}

/**
 * Custom validation hook threw an error
 */
export class ValidationHookError extends ConstrainedDecoderError {
  constructor(
    message: string,
    public readonly hookName: string,
    public readonly phase:
      | 'pre-validation'
      | 'post-schema'
      | 'post-semantic'
      | 'post-validation'
      | 'transform',
    cause?: Error
  ) {
    super(message, cause);
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      hookName: this.hookName,
      phase: this.phase,
    };
  }
}
