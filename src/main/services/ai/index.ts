/**
 * AI Services Module
 *
 * Barrel export for all AI-related services and utilities.
 */

export { OllamaClient, getOllamaClient, resetOllamaClient } from './ollamaClient';
export {
  OllamaError,
  OllamaConnectionError,
  OllamaTimeoutError,
  OllamaModelNotFoundError,
  OllamaAPIError,
  OllamaInvalidResponseError,
} from './ollamaErrors';
export {
  EvaluationLLMService,
  getEvaluationLlmService,
  resetEvaluationLlmService,
  type ProposalGenerationInput,
  type EvaluationLLMConfig,
} from './evaluationLlmService';
export {
  EvaluationError,
  EvaluationModelNotFoundError,
  EvaluationValidationError,
  EvaluationTimeoutError,
  EvaluationRetryExhaustedError,
} from './evaluationErrors';

// Constrained JSON Decoder
export {
  // Main decoder
  ConstrainedJsonDecoder,
  createActionProposalDecoder,
  createEnhancedActionProposalDecoder,
  getActionProposalDecoder,
  resetActionProposalDecoder,
  ACTION_PROPOSAL_SCHEMA_ID,
  ENHANCED_ACTION_PROPOSAL_SCHEMA_ID,
  ENHANCED_ACTION_PROPOSAL_SCHEMA,
  type DecodeOptions,
  type DecodeResult,
  type DecoderConfig,
  // Schema registry
  SchemaRegistry,
  getSchemaRegistry,
  resetSchemaRegistry,
  type SchemaMetadata,
  type SchemaRegistryOptions,
  type SchemaValidationResult,
  // Semantic validator
  SemanticValidator,
  createActionProposalValidator,
  createActionProposalRules,
  type SemanticRule,
  type SemanticValidationResult,
  type CorrectionRecord,
  // Validation hooks
  ValidationHooksManager,
  createActionProposalHooksManager,
  createActionProposalHooks,
  type ValidationHook,
  type SyncValidationHook,
  type AsyncValidationHook,
  type HookContext,
  type HookPhase,
  type HookExecutionResult,
  // Custom keywords
  registerCustomKeywords,
  type CrossFieldDependency,
  type OperationConstraint,
  // Errors
  ConstrainedDecoderError,
  SchemaValidationError,
  SemanticValidationError,
  DecodingError,
  SchemaRegistrationError,
  ValidationHookError,
  type ValidationErrorDetail,
  type RecoverySuggestion,
} from './constrainedDecoder';

// AI Provider Interface
export type { IAIProvider, ProviderFactory, ProviderRegistration } from './providers';
export {
  AIProviderError,
  ProviderConnectionError,
  ProviderTimeoutError,
  ProviderModelNotFoundError,
  ProviderAPIError,
  ProviderInvalidResponseError,
  ProviderUnsupportedFeatureError,
  ProviderConfigurationError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
  OllamaProvider,
  createOllamaProvider,
  OLLAMA_CAPABILITIES,
  AIProviderRegistry,
  getProviderRegistry,
  resetProviderRegistry,
  createDefaultOllamaProvider,
} from './providers';
