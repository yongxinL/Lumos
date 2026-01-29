/**
 * Storage layer error types
 *
 * Specific error classes for database and filesystem operations.
 */

/**
 * Base storage error
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'StorageError';
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Database connection error
 */
export class DatabaseConnectionError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'DatabaseConnectionError';
  }
}

/**
 * Query execution error
 */
export class QueryError extends StorageError {
  constructor(
    message: string,
    public readonly query?: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'QueryError';
  }
}

/**
 * Data validation error
 */
export class ValidationError extends StorageError {
  constructor(
    message: string,
    public readonly errors?: unknown[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Skill YAML validation error
 */
export class SkillValidationError extends ValidationError {
  constructor(
    public readonly filename: string,
    errors: unknown[]
  ) {
    super(`Skill validation failed for ${filename}`, errors);
    this.name = 'SkillValidationError';
  }
}

/**
 * Policy YAML validation error
 */
export class PolicyValidationError extends ValidationError {
  constructor(
    public readonly filename: string,
    errors: unknown[]
  ) {
    super(`Policy validation failed for ${filename}`, errors);
    this.name = 'PolicyValidationError';
  }
}

/**
 * Entity not found error
 */
export class EntityNotFoundError extends StorageError {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string
  ) {
    super(`${entityType} with id '${entityId}' not found`);
    this.name = 'EntityNotFoundError';
  }
}

/**
 * Duplicate entity error (unique constraint violation)
 */
export class DuplicateEntityError extends StorageError {
  constructor(
    public readonly entityType: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(`${entityType} with ${field}='${value}' already exists`);
    this.name = 'DuplicateEntityError';
  }
}

/**
 * Transaction error
 */
export class TransactionError extends StorageError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'TransactionError';
  }
}
