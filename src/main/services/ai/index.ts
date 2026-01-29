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
