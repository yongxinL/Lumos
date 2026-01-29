# AI Work Assistant — Implementation Requirements v0.2

## Document Purpose

This document provides complete specifications for building a governed AI operating layer. It is structured for AI-assisted scaffolding and section-by-section implementation with Claude Code.

**Target Platform**: macOS (Electron)
**Phase**: 1 (MVP)

---

## 1. System Overview

### 1.1 Goal & Scope

Build a **desktop-first AI Work Assistant** that operates as a **governed AI operating layer** (not a chatbot).

- Primary use case: ServiceNow-style work (tickets, incidents, meetings, tasks)
- AI **proposes** actions; humans **approve**; system **enforces governance**
- All AI behavior must be **observable, reversible, and controllable**

### 1.2 Non-Negotiable System Rules

1. AI **must never execute actions directly**
2. Every action must pass through:
   - Structured proposal
   - Deterministic policy engine
   - User confirmation (based on risk/trust)
3. No silent permission escalation
4. No free-form AI memory
5. No self-modifying policies or skills

### 1.3 User Guarantees

- User can always see:
  - What the AI is allowed to do
  - What it is not allowed to do
  - What it has done in the past
- AI must always explain:
  - Why an action is suggested
  - Why an action is blocked
- High-risk actions always require explicit confirmation
- User can revoke AI permissions instantly
- User can undo actions when technically possible

### 1.4 User Mental Model

- AI is an **assistant**, not an autonomous agent
- Trust is earned per operation type, not globally
- Learning improves suggestions, not authority

---

## 2. Data Models

### 2.1 Core Types

````typescript
type ISO8601String = string; // e.g., "2025-01-28T10:30:00Z"
type VersionHash = string;   // SHA256 content hash

type TrustLevel = 'OBSERVE' | 'SUPERVISED' | 'DELEGATED';
type RollbackType = 'FULL' | 'PARTIAL' | 'COMPENSATABLE' | 'IRREVERSIBLE';
type DataDomain = 'enterprise' | 'personal';
type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';
type SkillStatus = 'pending' | 'active' | 'deprecated';
type SkillOrigin = 'human' | 'ai';
type ActorType = 'user' | 'ai' | 'system';
type ActionOutcome = 'success' | 'failure' | 'pending' | 'rolled_back';
type ConflictResolution = 'policy_escalation' | 'user_choice';


### 2.2 Entity Reference

```typescript
interface EntityReference {
  type: string;           // e.g., "ticket", "incident", "task", "meeting"
  id: string;
  source: string;         // e.g., "servicenow", "calendar", "local"
}
````

### 2.3 Skill Reference

```typescript
interface SkillReference {
  id: string;
  version_hash: VersionHash;
}
```

### 2.4 Operation Types

```typescript
// Extensible - new types added via skills
type OperationType =
  | 'create_ticket'
  | 'update_ticket_status'
  | 'add_ticket_comment'
  | 'create_calendar_event'
  | 'update_calendar_event'
  | 'delete_calendar_event'
  | 'create_note'
  | 'update_note'
  | 'delete_note'
  | 'read_file'
  | 'write_file'
  | string; // Custom operations defined by skills
```

### 2.5 Action Proposal

```typescript
interface ActionProposal {
  id: string;
  timestamp: ISO8601String;
  intent: string; // Human-readable description
  operation: OperationType;
  target_entity: EntityReference | null;
  data_domain: DataDomain;
  data_classification: DataClassification;
  reversibility: RollbackType;
  confidence: number; // 0.0 - 1.0
  related_skills: SkillReference[];
  rollback_plan: RollbackPlan | null;
  evaluation_model: string; // Model that generated this proposal
  raw_user_input: string;
  requires_confirmation: boolean;
  risk_level: 'low' | 'medium' | 'high';
}
```

### 2.6 Rollback Plan

```typescript
interface RollbackPlan {
  type: RollbackType;
  method: string; // Description of rollback approach
  steps: RollbackStep[];
  estimated_success_rate: number; // 0.0 - 1.0
}

interface RollbackStep {
  order: number;
  action: string;
  reversible: boolean;
}
```

### 2.7 Skill Definition

```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  version_hash: VersionHash; // SHA256(canonical JSON) - immutable
  status: SkillStatus;
  origin: SkillOrigin;
  enabled_operations: OperationType[];
  policy_constraints: PolicyConstraint[];
  required_trust_level: TrustLevel;
  priority: number; // Higher = evaluated first
  data_domain: DataDomain | 'both';
  conflict_resolution: ConflictResolution;
  proposal_schema: JSONSchema; // JSON Schema for proposal validation
  rollback_specification: RollbackSpec;
  created_at: ISO8601String;
  activated_at: ISO8601String | null;
  activated_by: string | null;
}

interface PolicyConstraint {
  type: 'precondition' | 'invariant' | 'postcondition';
  rule: string; // TypeScript expression as string
  error_message: string;
}

interface RollbackSpec {
  type: RollbackType;
  method: string;
  compensation_action?: string; // For COMPENSATABLE type
}

type JSONSchema = Record<string, unknown>;
```

### 2.8 Policy Definition

```typescript
interface Policy {
  id: string;
  name: string;
  description: string;
  version_hash: VersionHash;
  rules: PolicyRule[];
  priority: number;
  enabled: boolean;
  created_at: ISO8601String;
  updated_at: ISO8601String;
}

interface PolicyRule {
  id: string;
  condition: string; // TypeScript expression
  action: 'allow' | 'deny' | 'require_confirmation';
  message: string;
}
```

### 2.9 Trust Level Record

```typescript
interface TrustLevelRecord {
  operation_type: OperationType;
  level: TrustLevel;
  successful_count: number;
  rollback_count: number;
  last_attestation: ISO8601String | null;
  next_attestation_due: ISO8601String | null;
  updated_at: ISO8601String;
}
```

### 2.10 Audit Record

```typescript
interface AuditRecord {
  id: string;
  timestamp: ISO8601String;
  actor: {
    type: ActorType;
    id: string;
  };
  action_type: string;
  target_entity: EntityReference | null;
  proposal_id: string | null;
  policy_result: {
    passed: boolean;
    rule_references: string[];
    denial_reason?: string;
  };
  skill_version: VersionHash | null;
  model_used: string | null;
  input_hash: string; // Hash of user input for privacy
  outcome: ActionOutcome;
  metadata: Record<string, unknown>;
  rollback_of?: string; // ID of audit record this rolled back
}
```

### 2.11 User Preferences

```typescript
interface UserPreferences {
  default_expert_model: string;
  cloud_ai_enabled: boolean;
  allowed_cloud_models: string[];
  default_data_domain: DataDomain;
  stt_enabled: boolean;
  stt_auto_submit: boolean; // Auto-submit after silence
  theme: 'light' | 'dark' | 'system';
  keyboard_shortcuts_enabled: boolean;
  high_contrast_mode: boolean;
  large_text_mode: boolean;
}
```

### 2.12 Meeting Transcript (Phase 1 - Basic)

```typescript
interface MeetingTranscript {
  id: string;
  start_time: ISO8601String;
  end_time: ISO8601String | null;
  segments: TranscriptSegment[];
  data_domain: DataDomain;
  encrypted: boolean;
  created_at: ISO8601String;
}

interface TranscriptSegment {
  timestamp: ISO8601String;
  speaker: string | null; // Speaker identification (if available)
  text: string;
  confidence: number;
}
```

---

## 3. Core Services

### 3.1 High-Level Architecture

```
User Input (Text / Audio)
        ↓
┌─────────────────────────────┐
│  Input Handler              │
│  - STT (FluidAudio)        │
│  - Text normalization      │
│  - Fast path classification │
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│  Fast Path Check            │
│  - Pattern matching         │
│  - Non-action queries       │
│  - Skip to Expert AI        │
└─────────────────────────────┘
        ↓ (action detected)
┌─────────────────────────────┐
│  Evaluation LLM Service     │
│  - Local only (Ollama)      │
│  - Constrained JSON output  │
│  - Proposal generation      │
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│  Policy Engine              │
│  - Deterministic TypeScript │
│  - Skill matching           │
│  - Constraint evaluation    │
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│  User Confirmation          │
│  - Based on trust level     │
│  - Risk assessment          │
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│  Expert AI Service          │
│  - Complex reasoning        │
│  - Action planning          │
│  - Rollback plan generation │
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│  Execution Layer            │
│  - MCP tool invocation      │
│  - Result capture           │
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│  Audit Service              │
│  - Append-only logging      │
│  - State versioning         │
└─────────────────────────────┘
```

### 3.2 Input Handler Service

**Purpose**: Process user input from text and audio sources.

**Responsibilities**:

1. Receive text input from chat interface
2. Receive audio stream from microphone
3. Invoke FluidAudio for speech-to-text (macOS Swift bridge)
4. Normalize text (trim, basic cleanup)
5. Emit transcription preview for user confirmation
6. Route confirmed input to Fast Path Check

**Interface**:

```typescript
interface InputHandlerService {
  // Text input
  submitText(text: string): Promise<ProcessedInput>;

  // Audio input
  startRecording(): Promise<void>;
  stopRecording(): Promise<TranscriptionPreview>;
  confirmTranscription(preview: TranscriptionPreview): Promise<ProcessedInput>;
  cancelTranscription(): void;

  // Events
  onTranscriptionUpdate(callback: (partial: string) => void): void;
  onRecordingStateChange(callback: (state: RecordingState) => void): void;
}

interface ProcessedInput {
  id: string;
  text: string;
  source: 'text' | 'audio';
  timestamp: ISO8601String;
}

interface TranscriptionPreview {
  id: string;
  text: string;
  confidence: number;
  duration_ms: number;
}

type RecordingState = 'idle' | 'recording' | 'processing';
```

**FluidAudio Integration (macOS)**:

```typescript
// Swift bridge interface
interface FluidAudioBridge {
  initialize(): Promise<void>;
  startCapture(options: CaptureOptions): Promise<void>;
  stopCapture(): Promise<AudioBuffer>;
  transcribe(audio: AudioBuffer): Promise<TranscriptionResult>;

  // Real-time streaming
  onPartialTranscript(callback: (text: string) => void): void;
}

interface CaptureOptions {
  sampleRate: number; // Default: 16000
  channels: number; // Default: 1 (mono)
}

interface TranscriptionResult {
  text: string;
  segments: Array<{
    text: string;
    start_ms: number;
    end_ms: number;
    confidence: number;
  }>;
}
```

### 3.3 Fast Path Service

**Purpose**: Reduce latency by bypassing Evaluation LLM for non-action queries.

**Responsibilities**:

1. Classify input as action vs non-action
2. Route non-action queries directly to Expert AI
3. Route action queries to Evaluation LLM
4. Log all classification decisions

**Classification Rules**:

```typescript
interface FastPathService {
  classify(input: ProcessedInput): FastPathResult;
}

interface FastPathResult {
  classification: 'action' | 'non_action';
  confidence: number;
  matched_pattern: string | null;
  route_to: 'evaluation_llm' | 'expert_ai';
}

// Pattern matching (TypeScript, no LLM)
const NON_ACTION_PATTERNS = [
  // Questions seeking information
  /^(what|why|how|when|where|who|which|explain|describe|tell me about)\b/i,

  // Clarification requests
  /^(can you|could you|would you)?\s*(clarify|explain|elaborate|help me understand)/i,

  // General knowledge
  /^(what is|what are|what's|whats|define|meaning of)\b/i,
];

const ACTION_PATTERNS = [
  // Direct commands
  /^(create|update|delete|remove|add|send|schedule|assign|close|resolve|reopen)\b/i,

  // Requests for action
  /^(please|can you|could you|would you)?\s*(create|update|delete|send|schedule)/i,

  // Task references
  /\b(ticket|incident|task|event|meeting|appointment)\b.*\b(create|update|close|assign)/i,
];

// Classification algorithm:
// 1. Check ACTION_PATTERNS first (higher priority)
// 2. If no action match, check NON_ACTION_PATTERNS
// 3. If ambiguous, default to Evaluation LLM (safer)
```

**Performance Target**: < 10ms classification time

### 3.4 Evaluation LLM Service

**Purpose**: Extract intent and generate structured action proposals from user input.

**Responsibilities**:

1. Process action-classified input
2. Generate structured JSON proposals using constrained decoding
3. Validate proposal against schema
4. Return proposal for policy evaluation

**Requirements**:

- **Local execution only** (Ollama / LM Studio)
- **Constrained JSON decoding** (grammar-based generation)
- No tool execution capability
- Fast inference (target: 2-3 seconds)

**Interface**:

```typescript
interface EvaluationLLMService {
  initialize(config: EvaluationLLMConfig): Promise<void>;
  generateProposal(input: ProcessedInput): Promise<ActionProposal>;
  isAvailable(): Promise<boolean>;
  getModelInfo(): ModelInfo;
}

interface EvaluationLLMConfig {
  provider: 'ollama' | 'lmstudio';
  model_name: string; // e.g., "qwen3-vl-4b"
  endpoint: string; // e.g., "http://localhost:11434"
  timeout_ms: number; // Default: 30000
  proposal_schema: JSONSchema; // For constrained decoding
}

interface ModelInfo {
  provider: string;
  model_name: string;
  status: 'available' | 'unavailable' | 'loading';
  last_check: ISO8601String;
}
```

**Constrained Decoding Configuration**:

```typescript
// Ollama format parameter for JSON schema
const PROPOSAL_JSON_SCHEMA = {
  type: 'object',
  required: [
    'intent',
    'operation',
    'data_domain',
    'data_classification',
    'reversibility',
    'confidence',
    'risk_level',
  ],
  properties: {
    intent: { type: 'string', description: 'Human-readable action description' },
    operation: { type: 'string', description: 'Operation type identifier' },
    target_entity: {
      type: ['object', 'null'],
      properties: {
        type: { type: 'string' },
        id: { type: 'string' },
        source: { type: 'string' },
      },
    },
    data_domain: { enum: ['enterprise', 'personal'] },
    data_classification: { enum: ['public', 'internal', 'confidential', 'restricted'] },
    reversibility: { enum: ['FULL', 'PARTIAL', 'COMPENSATABLE', 'IRREVERSIBLE'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    risk_level: { enum: ['low', 'medium', 'high'] },
    rollback_plan: {
      type: ['object', 'null'],
      properties: {
        type: { enum: ['FULL', 'PARTIAL', 'COMPENSATABLE', 'IRREVERSIBLE'] },
        method: { type: 'string' },
        steps: { type: 'array' },
      },
    },
  },
};

// Request to Ollama with constrained decoding
interface OllamaRequest {
  model: string;
  prompt: string;
  format: typeof PROPOSAL_JSON_SCHEMA;
  stream: false;
  options: {
    temperature: 0.1; // Low temperature for consistency
    num_predict: 1000; // Max tokens
  };
}
```

**System Prompt for Evaluation LLM**:

```text
You are a structured intent extractor for an AI work assistant. Your ONLY job is to analyze user requests and output a JSON action proposal.

RULES:
1. Output ONLY valid JSON matching the schema - no explanations
2. Extract the user's intent as a specific operation
3. Assess risk level based on reversibility and data sensitivity
4. Set confidence based on how clear the user's intent is
5. If intent is unclear, set confidence < 0.5

OPERATION TYPES:
- create_ticket, update_ticket_status, add_ticket_comment
- create_calendar_event, update_calendar_event, delete_calendar_event
- create_note, update_note, delete_note
- read_file, write_file

RISK ASSESSMENT:
- low: Read operations, easily reversible changes
- medium: Updates to existing items, compensatable changes
- high: Deletions, irreversible changes, confidential data

Analyze the following user input and return a structured proposal:
```

**Unavailability Handling**:

When local LLM is unavailable:

1. Check connection to Ollama/LM Studio endpoint
2. If connection fails, display error with installation instructions
3. Provide link to Ollama download: https://ollama.ai
4. Do not fall back to cloud model (governance requirement)

```typescript
interface LLMUnavailableError {
  code: 'LLM_UNAVAILABLE';
  provider: 'ollama' | 'lmstudio';
  endpoint: string;
  message: string;
  installation_url: string;
}
```

### 3.5 Policy Engine

**Purpose**: Deterministically evaluate proposals against skills and policies.

**Requirements**:

- Implemented in TypeScript (no LLM)
- Deterministic output for same input
- Fast evaluation (< 50ms)

**Interface**:

```typescript
interface PolicyEngine {
  evaluate(proposal: ActionProposal, context: EvaluationContext): PolicyResult;
  findMatchingSkills(operation: OperationType): Skill[];
  resolveConflicts(skills: Skill[], proposal: ActionProposal): Skill | null;
}

interface EvaluationContext {
  user_id: string;
  trust_levels: Map<OperationType, TrustLevel>;
  active_skills: Skill[];
  active_policies: Policy[];
}

interface PolicyResult {
  allowed: boolean;
  requires_confirmation: boolean;
  matched_skill: SkillReference | null;
  rule_references: string[];
  denial_reason?: string;
  trust_level_used: TrustLevel;
}
```

**Evaluation Algorithm**:

```typescript
function evaluateProposal(proposal: ActionProposal, context: EvaluationContext): PolicyResult {
  // Step 1: Find all active skills where proposal.operation ∈ skill.enabled_operations
  const matchingSkills = context.active_skills.filter(
    (skill) => skill.status === 'active' && skill.enabled_operations.includes(proposal.operation)
  );

  // Step 2: If no skills match, DENY (no capability defined)
  if (matchingSkills.length === 0) {
    return {
      allowed: false,
      requires_confirmation: false,
      matched_skill: null,
      rule_references: [],
      denial_reason: `No skill defines operation: ${proposal.operation}`,
      trust_level_used: 'OBSERVE',
    };
  }

  // Step 3: Sort by priority (descending)
  const sortedSkills = matchingSkills.sort((a, b) => b.priority - a.priority);

  // Step 4: Evaluate each skill in order
  for (const skill of sortedSkills) {
    const skillResult = evaluateSkill(skill, proposal, context);
    if (skillResult.passed) {
      return {
        allowed: true,
        requires_confirmation: determineConfirmationRequired(skill, proposal, context),
        matched_skill: { id: skill.id, version_hash: skill.version_hash },
        rule_references: skillResult.rule_references,
        trust_level_used: context.trust_levels.get(proposal.operation) || 'OBSERVE',
      };
    }
  }

  // Step 5: All skills failed, DENY
  return {
    allowed: false,
    requires_confirmation: false,
    matched_skill: null,
    rule_references: [],
    denial_reason: 'All matching skills failed policy constraints',
    trust_level_used: 'OBSERVE',
  };
}

function evaluateSkill(
  skill: Skill,
  proposal: ActionProposal,
  context: EvaluationContext
): { passed: boolean; rule_references: string[] } {
  const rule_references: string[] = [];

  // Check 1: Validate proposal against skill's proposal schema
  if (!validateSchema(proposal, skill.proposal_schema)) {
    rule_references.push(`${skill.id}:schema_validation_failed`);
    return { passed: false, rule_references };
  }

  // Check 2: Data domain compatibility
  if (skill.data_domain !== 'both' && skill.data_domain !== proposal.data_domain) {
    rule_references.push(`${skill.id}:data_domain_mismatch`);
    return { passed: false, rule_references };
  }

  // Check 3: Trust level requirement
  const userTrustLevel = context.trust_levels.get(proposal.operation) || 'OBSERVE';
  if (!isTrustLevelSufficient(userTrustLevel, skill.required_trust_level)) {
    rule_references.push(`${skill.id}:insufficient_trust_level`);
    return { passed: false, rule_references };
  }

  // Check 4: Evaluate policy constraints (preconditions)
  for (const constraint of skill.policy_constraints) {
    if (constraint.type === 'precondition') {
      if (!evaluateConstraint(constraint, proposal, context)) {
        rule_references.push(`${skill.id}:constraint:${constraint.rule}`);
        return { passed: false, rule_references };
      }
    }
  }

  rule_references.push(`${skill.id}:passed`);
  return { passed: true, rule_references };
}

function determineConfirmationRequired(
  skill: Skill,
  proposal: ActionProposal,
  context: EvaluationContext
): boolean {
  const trustLevel = context.trust_levels.get(proposal.operation) || 'OBSERVE';

  // OBSERVE: Always requires confirmation (suggestions only)
  if (trustLevel === 'OBSERVE') return true;

  // SUPERVISED: Always requires confirmation
  if (trustLevel === 'SUPERVISED') return true;

  // DELEGATED: Auto-execute, but high-risk still requires confirmation
  if (trustLevel === 'DELEGATED') {
    return proposal.risk_level === 'high';
  }

  return true; // Default: require confirmation
}

// Trust level hierarchy: OBSERVE < SUPERVISED < DELEGATED
function isTrustLevelSufficient(userLevel: TrustLevel, requiredLevel: TrustLevel): boolean {
  const hierarchy: Record<TrustLevel, number> = {
    OBSERVE: 0,
    SUPERVISED: 1,
    DELEGATED: 2,
  };
  return hierarchy[userLevel] >= hierarchy[requiredLevel];
}
```

**Conflict Resolution**:

```typescript
function resolveConflicts(
  passingSkills: Skill[],
  proposal: ActionProposal
): Skill | ConflictResolutionRequired {
  if (passingSkills.length === 0) return null;
  if (passingSkills.length === 1) return passingSkills[0];

  // Sort by priority descending
  const sorted = passingSkills.sort((a, b) => b.priority - a.priority);

  // If clear priority winner, use it
  if (sorted[0].priority > sorted[1].priority) {
    return sorted[0];
  }

  // Tie-breaker: more specific skill (fewer enabled_operations)
  const sameTopPriority = sorted.filter((s) => s.priority === sorted[0].priority);
  const mostSpecific = sameTopPriority.sort(
    (a, b) => a.enabled_operations.length - b.enabled_operations.length
  );

  if (mostSpecific[0].enabled_operations.length < mostSpecific[1].enabled_operations.length) {
    return mostSpecific[0];
  }

  // Still tied: check data domain for resolution strategy
  if (proposal.data_domain === 'enterprise') {
    // Enterprise data: escalate to policy (admin decision)
    return { type: 'policy_escalation', skills: sameTopPriority };
  } else {
    // Personal data: let user choose
    return { type: 'user_choice', skills: sameTopPriority };
  }
}

interface ConflictResolutionRequired {
  type: 'policy_escalation' | 'user_choice';
  skills: Skill[];
}
```

### 3.6 Expert AI Service

**Purpose**: Complex reasoning, action planning, and response generation.

**Responsibilities**:

1. Process non-action queries (via fast path)
2. Generate detailed action plans for approved proposals
3. Create rollback plans
4. Provide conversational responses

**Requirements**:

- User-selectable model (local or cloud)
- Cannot bypass policy engine
- All model routing decisions logged

**Interface**:

```typescript
interface ExpertAIService {
  initialize(config: ExpertAIConfig): Promise<void>;
  processQuery(input: ProcessedInput): Promise<ExpertResponse>;
  planAction(proposal: ActionProposal): Promise<ActionPlan>;
  generateRollbackPlan(action: ExecutedAction): Promise<RollbackPlan>;
  switchModel(modelId: string): Promise<void>;
  getAvailableModels(): ModelOption[];
}

interface ExpertAIConfig {
  default_model: string;
  available_models: ModelOption[];
  cloud_enabled: boolean;
}

interface ModelOption {
  id: string;
  name: string;
  provider: 'local' | 'cloud';
  type: 'ollama' | 'lmstudio' | 'claude' | 'openai' | 'servicenow';
  endpoint?: string;
  requires_api_key: boolean;
}

interface ExpertResponse {
  content: string;
  model_used: string;
  tokens_used?: number;
  latency_ms: number;
}

interface ActionPlan {
  proposal_id: string;
  steps: PlanStep[];
  estimated_duration_ms: number;
  rollback_plan: RollbackPlan;
}

interface PlanStep {
  order: number;
  description: string;
  tool: string;
  parameters: Record<string, unknown>;
  expected_outcome: string;
}
```

**Default Model Options**:

```typescript
const DEFAULT_LOCAL_MODELS: ModelOption[] = [
  {
    id: 'qwen3-vl-4b',
    name: 'Qwen 3 VL 4B',
    provider: 'local',
    type: 'ollama',
    requires_api_key: false,
  },
  {
    id: 'llama3.2',
    name: 'Llama 3.2',
    provider: 'local',
    type: 'ollama',
    requires_api_key: false,
  },
  {
    id: 'mistral',
    name: 'Mistral',
    provider: 'local',
    type: 'ollama',
    requires_api_key: false,
  },
];

const DEFAULT_CLOUD_MODELS: ModelOption[] = [
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet',
    provider: 'cloud',
    type: 'claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    requires_api_key: true,
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'cloud',
    type: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    requires_api_key: true,
  },
  {
    id: 'servicenow-llm',
    name: 'ServiceNow LLM',
    provider: 'cloud',
    type: 'servicenow',
    requires_api_key: true,
  },
];
```

### 3.7 Execution Layer

**Purpose**: Execute approved actions via MCP tools.

**Responsibilities**:

1. Invoke MCP tools based on action plan
2. Capture execution results
3. Handle execution errors
4. Trigger rollback on failure

**Interface**:

```typescript
interface ExecutionLayer {
  execute(plan: ActionPlan, proposal: ActionProposal): Promise<ExecutionResult>;
  rollback(action: ExecutedAction): Promise<RollbackResult>;
  getRegisteredTools(): MCPTool[];
}

interface ExecutionResult {
  success: boolean;
  action_id: string;
  proposal_id: string;
  steps_completed: number;
  steps_total: number;
  result_data?: unknown;
  error?: ExecutionError;
  duration_ms: number;
}

interface ExecutedAction {
  id: string;
  proposal_id: string;
  plan: ActionPlan;
  result: ExecutionResult;
  executed_at: ISO8601String;
  executed_by: string;
}

interface RollbackResult {
  success: boolean;
  original_action_id: string;
  steps_rolled_back: number;
  steps_total: number;
  error?: ExecutionError;
}

interface ExecutionError {
  code: string;
  message: string;
  step_index?: number;
  recoverable: boolean;
}
```

**MCP Tool Registration**:

```typescript
interface MCPTool {
  name: string;
  server: string;
  capabilities: string[];
  default_data_domain: DataDomain;
  skill_required: string; // Skill ID that governs this tool
}

// Phase 1 registered tools
const REGISTERED_TOOLS: MCPTool[] = [
  {
    name: 'calendar',
    server: 'mcp-calendar', // Public MCP server
    capabilities: ['read_events', 'create_event', 'update_event', 'delete_event'],
    default_data_domain: 'personal',
    skill_required: 'calendar-operations',
  },
  {
    name: 'filesystem',
    server: 'mcp-filesystem', // Public MCP server
    capabilities: ['read_file', 'write_file', 'list_directory'],
    default_data_domain: 'personal',
    skill_required: 'filesystem-operations',
  },
  // ServiceNow MCP: Phase 2
];

// Tool invocation
interface MCPInvocation {
  tool: string;
  method: string;
  parameters: Record<string, unknown>;
}

// Unregistered tools cannot be invoked (fail-safe)
function canInvokeTool(toolName: string): boolean {
  return REGISTERED_TOOLS.some((t) => t.name === toolName);
}
```

### 3.8 Audit Service

**Purpose**: Maintain append-only log of all significant events.

**Responsibilities**:

1. Log all proposals, policy decisions, executions, rollbacks
2. Provide queryable audit history
3. Support audit export

**Interface**:

```typescript
interface AuditService {
  log(record: Omit<AuditRecord, 'id' | 'timestamp'>): Promise<AuditRecord>;
  query(filter: AuditFilter): Promise<AuditRecord[]>;
  getById(id: string): Promise<AuditRecord | null>;
  export(filter: AuditFilter, format: 'json' | 'csv'): Promise<string>;
}

interface AuditFilter {
  actor_type?: ActorType;
  actor_id?: string;
  action_type?: string;
  outcome?: ActionOutcome;
  from_date?: ISO8601String;
  to_date?: ISO8601String;
  limit?: number;
  offset?: number;
}
```

**What Must Be Logged**:

| Event                    | Action Type                       | Required Fields                 |
| ------------------------ | --------------------------------- | ------------------------------- |
| User input received      | `user_input`                      | input_hash, source              |
| Fast path classification | `fast_path_classification`        | result, matched_pattern         |
| Proposal generated       | `proposal_generated`              | proposal_id, model_used         |
| Policy evaluation        | `policy_evaluated`                | proposal_id, policy_result      |
| User confirmation        | `user_confirmed` or `user_denied` | proposal_id                     |
| Action executed          | `action_executed`                 | proposal_id, result             |
| Rollback performed       | `action_rolled_back`              | original_action_id, result      |
| Trust level changed      | `trust_level_changed`             | operation, old_level, new_level |
| Skill activated          | `skill_activated`                 | skill_id, version_hash          |
| Model switched           | `model_switched`                  | old_model, new_model            |

**Audit Integrity**:

```typescript
// Append-only enforcement
// - No UPDATE or DELETE on audit_log table
// - Immutable once written
// - Rollbacks create new records with rollback_of reference

// Record linking
interface AuditChain {
  original_id: string;
  related_ids: string[]; // All records in the action chain
}
```

### 3.9 Trust Management Service

**Purpose**: Manage trust levels per operation type.

**Interface**:

```typescript
interface TrustManagementService {
  getTrustLevel(operation: OperationType): TrustLevel;
  getAllTrustLevels(): Map<OperationType, TrustLevelRecord>;
  promoteTrust(operation: OperationType): Promise<PromotionResult>;
  demoteTrust(operation: OperationType, targetLevel: TrustLevel): Promise<void>;
  recordSuccess(operation: OperationType): Promise<void>;
  recordRollback(operation: OperationType): Promise<void>;
  checkAttestationDue(): AttestationCheck[];
  confirmAttestation(operations: OperationType[]): Promise<void>;
}

interface PromotionResult {
  success: boolean;
  new_level?: TrustLevel;
  reason?: string;
}

interface AttestationCheck {
  operation: OperationType;
  current_level: TrustLevel;
  days_until_due: number;
  requires_action: boolean;
}
```

**Trust Level Transitions**:

```typescript
// Promotion rules
const PROMOTION_RULES = {
  // OBSERVE → SUPERVISED: Immediate (user explicit request)
  OBSERVE_TO_SUPERVISED: {
    requires_success_count: 0,
    requires_no_rollbacks: false,
    auto_promote: false, // Always requires user action
  },

  // SUPERVISED → DELEGATED: Requires track record
  SUPERVISED_TO_DELEGATED: {
    requires_success_count: 10, // At least 10 successful approvals
    requires_no_rollbacks: true, // No rollbacks since last promotion
    auto_promote: false, // User must explicitly request
  },
};

// Demotion rules
const DEMOTION_RULES = {
  // User can demote instantly
  user_requested: 'immediate',

  // Automatic demotion on rollback
  on_rollback: {
    DELEGATED: 'SUPERVISED', // Demote one level
    SUPERVISED: 'SUPERVISED', // Stay at SUPERVISED
    OBSERVE: 'OBSERVE', // Stay at OBSERVE
  },
};

// Attestation rules
const ATTESTATION_RULES = {
  // DELEGATED operations require periodic review
  delegated_review_interval_days: 30,

  // Grace period before auto-demotion
  grace_period_days: 7,

  // Action on missed attestation
  on_missed_attestation: 'SUPERVISED', // Demote to SUPERVISED
};
```

---

## 4. Storage Layer

### 4.1 Overview

| Storage Type   | Location                                                   | Purpose                |
| -------------- | ---------------------------------------------------------- | ---------------------- |
| SQLite         | `~/Library/Application Support/AIWorkAssistant/runtime.db` | Runtime data           |
| Filesystem     | `~/Library/Application Support/AIWorkAssistant/`           | Human-editable content |
| macOS Keychain | System keychain                                            | Sensitive credentials  |

### 4.2 SQLite Schema

```sql
-- ================================================================
-- SKILLS
-- ================================================================
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version_hash TEXT UNIQUE NOT NULL,
  definition JSON NOT NULL,
  status TEXT CHECK(status IN ('pending', 'active', 'deprecated')) NOT NULL,
  origin TEXT CHECK(origin IN ('human', 'ai')) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  data_domain TEXT CHECK(data_domain IN ('enterprise', 'personal', 'both')) NOT NULL,
  created_at TEXT NOT NULL,
  activated_at TEXT,
  activated_by TEXT,
  deprecated_at TEXT
);

CREATE INDEX idx_skills_status ON skills(status);
CREATE INDEX idx_skills_version_hash ON skills(version_hash);

-- ================================================================
-- AUDIT LOG (Append-only)
-- ================================================================
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_entity JSON,
  proposal_id TEXT,
  policy_result JSON NOT NULL,
  skill_version TEXT,
  model_used TEXT,
  input_hash TEXT,
  outcome TEXT NOT NULL,
  metadata JSON,
  rollback_of TEXT,
  FOREIGN KEY (rollback_of) REFERENCES audit_log(id)
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_actor ON audit_log(actor_type, actor_id);
CREATE INDEX idx_audit_action_type ON audit_log(action_type);
CREATE INDEX idx_audit_outcome ON audit_log(outcome);
CREATE INDEX idx_audit_proposal ON audit_log(proposal_id);


-- ================================================================
-- TRUST LEVELS
-- ================================================================
CREATE TABLE trust_levels (
  operation_type TEXT PRIMARY KEY,
  level TEXT CHECK(level IN ('OBSERVE', 'SUPERVISED', 'DELEGATED')) NOT NULL DEFAULT 'OBSERVE',
  successful_count INTEGER NOT NULL DEFAULT 0,
  rollback_count INTEGER NOT NULL DEFAULT 0,
  last_attestation TEXT,
  next_attestation_due TEXT,
  updated_at TEXT NOT NULL
);

-- ================================================================
-- USER PREFERENCES
-- ================================================================
CREATE TABLE preferences (
  key TEXT PRIMARY KEY,
  value JSON NOT NULL,
  updated_at TEXT NOT NULL
);

-- ================================================================
-- POLICIES
-- ================================================================
CREATE TABLE policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version_hash TEXT UNIQUE NOT NULL,
  definition JSON NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_policies_enabled ON policies(enabled);

-- ================================================================
-- MEETING TRANSCRIPTS (Encrypted content)
-- ================================================================
CREATE TABLE meetings (
  id TEXT PRIMARY KEY,
  start_time TEXT NOT NULL,
  end_time TEXT,
  transcript_encrypted BLOB,         -- Field-level encryption
  summary TEXT,
  data_domain TEXT CHECK(data_domain IN ('enterprise', 'personal')) NOT NULL,
  encryption_key_id TEXT,            -- Reference to keychain entry
  created_at TEXT NOT NULL
);

CREATE INDEX idx_meetings_time ON meetings(start_time);
CREATE INDEX idx_meetings_domain ON meetings(data_domain);

-- ================================================================
-- USERS (Local accounts - Phase 1)
-- ================================================================
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,       -- bcrypt hash
  created_at TEXT NOT NULL,
  last_login TEXT
);

-- ================================================================
-- SESSIONS
-- ================================================================
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

### 4.3 Filesystem Structure

```
~/Library/Application Support/AIWorkAssistant/
├── runtime.db                    # SQLite database
├── skills/
│   ├── builtin/                  # Shipped with app (read-only)
│   │   ├── calendar-operations.yaml
│   │   ├── filesystem-operations.yaml
│   │   └── index.yaml            # Manifest of builtin skills
│   └── user/                     # User-created (power users)
│       └── .gitkeep
├── policies/
│   ├── default-policy.yaml       # Default security policy
│   └── user-policies/            # User-defined policies
├── notes/                        # User's personal knowledge
│   └── .gitkeep
├── exports/                      # Audit log exports
│   └── .gitkeep
└── config/
    ├── models.yaml               # AI model configuration
    └── mcp-servers.yaml          # MCP server registration
```

### 4.4 Skill File Format (YAML)

```yaml
# skills/builtin/calendar-operations.yaml
id: calendar-operations
name: Calendar Operations
description: Manage calendar events
version: '1.0.0'
origin: human
status: active
priority: 100
data_domain: personal
conflict_resolution: user_choice

enabled_operations:
  - create_calendar_event
  - update_calendar_event
  - delete_calendar_event

policy_constraints:
  - type: precondition
    rule: "proposal.target_entity?.source === 'calendar'"
    error_message: 'Operation must target a calendar entity'
  - type: precondition
    rule: "proposal.data_classification !== 'restricted'"
    error_message: 'Cannot perform calendar operations on restricted data'

required_trust_level: SUPERVISED

rollback_specification:
  type: FULL
  method: 'Delete created event or restore previous version'

proposal_schema:
  type: object
  required:
    - intent
    - operation
  properties:
    intent:
      type: string
    operation:
      enum:
        - create_calendar_event
        - update_calendar_event
        - delete_calendar_event
    target_entity:
      type: object
      properties:
        type:
          const: event
        id:
          type: string
        source:
          const: calendar
```

### 4.5 Encryption Strategy

**Keychain Storage (macOS)**:

```typescript
// Using Electron's safeStorage API
import { safeStorage } from 'electron';

interface KeychainService {
  // Master encryption key for field-level encryption
  getEncryptionKey(): Promise<Buffer>;
  setEncryptionKey(key: Buffer): Promise<void>;

  // API keys for cloud models
  getAPIKey(provider: string): Promise<string | null>;
  setAPIKey(provider: string, key: string): Promise<void>;
  deleteAPIKey(provider: string): Promise<void>;

  // MCP server credentials
  getMCPCredential(server: string): Promise<Credential | null>;
  setMCPCredential(server: string, credential: Credential): Promise<void>;
}

interface Credential {
  type: 'basic' | 'oauth' | 'token';
  username?: string;
  password?: string;
  token?: string;
}
```

**Field-Level Encryption**:

```typescript
// Encrypt sensitive fields before storage
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

interface FieldEncryption {
  encrypt(data: string, key: Buffer): EncryptedField;
  decrypt(field: EncryptedField, key: Buffer): string;
}

interface EncryptedField {
  iv: string; // Base64 encoded
  data: string; // Base64 encoded ciphertext
  algorithm: 'aes-256-gcm';
  auth_tag: string; // Base64 encoded
}

// Fields that require encryption:
const ENCRYPTED_FIELDS = [
  'meetings.transcript_encrypted',
  'audit_log.metadata', // When contains PII
];
```

**First-Run Key Generation**:

```typescript
async function initializeEncryption(): Promise<void> {
  const keychain = getKeychainService();

  let key = await keychain.getEncryptionKey();
  if (!key) {
    // Generate new 256-bit key
    key = randomBytes(32);
    await keychain.setEncryptionKey(key);
  }
}
```

### 4.6 Filesystem ↔ SQLite Sync

```typescript
interface SkillSyncService {
  syncOnStartup(): Promise<SyncResult>;
  watchFilesystem(): void;
  exportSkillToFilesystem(skillId: string): Promise<void>;
}

interface SyncResult {
  skills_loaded: number;
  skills_updated: number;
  conflicts: SyncConflict[];
  errors: SyncError[];
}

interface SyncConflict {
  skill_id: string;
  filesystem_hash: string;
  database_hash: string;
  resolution: 'use_filesystem' | 'use_database' | 'user_decision';
}

// Sync algorithm on startup:
// 1. Load all YAML files from skills/builtin and skills/user
// 2. Compute version_hash for each (SHA256 of canonical JSON)
// 3. For each skill:
//    a. If not in DB: insert as new skill
//    b. If in DB with same hash: skip (no change)
//    c. If in DB with different hash:
//       - If filesystem file is newer: update DB, mark old version deprecated
//       - If DB is newer (shouldn't happen for human-authored): conflict
// 4. Skills in DB but not in filesystem: keep (may be user-created via future UI)
```

---

## 5. UI Components

### 5.1 View Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Title Bar (Electron)                                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌──────────────────────────────────────────────┐ │
│  │         │  │                                              │ │
│  │  Nav    │  │              Main Content Area               │ │
│  │  Rail   │  │                                              │ │
│  │         │  │  - Chat View                                 │ │
│  │  Chat   │  │  - Activity View                             │ │
│  │  Activity│ │  - Permissions View                          │ │
│  │  Perms  │  │  - Skills View                               │ │
│  │  Skills │  │  - Settings View                             │ │
│  │  Settings│ │                                              │ │
│  │         │  │                                              │ │
│  └─────────┘  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Chat View

**Purpose**: Primary interaction interface

**Components**:

```typescript
interface ChatViewState {
  messages: ChatMessage[];
  input_text: string;
  recording_state: RecordingState;
  transcription_preview: TranscriptionPreview | null;
  pending_proposal: ProposalDisplay | null;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'proposal';
  content: string;
  timestamp: ISO8601String;
  proposal?: ProposalDisplay;
}

interface ProposalDisplay {
  proposal: ActionProposal;
  policy_result: PolicyResult;
  status: 'pending' | 'approved' | 'denied' | 'executed' | 'failed';
}
```

**Layout**:

```
┌─────────────────────────────────────────────────────────────┐
│  Message History (scrollable)                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [User] Create a meeting for tomorrow at 2pm         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Proposal Card]                                      │   │
│  │ Intent: Create calendar event                        │   │
│  │ Operation: create_calendar_event                     │   │
│  │ Risk: Low                                           │   │
│  │ Reversibility: FULL                                 │   │
│  │ ┌─────────────┐  ┌─────────────┐                    │   │
│  │ │  Approve    │  │    Deny     │                    │   │
│  │ └─────────────┘  └─────────────┘                    │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  [STT Preview Area - shown when recording]                  │
│  "Transcription appears here as you speak..."              │
│  ┌─────────────┐  ┌─────────────┐                          │
│  │   Submit    │  │   Cancel    │                          │
│  └─────────────┘  └─────────────┘                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐  ┌────┐       │
│  │  Type your message...                    │  │ 🎤 │       │
│  └─────────────────────────────────────────┘  └────┘       │
└─────────────────────────────────────────────────────────────┘
```

**Proposal Card States**:

| State    | Appearance                   | Actions Available        |
| -------- | ---------------------------- | ------------------------ |
| pending  | Yellow border                | Approve, Deny            |
| approved | Green border, "Executing..." | Cancel (if possible)     |
| denied   | Red border, "Denied"         | None                     |
| executed | Green border, "Completed"    | Rollback (if reversible) |
| failed   | Red border, error message    | Retry, Rollback          |

### 5.3 Activity View

**Purpose**: Audit log browser

**Components**:

```typescript
interface ActivityViewState {
  records: AuditRecord[];
  filter: AuditFilter;
  selected_record: AuditRecord | null;
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
}
```

**Layout**:

```
┌─────────────────────────────────────────────────────────────┐
│  Filters                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Action Type ▼│ │  Outcome  ▼ │ │  Date Range          │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Activity List                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟢 10:30 AM  action_executed  create_calendar_event │   │
│  │    Skill: calendar-operations v1.0.0                │   │
│  │    ┌────────────┐                                   │   │
│  │    │  Rollback  │                                   │   │
│  │    └────────────┘                                   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🔴 10:25 AM  policy_denied   delete_file            │   │
│  │    Reason: Insufficient trust level                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 🟡 10:20 AM  user_confirmed  update_ticket_status   │   │
│  │    Proposal ID: abc123                              │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  ┌───────┐  Page 1 of 10  ┌───────┐  ┌─────────────────┐   │
│  │   <   │                │   >   │  │  Export as CSV  │   │
│  └───────┘                └───────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Record Detail Panel** (shown when record selected):

```
┌─────────────────────────────────────────────────────────────┐
│  Record Detail                                              │
│  ─────────────────                                         │
│  ID: abc-123-def                                           │
│  Timestamp: 2025-01-28T10:30:00Z                          │
│  Actor: user / george                                      │
│  Action: action_executed                                   │
│  Target: { type: "event", id: "evt-456", source: "cal" }  │
│                                                            │
│  Policy Result:                                            │
│    Passed: true                                            │
│    Rules: ["calendar-operations:passed"]                   │
│                                                            │
│  Skill: calendar-operations                                │
│  Version: a1b2c3d4...                                     │
│  Model: qwen3-vl-4b                                       │
│                                                            │
│  Metadata:                                                 │
│  { "event_title": "Team Meeting", ... }                   │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Permissions View

**Purpose**: Trust level management per operation

**Layout**:

```
┌─────────────────────────────────────────────────────────────┐
│  Permissions                                                │
│  ─────────────                                             │
│  Manage trust levels for each operation type.              │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Operation              Trust Level      Actions    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  create_calendar_event  [SUPERVISED ▼]   ⚙️        │   │
│  │  ✓ 15 successful / 0 rollbacks                      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  update_ticket_status   [DELEGATED ▼]    ⚙️ ⚠️    │   │
│  │  ✓ 47 successful / 1 rollback                       │   │
│  │  ⚠️ Attestation due in 5 days                       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  delete_file            [OBSERVE ▼]      ⚙️        │   │
│  │  ✓ 0 successful / 0 rollbacks                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DELEGATED Operations Attestation                   │   │
│  │  You have 2 operations in DELEGATED mode.          │   │
│  │  Review and confirm to maintain auto-execution.    │   │
│  │  ┌─────────────────┐                               │   │
│  │  │  Review Now     │                               │   │
│  │  └─────────────────┘                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Trust Level Dropdown Options**:

```typescript
interface TrustLevelOption {
  level: TrustLevel;
  label: string;
  description: string;
  available: boolean; // Based on promotion rules
  reason?: string; // Why unavailable
}

const TRUST_LEVEL_OPTIONS: TrustLevelOption[] = [
  {
    level: 'OBSERVE',
    label: 'Observe Only',
    description: 'AI suggests, no actions taken',
    available: true,
  },
  {
    level: 'SUPERVISED',
    label: 'Supervised',
    description: 'AI proposes, you approve each action',
    available: true, // Always available
  },
  {
    level: 'DELEGATED',
    label: 'Delegated',
    description: 'AI executes automatically (requires 10+ successes)',
    available: false, // Computed based on track record
    reason: 'Requires 10 successful approvals with no rollbacks',
  },
];
```

### 5.5 Skills View

**Purpose**: View and manage skills

**Layout**:

```
┌─────────────────────────────────────────────────────────────┐
│  Skills                                                     │
│  ─────────                                                 │
│  ┌──────────────────┐ ┌──────────────────┐                 │
│  │  Active Skills   │ │  All Skills      │                 │
│  └──────────────────┘ └──────────────────┘                 │
│                                                            │
│  Active Skills (3)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📋 calendar-operations                             │   │
│  │  v1.0.0 • Human authored • Priority: 100           │   │
│  │  Operations: create_calendar_event, update_...     │   │
│  │  ┌─────────────────┐                               │   │
│  │  │  View Details   │                               │   │
│  │  └─────────────────┘                               │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  📁 filesystem-operations                          │   │
│  │  v1.0.0 • Human authored • Priority: 50            │   │
│  │  Operations: read_file, write_file, list_dir       │   │
│  │  ┌─────────────────┐                               │   │
│  │  │  View Details   │                               │   │
│  │  └─────────────────┘                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ℹ️  Add custom skills by placing YAML files in:          │
│     ~/Library/Application Support/AIWorkAssistant/skills/user/   │
└─────────────────────────────────────────────────────────────┘
```

**Skill Detail View**:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Skills                                          │
│                                                            │
│  calendar-operations                                       │
│  ═══════════════════                                      │
│                                                            │
│  Status: Active                                            │
│  Origin: Human authored                                    │
│  Version: a1b2c3d4e5f6...                                 │
│  Priority: 100                                             │
│  Data Domain: Personal                                     │
│  Required Trust: SUPERVISED                                │
│                                                            │
│  Enabled Operations:                                       │
│  • create_calendar_event                                   │
│  • update_calendar_event                                   │
│  • delete_calendar_event                                   │
│                                                            │
│  Policy Constraints:                                       │
│  • Precondition: target must be calendar entity           │
│  • Precondition: data classification != restricted        │
│                                                            │
│  Rollback Specification:                                   │
│  Type: FULL                                               │
│  Method: Delete created event or restore previous version │
│                                                            │
│  Activated: 2025-01-15T09:00:00Z                         │
│  Activated by: system (builtin)                           │
│                                                            │
│  ┌─────────────────┐                                      │
│  │   Deprecate     │                                      │
│  └─────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

### 5.6 Settings View

**Purpose**: Application configuration

**Layout**:

```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                                   │
│  ────────                                                  │
│                                                            │
│  AI Models                                                 │
│  ──────────                                               │
│  Expert AI Model:  [Qwen 3 VL 4B (Local) ▼]               │
│                                                            │
│  Cloud AI:  [✓] Enable cloud models                        │
│             (Requires API keys)                            │
│                                                            │
│  API Keys:                                                 │
│  ┌────────────────────────────────────────┐               │
│  │  Claude API Key:     [••••••••••••]  [Edit]  │         │
│  │  OpenAI API Key:     [Not configured]  [Add]  │        │
│  │  ServiceNow LLM:     [Not configured]  [Add]  │        │
│  └────────────────────────────────────────┘               │
│                                                            │
│  Speech-to-Text                                            │
│  ──────────────                                           │
│  [✓] Enable voice input                                   │
│  [ ] Auto-submit after 2 seconds of silence               │
│                                                            │
│  Appearance                                                │
│  ──────────                                               │
│  Theme:  [System ▼]                                        │
│  [✓] High contrast mode                                   │
│  [✓] Large text                                           │
│                                                            │
│  Keyboard Shortcuts                                        │
│  ──────────────────                                       │
│  [✓] Enable keyboard shortcuts                            │
│  ┌────────────────────────────────────────┐               │
│  │  Cmd+Enter    Submit message            │               │
│  │  Cmd+Shift+A  Start/stop recording      │               │
│  │  Cmd+1-5      Switch views              │               │
│  │  Escape       Cancel current action     │               │
│  └────────────────────────────────────────┘               │
│                                                            │
│  Data                                                      │
│  ────                                                     │
│  Default data domain:  [Personal ▼]                        │
│  ┌─────────────────────┐                                  │
│  │  Export Audit Log   │                                  │
│  └─────────────────────┘                                  │
│                                                            │
│  Account                                                   │
│  ───────                                                  │
│  Logged in as: george                                     │
│  ┌─────────────────┐  ┌─────────────────┐                │
│  │ Change Password │  │    Log Out      │                │
│  └─────────────────┘  └─────────────────┘                │
│                                                            │
│  About                                                     │
│  ─────                                                    │
│  AI Work Assistant v1.0.0                                 │
│  ┌─────────────────────┐                                  │
│  │  Check for Updates  │                                  │
│  └─────────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### 5.7 Accessibility Requirements

**Keyboard Navigation**:

| Shortcut            | Action                              |
| ------------------- | ----------------------------------- |
| `Tab` / `Shift+Tab` | Navigate between focusable elements |
| `Enter`             | Activate focused button/link        |
| `Escape`            | Close modal, cancel current action  |
| `Cmd+Enter`         | Submit message                      |
| `Cmd+Shift+A`       | Start/stop audio recording          |
| `Cmd+1`             | Switch to Chat view                 |
| `Cmd+2`             | Switch to Activity view             |
| `Cmd+3`             | Switch to Permissions view          |
| `Cmd+4`             | Switch to Skills view               |
| `Cmd+5`             | Switch to Settings view             |
| `Arrow keys`        | Navigate lists                      |

**Focus Management**:

- Focus indicators must be visible on all interactive elements
- Focus must be trapped within modals
- Focus should return to trigger element when modal closes

**High Contrast Mode**:

- Minimum contrast ratio: 7:1 for text
- Clear visual boundaries between UI sections
- No color-only indicators (always include text/icon)

**Large Text Mode**:

- Base font size increases from 14px to 18px
- All UI elements scale proportionally
- No horizontal scrolling required

---

## 6. Configuration

### 6.1 Model Configuration

```yaml
# config/models.yaml
evaluation_llm:
  provider: ollama
  model: qwen3-vl-4b
  endpoint: http://localhost:11434
  timeout_ms: 30000

expert_ai:
  default: qwen3-vl-4b
  cloud_enabled: false

  local_models:
    - id: qwen3-vl-4b
      name: Qwen 3 VL 4B
      provider: ollama
    - id: llama3.2
      name: Llama 3.2
      provider: ollama
    - id: mistral
      name: Mistral
      provider: ollama

  cloud_models:
    - id: claude-sonnet
      name: Claude Sonnet
      provider: claude
      endpoint: https://api.anthropic.com/v1/messages
      requires_api_key: true
    - id: gpt-4
      name: GPT-4
      provider: openai
      endpoint: https://api.openai.com/v1/chat/completions
      requires_api_key: true
    - id: servicenow-llm
      name: ServiceNow LLM
      provider: servicenow
      requires_api_key: true
```

### 6.2 MCP Server Configuration

```yaml
# config/mcp-servers.yaml
servers:
  - name: calendar
    type: public
    package: '@anthropic/mcp-server-calendar'
    capabilities:
      - read_events
      - create_event
      - update_event
      - delete_event
    default_data_domain: personal
    skill_required: calendar-operations

  - name: filesystem
    type: public
    package: '@anthropic/mcp-server-filesystem'
    capabilities:
      - read_file
      - write_file
      - list_directory
    default_data_domain: personal
    skill_required: filesystem-operations
    config:
      allowed_paths:
        - '~/Documents'
        - '~/Desktop'
        - '~/Notes'

# ServiceNow MCP: Phase 2
# - name: servicenow
#   type: custom
#   endpoint: configured_at_runtime
#   capabilities:
#     - list_tickets
#     - create_ticket
#     - update_ticket
#     - add_comment
#   default_data_domain: enterprise
#   skill_required: servicenow-operations
```

### 6.3 Application Configuration

```yaml
# Default application settings
app:
  name: AI Work Assistant
  version: 1.0.0
  platform: darwin # macOS only for Phase 1

  paths:
    data: ~/Library/Application Support/AIWorkAssistant
    logs: ~/Library/Logs/AIWorkAssistant

  auto_update:
    enabled: true
    check_interval_hours: 24

  session:
    timeout_minutes: 480 # 8 hours

  performance:
    proposal_generation_timeout_ms: 3000
    transcription_max_delay_ms: 5000
    sqlite_query_timeout_ms: 100
```

---

## 7. Error Handling

### 7.1 Error Categories

```typescript
type ErrorCategory =
  | 'input' // User input processing
  | 'llm' // LLM-related errors
  | 'policy' // Policy engine errors
  | 'execution' // MCP tool execution
  | 'storage' // Database/filesystem
  | 'network' // Network connectivity
  | 'auth' // Authentication
  | 'system'; // System-level errors

interface AppError {
  code: string;
  category: ErrorCategory;
  message: string;
  user_message: string; // User-friendly message
  recoverable: boolean;
  suggested_action?: string;
  metadata?: Record<string, unknown>;
}
```

### 7.2 Error Handling by Component

**Input Handler Errors**:

```typescript
const INPUT_ERRORS = {
  STT_UNAVAILABLE: {
    code: 'INPUT_001',
    category: 'input',
    message: 'FluidAudio STT service unavailable',
    user_message: 'Voice input is temporarily unavailable. Please use text input.',
    recoverable: true,
    suggested_action: 'Check microphone permissions in System Preferences',
  },
  MICROPHONE_DENIED: {
    code: 'INPUT_002',
    category: 'input',
    message: 'Microphone permission denied',
    user_message: 'Microphone access is required for voice input.',
    recoverable: true,
    suggested_action: 'Grant microphone permission in System Preferences > Privacy',
  },
  TRANSCRIPTION_FAILED: {
    code: 'INPUT_003',
    category: 'input',
    message: 'Transcription failed',
    user_message: 'Could not transcribe audio. Please try again or use text input.',
    recoverable: true,
  },
};
```

**LLM Errors**:

```typescript
const LLM_ERRORS = {
  OLLAMA_UNAVAILABLE: {
    code: 'LLM_001',
    category: 'llm',
    message: 'Cannot connect to Ollama',
    user_message: 'Local AI is not available. Please ensure Ollama is running.',
    recoverable: false,
    suggested_action: 'Install Ollama from https://ollama.ai and start it',
  },
  MODEL_NOT_FOUND: {
    code: 'LLM_002',
    category: 'llm',
    message: 'Requested model not found',
    user_message: 'The selected AI model is not installed.',
    recoverable: true,
    suggested_action: 'Run "ollama pull <model_name>" to install the model',
  },
  GENERATION_TIMEOUT: {
    code: 'LLM_003',
    category: 'llm',
    message: 'LLM generation timed out',
    user_message: 'AI response took too long. Please try again with a simpler request.',
    recoverable: true,
  },
  INVALID_PROPOSAL: {
    code: 'LLM_004',
    category: 'llm',
    message: 'LLM generated invalid proposal structure',
    user_message: 'AI could not process your request. Please rephrase.',
    recoverable: true,
  },
  CLOUD_API_ERROR: {
    code: 'LLM_005',
    category: 'llm',
    message: 'Cloud AI API error',
    user_message: 'Cloud AI service returned an error. Check your API key.',
    recoverable: true,
    suggested_action: 'Verify API key in Settings',
  },
};
```

**Policy Engine Errors**:

```typescript
const POLICY_ERRORS = {
  ENGINE_CRASH: {
    code: 'POLICY_001',
    category: 'policy',
    message: 'Policy engine crashed during evaluation',
    user_message: 'Security check failed. Action blocked for safety.',
    recoverable: false,
    // CRITICAL: Fail-safe - deny on policy engine failure
  },
  NO_MATCHING_SKILL: {
    code: 'POLICY_002',
    category: 'policy',
    message: 'No skill defines the requested operation',
    user_message: 'This action is not currently permitted. No skill authorizes it.',
    recoverable: false,
  },
  CONSTRAINT_VIOLATION: {
    code: 'POLICY_003',
    category: 'policy',
    message: 'Policy constraint violated',
    user_message: 'Action blocked by policy rules.',
    recoverable: false,
  },
};
```

**Execution Errors**:

```typescript
const EXECUTION_ERRORS = {
  TOOL_NOT_REGISTERED: {
    code: 'EXEC_001',
    category: 'execution',
    message: 'Attempted to invoke unregistered MCP tool',
    user_message: 'This action requires a tool that is not configured.',
    recoverable: false,
  },
  TOOL_INVOCATION_FAILED: {
    code: 'EXEC_002',
    category: 'execution',
    message: 'MCP tool returned error',
    user_message: 'Action failed. See details for more information.',
    recoverable: true,
  },
  PARTIAL_EXECUTION: {
    code: 'EXEC_003',
    category: 'execution',
    message: 'Action partially completed before failure',
    user_message: 'Action partially completed. Attempting rollback.',
    recoverable: true,
    suggested_action: 'Review Activity log for details',
  },
  ROLLBACK_FAILED: {
    code: 'EXEC_004',
    category: 'execution',
    message: 'Rollback operation failed',
    user_message: 'Could not undo the action. Manual intervention may be required.',
    recoverable: false,
    suggested_action: 'Contact support with the action ID from Activity log',
  },
};
```

**Storage Errors**:

```typescript
const STORAGE_ERRORS = {
  DATABASE_CORRUPT: {
    code: 'STORAGE_001',
    category: 'storage',
    message: 'SQLite database corrupted',
    user_message: 'Application data is corrupted. Backup may be required.',
    recoverable: false,
  },
  DISK_FULL: {
    code: 'STORAGE_002',
    category: 'storage',
    message: 'Insufficient disk space',
    user_message: 'Not enough disk space. Free up space and try again.',
    recoverable: true,
  },
  SKILL_FILE_INVALID: {
    code: 'STORAGE_003',
    category: 'storage',
    message: 'Skill YAML file is invalid',
    user_message: 'A skill configuration file has errors.',
    recoverable: true,
    suggested_action: 'Check skill files in ~/Library/Application Support/AIWorkAssistant/skills/',
  },
};
```
