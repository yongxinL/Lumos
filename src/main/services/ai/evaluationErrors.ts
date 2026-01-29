/**
 * Evaluation LLM Service Error Classes
 *
 * Custom error types for evaluation service failures.
 * Provides structured error handling and debugging information.
 *
 * Error Hierarchy:
 * - EvaluationError (base class)
 *   - EvaluationModelNotFoundError
 *   - EvaluationValidationError
 *   - EvaluationTimeoutError
 *   - EvaluationRetryExhaustedError
 */

/**
 * Base error class for Evaluation LLM Service
 */
export class EvaluationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);

    // Preserve original stack trace if cause exists
    if (cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Model not found or not available
 */
export class EvaluationModelNotFoundError extends EvaluationError {
  constructor(
    public readonly modelName: string,
    cause?: Error
  ) {
    super(`Evaluation model '${modelName}' not found or not available`, cause);
  }
}

/**
 * JSON validation failed (schema or business rules)
 */
export class EvaluationValidationError extends EvaluationError {
  constructor(
    message: string,
    public readonly validationErrors: string[] = [],
    cause?: Error
  ) {
    super(message, cause);
  }
}

/**
 * Evaluation timeout exceeded
 */
export class EvaluationTimeoutError extends EvaluationError {
  constructor(
    public readonly timeoutMs: number,
    cause?: Error
  ) {
    super(`Evaluation exceeded timeout of ${timeoutMs}ms`, cause);
  }
}

/**
 * All retries exhausted without success
 */
export class EvaluationRetryExhaustedError extends EvaluationError {
  constructor(
    public readonly attempts: number,
    cause?: Error
  ) {
    super(`Evaluation failed after ${attempts} retry attempts`, cause);
  }
}
