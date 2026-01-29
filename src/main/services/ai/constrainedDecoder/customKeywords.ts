/**
 * Custom AJV Keywords for Constrained JSON Decoding
 *
 * Extends AJV with domain-specific validation keywords that enable:
 * - Cross-field dependency validation
 * - Operation-based constraint enforcement
 * - Conditional required fields
 * - Risk-based validation rules
 * - Semantic pattern validation
 *
 * These keywords allow JSON Schemas to express complex business rules
 * that go beyond standard JSON Schema capabilities.
 */

import type Ajv from 'ajv';

// AJV keyword definitions require complex typing that doesn't play well with TypeScript strict mode
// Using 'any' for schema and data parameters is standard practice for custom AJV keywords

/**
 * Cross-field dependency definition
 * Validates that when a field matches a condition, other fields must have specific values
 */
export interface CrossFieldDependency {
  /** Field that triggers the dependency */
  when: {
    /** Path to the field (e.g., "operation") */
    field: string;
    /** Condition type */
    condition: 'equals' | 'contains' | 'matches' | 'oneOf';
    /** Value(s) to match */
    value: string | string[] | RegExp;
  };
  /** Fields that must satisfy conditions when trigger is matched */
  then: Array<{
    /** Path to dependent field */
    field: string;
    /** Expected value or constraint */
    constraint:
      | { equals: unknown }
      | { oneOf: unknown[] }
      | { notEquals: unknown }
      | { greaterThan: number }
      | { lessThan: number }
      | { matches: string };
    /** Error message if constraint fails */
    message?: string;
  }>;
}

/**
 * Operation-based validation rule
 * Maps operation patterns to required constraints
 */
export interface OperationConstraint {
  /** Operation pattern (regex string) */
  pattern: string;
  /** Constraints to apply when pattern matches */
  constraints: {
    risk_level?: 'low' | 'medium' | 'high' | Array<'low' | 'medium' | 'high'>;
    reversibility?: string | string[];
    requires_confirmation?: boolean;
    data_classification?: string | string[];
  };
}

/**
 * Register all custom keywords with an AJV instance
 */
export function registerCustomKeywords(ajv: Ajv): void {
  // Cross-field dependency keyword
  ajv.addKeyword(crossFieldDependencyKeyword as any);

  // Operation constraint keyword
  ajv.addKeyword(operationConstraintKeyword as any);

  // Conditional required keyword
  ajv.addKeyword(conditionalRequiredKeyword as any);

  // Semantic pattern keyword (enhanced pattern matching)
  ajv.addKeyword(semanticPatternKeyword as any);

  // Risk alignment keyword
  ajv.addKeyword(riskAlignmentKeyword as any);

  // Confidence range keyword
  ajv.addKeyword(confidenceRangeKeyword as any);

  // Entity reference validation keyword
  ajv.addKeyword(entityReferenceKeyword as any);
}

/**
 * crossFieldDependency keyword
 * Validates cross-field dependencies based on conditions
 *
 * Usage in schema:
 * {
 *   "crossFieldDependency": {
 *     "when": { "field": "operation", "condition": "contains", "value": "delete" },
 *     "then": [
 *       { "field": "risk_level", "constraint": { "equals": "high" } },
 *       { "field": "requires_confirmation", "constraint": { "equals": true } }
 *     ]
 *   }
 * }
 */
const crossFieldDependencyKeyword = {
  keyword: 'crossFieldDependency',
  type: 'object',
  schemaType: 'object',
  validate: function validateCrossFieldDependency(schema: any, data: any): boolean {
    if (typeof data !== 'object' || data === null) return true;
    const { when, then } = schema as CrossFieldDependency;
    const triggerValue = getNestedValue(data, when.field);

    // Check if trigger condition is met
    if (!matchesCondition(triggerValue, when.condition, when.value)) {
      return true; // Dependency not triggered, validation passes
    }

    // Validate all dependent fields
    const errors: Array<{ path: string; message: string }> = [];

    for (const dep of then) {
      const depValue = getNestedValue(data, dep.field);
      const valid = satisfiesConstraint(depValue, dep.constraint);

      if (!valid) {
        const message =
          dep.message ||
          `Field '${dep.field}' does not satisfy constraint when '${when.field}' ${when.condition} '${when.value}'`;
        errors.push({ path: dep.field, message });
      }
    }

    if (errors.length > 0) {
      // Store errors for later retrieval
      (validateCrossFieldDependency as any).errors = errors.map((e) => ({
        keyword: 'crossFieldDependency',
        instancePath: `/${e.path}`,
        schemaPath: '#/crossFieldDependency',
        params: { dependency: schema },
        message: e.message,
      }));
      return false;
    }

    return true;
  },
  errors: true,
};

/**
 * operationConstraint keyword
 * Validates constraints based on operation type patterns
 *
 * Usage in schema:
 * {
 *   "operationConstraint": [
 *     { "pattern": ".*:delete$", "constraints": { "risk_level": "high", "requires_confirmation": true } },
 *     { "pattern": ".*:read$", "constraints": { "risk_level": "low", "requires_confirmation": false } }
 *   ]
 * }
 */
const operationConstraintKeyword = {
  keyword: 'operationConstraint',
  type: 'object',
  schemaType: 'array',
  validate: function validateOperationConstraint(schema: any, data: any): boolean {
    if (typeof data !== 'object' || data === null) return true;
    const constraints = schema as OperationConstraint[];
    const operation = data.operation;
    if (typeof operation !== 'string') {
      return true; // Let other validators handle type errors
    }

    const errors: Array<{ path: string; message: string }> = [];

    for (const rule of constraints) {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(operation)) {
        continue; // Pattern doesn't match, skip
      }

      // Check all constraints for matching pattern
      for (const [field, expected] of Object.entries(rule.constraints)) {
        const actual = data[field];
        const valid = Array.isArray(expected)
          ? (expected as unknown[]).includes(actual)
          : actual === expected;

        if (!valid) {
          errors.push({
            path: field,
            message: `Operation '${operation}' requires '${field}' to be ${Array.isArray(expected) ? `one of [${expected.join(', ')}]` : String(expected)}, got '${String(actual)}'`,
          });
        }
      }
    }

    if (errors.length > 0) {
      (validateOperationConstraint as any).errors = errors.map((e) => ({
        keyword: 'operationConstraint',
        instancePath: `/${e.path}`,
        schemaPath: '#/operationConstraint',
        params: { constraints },
        message: e.message,
      }));
      return false;
    }

    return true;
  },
  errors: true,
};

/**
 * conditionalRequired keyword
 * Makes fields required based on other field values
 *
 * Usage in schema:
 * {
 *   "conditionalRequired": {
 *     "if": { "field": "risk_level", "equals": "high" },
 *     "then": ["requires_confirmation", "rollback_plan"]
 *   }
 * }
 */
const conditionalRequiredKeyword = {
  keyword: 'conditionalRequired',
  type: 'object',
  schemaType: 'object',
  validate: function validateConditionalRequired(schema: any, data: any): boolean {
    if (typeof data !== 'object' || data === null) return true;
    const s = schema as {
      if: { field: string; equals?: unknown; matches?: string };
      then: string[];
    };
    const conditionField = s.if.field;
    const conditionValue = data[conditionField];

    // Check if condition is met
    let conditionMet = false;
    if (s.if.equals !== undefined) {
      conditionMet = conditionValue === s.if.equals;
    } else if (s.if.matches !== undefined) {
      conditionMet =
        typeof conditionValue === 'string' && new RegExp(s.if.matches).test(conditionValue);
    }

    if (!conditionMet) {
      return true; // Condition not met, validation passes
    }

    // Check required fields
    const missingFields = s.then.filter(
      (field) => data[field] === undefined || data[field] === null
    );

    if (missingFields.length > 0) {
      (validateConditionalRequired as any).errors = missingFields.map((field) => ({
        keyword: 'conditionalRequired',
        instancePath: `/${field}`,
        schemaPath: '#/conditionalRequired',
        params: { requiredField: field, condition: s.if },
        message: `Field '${field}' is required when '${conditionField}' is ${s.if.equals ?? `matches ${s.if.matches}`}`,
      }));
      return false;
    }

    return true;
  },
  errors: true,
};

/**
 * semanticPattern keyword
 * Enhanced pattern matching with named capture groups and semantic validation
 *
 * Usage in schema:
 * {
 *   "semanticPattern": {
 *     "pattern": "^(?<module>[a-z_]+):(?<action>[a-z_]+)$",
 *     "groups": {
 *       "module": { "allowedValues": ["incident", "calendar", "task", "file", "note"] },
 *       "action": { "allowedValues": ["create", "read", "update", "delete", "list"] }
 *     }
 *   }
 * }
 */
const semanticPatternKeyword = {
  keyword: 'semanticPattern',
  type: 'string',
  schemaType: 'object',
  validate: function validateSemanticPattern(schema: any, data: any): boolean {
    const s = schema as {
      pattern: string;
      groups?: Record<string, { allowedValues?: string[]; minLength?: number; maxLength?: number }>;
      caseSensitive?: boolean;
    };
    if (typeof data !== 'string') {
      return true; // Let type validator handle this
    }

    const flags = s.caseSensitive === false ? 'i' : '';
    const regex = new RegExp(s.pattern, flags);
    const match = data.match(regex);

    if (!match) {
      (validateSemanticPattern as any).errors = [
        {
          keyword: 'semanticPattern',
          instancePath: '',
          schemaPath: '#/semanticPattern',
          params: { pattern: s.pattern },
          message: `Value does not match semantic pattern: ${s.pattern}`,
        },
      ];
      return false;
    }

    // Validate capture groups if defined
    if (s.groups && match.groups) {
      const errors: Array<{ message: string }> = [];

      for (const [groupName, constraints] of Object.entries(s.groups)) {
        const groupValue = match.groups[groupName];
        if (!groupValue) continue;

        if (constraints.allowedValues && !constraints.allowedValues.includes(groupValue)) {
          errors.push({
            message: `Capture group '${groupName}' value '${groupValue}' not in allowed values: [${constraints.allowedValues.join(', ')}]`,
          });
        }

        if (constraints.minLength && groupValue.length < constraints.minLength) {
          errors.push({
            message: `Capture group '${groupName}' must be at least ${constraints.minLength} characters`,
          });
        }

        if (constraints.maxLength && groupValue.length > constraints.maxLength) {
          errors.push({
            message: `Capture group '${groupName}' must be at most ${constraints.maxLength} characters`,
          });
        }
      }

      if (errors.length > 0) {
        (validateSemanticPattern as any).errors = errors.map((e) => ({
          keyword: 'semanticPattern',
          instancePath: '',
          schemaPath: '#/semanticPattern',
          params: { pattern: s.pattern },
          message: e.message,
        }));
        return false;
      }
    }

    return true;
  },
  errors: true,
};

/**
 * riskAlignment keyword
 * Validates that risk_level aligns with operation characteristics
 *
 * Usage in schema:
 * {
 *   "riskAlignment": {
 *     "operationField": "operation",
 *     "riskField": "risk_level",
 *     "rules": {
 *       "delete": "high",
 *       "create": ["medium", "high"],
 *       "read": "low"
 *     }
 *   }
 * }
 */
const riskAlignmentKeyword = {
  keyword: 'riskAlignment',
  type: 'object',
  schemaType: 'object',
  validate: function validateRiskAlignment(schema: any, data: any): boolean {
    if (typeof data !== 'object' || data === null) return true;
    const s = schema as {
      operationField: string;
      riskField: string;
      rules: Record<string, string | string[]>;
    };
    const operation = data[s.operationField];
    const risk = data[s.riskField];

    if (typeof operation !== 'string' || typeof risk !== 'string') {
      return true; // Let type validators handle this
    }

    // Find matching rule
    for (const [keyword, expectedRisk] of Object.entries(s.rules)) {
      if (operation.includes(keyword)) {
        const valid = Array.isArray(expectedRisk)
          ? expectedRisk.includes(risk)
          : risk === expectedRisk;

        if (!valid) {
          (validateRiskAlignment as any).errors = [
            {
              keyword: 'riskAlignment',
              instancePath: `/${s.riskField}`,
              schemaPath: '#/riskAlignment',
              params: { operation, expectedRisk, actualRisk: risk },
              message: `Operation '${operation}' (contains '${keyword}') requires risk_level to be ${Array.isArray(expectedRisk) ? `one of [${expectedRisk.join(', ')}]` : expectedRisk}, got '${risk}'`,
            },
          ];
          return false;
        }
      }
    }

    return true;
  },
  errors: true,
};

/**
 * confidenceRange keyword
 * Validates confidence scores with context-aware thresholds
 *
 * Usage in schema:
 * {
 *   "confidenceRange": {
 *     "field": "confidence",
 *     "min": 0,
 *     "max": 1,
 *     "warningThreshold": 0.5,
 *     "contextField": "risk_level",
 *     "contextRules": {
 *       "high": { "min": 0.8 }
 *     }
 *   }
 * }
 */
const confidenceRangeKeyword = {
  keyword: 'confidenceRange',
  type: 'object',
  schemaType: 'object',
  validate: function validateConfidenceRange(schema: any, data: any): boolean {
    if (typeof data !== 'object' || data === null) return true;
    const s = schema as {
      field: string;
      min: number;
      max: number;
      warningThreshold?: number;
      contextField?: string;
      contextRules?: Record<string, { min?: number; max?: number }>;
    };
    const confidence = data[s.field];

    if (typeof confidence !== 'number') {
      return true; // Let type validator handle this
    }

    // Check base range
    if (confidence < s.min || confidence > s.max) {
      (validateConfidenceRange as any).errors = [
        {
          keyword: 'confidenceRange',
          instancePath: `/${s.field}`,
          schemaPath: '#/confidenceRange',
          params: { min: s.min, max: s.max, actual: confidence },
          message: `Confidence ${confidence} is out of range [${s.min}, ${s.max}]`,
        },
      ];
      return false;
    }

    // Check context-aware rules
    if (s.contextField && s.contextRules) {
      const context = data[s.contextField];
      if (typeof context === 'string' && s.contextRules[context]) {
        const contextRule = s.contextRules[context];

        if (contextRule.min !== undefined && confidence < contextRule.min) {
          (validateConfidenceRange as any).errors = [
            {
              keyword: 'confidenceRange',
              instancePath: `/${s.field}`,
              schemaPath: '#/confidenceRange',
              params: { min: contextRule.min, actual: confidence, context },
              message: `Confidence ${confidence} is below minimum ${contextRule.min} for ${s.contextField}='${context}'`,
            },
          ];
          return false;
        }

        if (contextRule.max !== undefined && confidence > contextRule.max) {
          (validateConfidenceRange as any).errors = [
            {
              keyword: 'confidenceRange',
              instancePath: `/${s.field}`,
              schemaPath: '#/confidenceRange',
              params: { max: contextRule.max, actual: confidence, context },
              message: `Confidence ${confidence} is above maximum ${contextRule.max} for ${s.contextField}='${context}'`,
            },
          ];
          return false;
        }
      }
    }

    return true;
  },
  errors: true,
};

/**
 * entityReference keyword
 * Validates EntityReference structure with type-specific constraints
 *
 * Usage in schema:
 * {
 *   "entityReference": {
 *     "nullable": true,
 *     "typeConstraints": {
 *       "incident": { "idPattern": "^INC[0-9]{7}$" },
 *       "task": { "idPattern": "^TASK[0-9]{7}$" }
 *     }
 *   }
 * }
 */
const entityReferenceKeyword = {
  keyword: 'entityReference',
  schemaType: 'object',
  validate: function validateEntityReference(schema: any, data: any): boolean {
    const s = schema as {
      nullable?: boolean;
      typeConstraints?: Record<string, { idPattern?: string; requiredFields?: string[] }>;
    };
    // Handle null case
    if (data === null) {
      return s.nullable !== false;
    }

    // Must be an object
    if (typeof data !== 'object' || Array.isArray(data)) {
      (validateEntityReference as any).errors = [
        {
          keyword: 'entityReference',
          instancePath: '',
          schemaPath: '#/entityReference',
          params: {},
          message: 'Entity reference must be an object or null',
        },
      ];
      return false;
    }

    const entity = data as Record<string, unknown>;

    // Check required base fields
    const requiredFields = ['type', 'id', 'source'];
    const missingFields = requiredFields.filter((f) => !entity[f] || typeof entity[f] !== 'string');

    if (missingFields.length > 0) {
      (validateEntityReference as any).errors = [
        {
          keyword: 'entityReference',
          instancePath: '',
          schemaPath: '#/entityReference',
          params: { missingFields },
          message: `Entity reference missing required fields: ${missingFields.join(', ')}`,
        },
      ];
      return false;
    }

    // Check type-specific constraints
    if (s.typeConstraints && typeof entity.type === 'string') {
      const typeConstraint = s.typeConstraints[entity.type];
      if (typeConstraint) {
        if (
          typeConstraint.idPattern &&
          typeof entity.id === 'string' &&
          !new RegExp(typeConstraint.idPattern).test(entity.id)
        ) {
          (validateEntityReference as any).errors = [
            {
              keyword: 'entityReference',
              instancePath: '/id',
              schemaPath: '#/entityReference',
              params: { pattern: typeConstraint.idPattern, entityType: entity.type },
              message: `Entity ID for type '${entity.type}' must match pattern: ${typeConstraint.idPattern}`,
            },
          ];
          return false;
        }

        if (typeConstraint.requiredFields) {
          const missing = typeConstraint.requiredFields.filter((f) => !entity[f]);
          if (missing.length > 0) {
            (validateEntityReference as any).errors = [
              {
                keyword: 'entityReference',
                instancePath: '',
                schemaPath: '#/entityReference',
                params: { entityType: entity.type, missingFields: missing },
                message: `Entity type '${entity.type}' requires additional fields: ${missing.join(', ')}`,
              },
            ];
            return false;
          }
        }
      }
    }

    return true;
  },
  errors: true,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get nested value from object using dot-notation path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Check if value matches a condition
 */
function matchesCondition(
  value: unknown,
  condition: 'equals' | 'contains' | 'matches' | 'oneOf',
  expected: string | string[] | RegExp
): boolean {
  switch (condition) {
    case 'equals':
      return value === expected;
    case 'contains':
      return typeof value === 'string' && value.includes(expected as string);
    case 'matches':
      if (typeof value !== 'string') return false;
      if (expected instanceof RegExp) return expected.test(value);
      return new RegExp(expected as string).test(value);
    case 'oneOf':
      return Array.isArray(expected) && expected.includes(value as string);
    default:
      return false;
  }
}

/**
 * Check if value satisfies a constraint
 */
function satisfiesConstraint(
  value: unknown,
  constraint:
    | { equals: unknown }
    | { oneOf: unknown[] }
    | { notEquals: unknown }
    | { greaterThan: number }
    | { lessThan: number }
    | { matches: string }
): boolean {
  if ('equals' in constraint) {
    return value === constraint.equals;
  }
  if ('oneOf' in constraint) {
    return constraint.oneOf.includes(value);
  }
  if ('notEquals' in constraint) {
    return value !== constraint.notEquals;
  }
  if ('greaterThan' in constraint) {
    return typeof value === 'number' && value > constraint.greaterThan;
  }
  if ('lessThan' in constraint) {
    return typeof value === 'number' && value < constraint.lessThan;
  }
  if ('matches' in constraint) {
    return typeof value === 'string' && new RegExp(constraint.matches).test(value);
  }
  return true;
}
