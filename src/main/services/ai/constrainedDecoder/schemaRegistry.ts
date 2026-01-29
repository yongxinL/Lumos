/**
 * Schema Registry for Constrained JSON Decoding
 *
 * Manages JSON Schema registration, compilation, and caching:
 * - Schema registration with ID and metadata
 * - Compilation with custom keywords
 * - Caching for performance
 * - Schema versioning and updates
 * - Schema introspection
 */

import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { SchemaRegistrationError, type ValidationErrorDetail } from './errors';
import { registerCustomKeywords } from './customKeywords';

/**
 * Schema metadata
 */
export interface SchemaMetadata {
  /** Unique schema identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Schema description */
  description: string;
  /** Schema version */
  version: string;
  /** When schema was registered */
  registeredAt: string;
  /** When schema was last updated */
  updatedAt: string;
  /** Schema categories/tags */
  tags: string[];
  /** Whether this schema is for Ollama constrained decoding */
  ollamaCompatible: boolean;
}

/**
 * Registered schema entry
 */
interface SchemaEntry {
  /** The JSON Schema */
  schema: Record<string, unknown>;
  /** Compiled validator */
  validator: ValidateFunction;
  /** Schema metadata */
  metadata: SchemaMetadata;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors if any */
  errors: ValidationErrorDetail[];
  /** Schema ID used for validation */
  schemaId: string;
  /** Validation duration in milliseconds */
  durationMs: number;
}

/**
 * Schema Registry Options
 */
export interface SchemaRegistryOptions {
  /** Enable strict mode in AJV */
  strict?: boolean;
  /** Collect all errors (not just first) */
  allErrors?: boolean;
  /** Use defaults from schema */
  useDefaults?: boolean;
  /** Coerce types */
  coerceTypes?: boolean;
  /** Remove additional properties */
  removeAdditional?: boolean;
  /** Enable custom keywords */
  enableCustomKeywords?: boolean;
  /** Enable format validation */
  enableFormats?: boolean;
}

const DEFAULT_OPTIONS: SchemaRegistryOptions = {
  strict: false,
  allErrors: true,
  useDefaults: false,
  coerceTypes: false,
  removeAdditional: false,
  enableCustomKeywords: true,
  enableFormats: true,
};

/**
 * Schema Registry
 *
 * Centralized management of JSON Schemas for constrained decoding
 */
export class SchemaRegistry {
  private ajv: Ajv;
  private schemas: Map<string, SchemaEntry> = new Map();
  private options: SchemaRegistryOptions;

  constructor(options?: SchemaRegistryOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Initialize AJV with options
    this.ajv = new Ajv({
      strict: this.options.strict,
      allErrors: this.options.allErrors,
      useDefaults: this.options.useDefaults,
      coerceTypes: this.options.coerceTypes,
      removeAdditional: this.options.removeAdditional,
    });

    // Add format validators
    if (this.options.enableFormats) {
      addFormats(this.ajv);
    }

    // Register custom keywords
    if (this.options.enableCustomKeywords) {
      registerCustomKeywords(this.ajv);
    }
  }

  /**
   * Register a new schema
   */
  register(
    schema: Record<string, unknown>,
    metadata: Omit<SchemaMetadata, 'registeredAt' | 'updatedAt'>
  ): void {
    const now = new Date().toISOString();

    // Check if schema already exists
    if (this.schemas.has(metadata.id)) {
      throw new SchemaRegistrationError(
        `Schema with id '${metadata.id}' already registered. Use update() to modify.`,
        metadata.id
      );
    }

    // Compile schema
    let validator: ValidateFunction;
    try {
      validator = this.ajv.compile(schema);
    } catch (error) {
      throw new SchemaRegistrationError(
        `Failed to compile schema '${metadata.id}': ${error instanceof Error ? error.message : String(error)}`,
        metadata.id,
        undefined,
        error instanceof Error ? error : undefined
      );
    }

    // Store entry
    this.schemas.set(metadata.id, {
      schema,
      validator,
      metadata: {
        ...metadata,
        registeredAt: now,
        updatedAt: now,
      },
    });
  }

  /**
   * Update an existing schema
   */
  update(schemaId: string, schema: Record<string, unknown>, newVersion?: string): void {
    const existing = this.schemas.get(schemaId);
    if (!existing) {
      throw new SchemaRegistrationError(
        `Schema '${schemaId}' not found. Use register() to create.`,
        schemaId
      );
    }

    // Compile new schema
    let validator: ValidateFunction;
    try {
      validator = this.ajv.compile(schema);
    } catch (error) {
      throw new SchemaRegistrationError(
        `Failed to compile updated schema '${schemaId}': ${error instanceof Error ? error.message : String(error)}`,
        schemaId,
        undefined,
        error instanceof Error ? error : undefined
      );
    }

    // Update entry
    this.schemas.set(schemaId, {
      schema,
      validator,
      metadata: {
        ...existing.metadata,
        version: newVersion || existing.metadata.version,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Unregister a schema
   */
  unregister(schemaId: string): boolean {
    return this.schemas.delete(schemaId);
  }

  /**
   * Check if schema is registered
   */
  has(schemaId: string): boolean {
    return this.schemas.has(schemaId);
  }

  /**
   * Get schema by ID
   */
  getSchema(schemaId: string): Record<string, unknown> | undefined {
    return this.schemas.get(schemaId)?.schema;
  }

  /**
   * Get schema metadata
   */
  getMetadata(schemaId: string): SchemaMetadata | undefined {
    return this.schemas.get(schemaId)?.metadata;
  }

  /**
   * Get all registered schema IDs
   */
  getAllSchemaIds(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Get schemas by tag
   */
  getSchemasByTag(tag: string): SchemaMetadata[] {
    return Array.from(this.schemas.values())
      .filter((entry) => entry.metadata.tags.includes(tag))
      .map((entry) => entry.metadata);
  }

  /**
   * Get Ollama-compatible schemas
   */
  getOllamaCompatibleSchemas(): SchemaMetadata[] {
    return Array.from(this.schemas.values())
      .filter((entry) => entry.metadata.ollamaCompatible)
      .map((entry) => entry.metadata);
  }

  /**
   * Validate data against a schema
   */
  validate(schemaId: string, data: unknown): SchemaValidationResult {
    const startTime = Date.now();

    const entry = this.schemas.get(schemaId);
    if (!entry) {
      throw new SchemaRegistrationError(`Schema '${schemaId}' not found`, schemaId);
    }

    const valid = entry.validator(data);
    const errors = this.mapAjvErrors(entry.validator.errors || []);

    return {
      valid,
      errors,
      schemaId,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Get the compiled validator function for a schema
   */
  getValidator(schemaId: string): ValidateFunction | undefined {
    return this.schemas.get(schemaId)?.validator;
  }

  /**
   * Get schema as JSON string (for Ollama format parameter)
   */
  getSchemaAsJson(schemaId: string): string {
    const schema = this.getSchema(schemaId);
    if (!schema) {
      throw new SchemaRegistrationError(`Schema '${schemaId}' not found`, schemaId);
    }
    return JSON.stringify(schema);
  }

  /**
   * Create a stripped schema for Ollama constrained decoding
   * Removes AJV-specific keywords and custom keywords
   */
  getOllamaSchema(schemaId: string): Record<string, unknown> {
    const schema = this.getSchema(schemaId);
    if (!schema) {
      throw new SchemaRegistrationError(`Schema '${schemaId}' not found`, schemaId);
    }

    return this.stripNonOllamaKeywords(schema);
  }

  /**
   * Get schema statistics
   */
  getStats(): {
    totalSchemas: number;
    ollamaCompatible: number;
    byTag: Record<string, number>;
  } {
    const entries = Array.from(this.schemas.values());
    const byTag: Record<string, number> = {};

    for (const entry of entries) {
      for (const tag of entry.metadata.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }
    }

    return {
      totalSchemas: this.schemas.size,
      ollamaCompatible: entries.filter((e) => e.metadata.ollamaCompatible).length,
      byTag,
    };
  }

  /**
   * Clear all schemas
   */
  clear(): void {
    this.schemas.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Map AJV errors to ValidationErrorDetail format
   */
  private mapAjvErrors(errors: ErrorObject[]): ValidationErrorDetail[] {
    return errors.map((err) => {
      const detail: ValidationErrorDetail = {
        path: err.instancePath || '/',
        message: err.message || 'Validation error',
        keyword: err.keyword,
      };

      // Add expected value for relevant keywords
      if (err.keyword === 'type' && err.params && 'type' in err.params) {
        detail.expected = String(err.params.type);
      } else if (err.keyword === 'enum' && err.params && 'allowedValues' in err.params) {
        detail.expected = (err.params.allowedValues as unknown[]).join(', ');
      } else if (err.keyword === 'pattern' && err.params && 'pattern' in err.params) {
        detail.expected = String(err.params.pattern);
      } else if (err.keyword === 'minimum' && err.params && 'limit' in err.params) {
        detail.expected = `>= ${err.params.limit}`;
      } else if (err.keyword === 'maximum' && err.params && 'limit' in err.params) {
        detail.expected = `<= ${err.params.limit}`;
      }

      // Add actual value if available (be careful with sensitive data)
      if (err.data !== undefined) {
        const dataStr =
          typeof err.data === 'object' ? '[object]' : String(err.data).substring(0, 50);
        detail.actual = dataStr;
      }

      return detail;
    });
  }

  /**
   * Remove custom keywords that Ollama doesn't understand
   */
  private stripNonOllamaKeywords(schema: Record<string, unknown>): Record<string, unknown> {
    const customKeywords = [
      'crossFieldDependency',
      'operationConstraint',
      'conditionalRequired',
      'semanticPattern',
      'riskAlignment',
      'confidenceRange',
      'entityReference',
    ];

    const stripped: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(schema)) {
      // Skip custom keywords
      if (customKeywords.includes(key)) {
        continue;
      }

      // Recursively strip from nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        stripped[key] = this.stripNonOllamaKeywords(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        stripped[key] = value.map((item) =>
          item && typeof item === 'object'
            ? this.stripNonOllamaKeywords(item as Record<string, unknown>)
            : item
        );
      } else {
        stripped[key] = value;
      }
    }

    return stripped;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let schemaRegistryInstance: SchemaRegistry | null = null;

/**
 * Get the global schema registry instance
 */
export function getSchemaRegistry(options?: SchemaRegistryOptions): SchemaRegistry {
  if (!schemaRegistryInstance) {
    schemaRegistryInstance = new SchemaRegistry(options);
  }
  return schemaRegistryInstance;
}

/**
 * Reset the global schema registry (primarily for testing)
 */
export function resetSchemaRegistry(): void {
  schemaRegistryInstance = null;
}
