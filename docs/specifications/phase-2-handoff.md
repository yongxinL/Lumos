# Session Handoff: Requirements → Planning

**Session Type:** Phase Transition
**From Phase:** 1 (Requirements)
**To Phase:** 2 (Planning)
**Model Recommendation:** **Claude Opus 4.5** ⭐
**Date:** 2026-01-28
**Framework:** CodeMaestro v1.1.0 (Phoenix)

---

## Context Summary

**Project:** Lumos - AI Work Assistant for ServiceNow

**Locked Specification:**
- System Architecture: 8 core services defined
- Data Models: 12 comprehensive TypeScript interfaces
- UI Components: 5 primary views specified
- Storage Schema: SQLite + Filesystem + macOS Keychain
- Phase 1 MVP Scope: macOS/Electron with local-first AI

**Core System Principle:**
Governed AI operating layer where **AI proposes**, **humans approve**, **system enforces**.

**Domain:** AI/Enterprise Productivity (ServiceNow integration)

---

## What Was Accomplished

✅ **Comprehensive Requirements Document**: [docs/requirements/requirement_v02.md](../requirements/requirement_v02.md)
- 2,274 lines of detailed specifications
- Complete TypeScript interface definitions
- Service architecture with clear responsibilities
- Data models with governance constraints
- UI/UX specifications with accessibility requirements
- Storage layer design with encryption strategy

✅ **System Architecture Overview**:
- **Dual-LLM Design**: Evaluation LLM (local/Ollama) + Expert AI (local/cloud)
- **Policy Engine**: Deterministic TypeScript constraint evaluation
- **Trust Management**: Progressive levels (OBSERVE → SUPERVISED → DELEGATED)
- **Audit System**: Append-only logging with full traceability
- **MCP Integration**: Calendar and Filesystem (Phase 1), ServiceNow (Phase 2)

✅ **Non-Negotiable System Rules Defined**:
1. AI must never execute actions directly
2. Every action passes through: Proposal → Policy → Confirmation
3. No silent permission escalation
4. No free-form AI memory
5. No self-modifying policies or skills

✅ **Phase 1 MVP Scope Locked**:
- Platform: macOS only (Electron)
- STT: FluidAudio integration via Swift bridge
- Local LLM: Ollama with constrained JSON decoding
- MCP Servers: Calendar, Filesystem
- Authentication: Local accounts
- ServiceNow: Deferred to Phase 2

---

## Current Focus

**Next Step:** Begin Phase 2 (Planning and Architecture)

**What needs to happen next:**

1. **Load Planning Phase Prompt**: Read `.CodeMaestro/prompts/02-planning.md`
2. **Activate Software Architect Role**
3. **Start with Step 2.1**: Specification Resolution
4. **Create Technical Blueprint** from locked requirements

**Recommended Model:** **Claude Opus 4.5**

**Rationale for Opus:**
- ✅ Complex architectural reasoning required (dual-LLM, policy engine, trust system)
- ✅ Strict governance/security constraints must be architecturally guaranteed
- ✅ Multiple integration points: Ollama, MCP, Swift-Electron, Keychain
- ✅ High cost of architectural mistakes in security-sensitive system
- ✅ Need to identify edge cases and design rollback mechanisms
- ✅ Novel architecture (not common CRUD app) requires deep reasoning

---

## Critical Context

### Key Architectural Components

**1. Dual-LLM Architecture**
- **Evaluation LLM** (Ollama, local-only):
  - Fast intent extraction (~2-3s target)
  - Constrained JSON decoding (grammar-based)
  - Model: qwen3-vl-4b (recommended)
  - No tool execution capability

- **Expert AI** (flexible):
  - Complex reasoning and planning
  - User-selectable (local or cloud)
  - Options: Ollama, Claude, GPT-4, ServiceNow LLM
  - Cannot bypass policy engine

**2. Governance Stack**
- **Policy Engine**: Deterministic TypeScript evaluation (<50ms target)
- **Skills System**: YAML-defined capabilities with constraints
- **Trust Management**: Per-operation trust levels with attestation
- **Audit Service**: Immutable append-only logs

**3. Integration Points**
- **FluidAudio** (macOS): Swift-Electron bridge for STT
- **Ollama**: Local LLM hosting and inference
- **MCP Servers**: Tool execution framework
- **macOS Keychain**: Credential storage via Electron safeStorage

### Requirements to Remember

**Critical Non-Functional Requirements:**
- **NFR-001 (Governance)**: No action execution without policy approval
- **NFR-002 (Observability)**: All AI behavior must be auditable
- **NFR-003 (Reversibility)**: High-risk actions require rollback plans
- **NFR-004 (Local-First)**: Evaluation LLM must be local (no cloud fallback)
- **NFR-005 (Performance)**: Fast path classification <10ms, proposal generation <3s
- **NFR-006 (Security)**: Field-level encryption for PII, keychain for credentials

**Critical Functional Requirements:**
- **FR-001**: Dual input modes (text + voice with FluidAudio STT)
- **FR-002**: Fast path routing for non-action queries
- **FR-003**: Structured proposal generation with constrained JSON
- **FR-004**: Skill-based capability system with version hashing
- **FR-005**: Progressive trust delegation with attestation
- **FR-006**: Rollback capability for reversible operations

---

## Critical Technical Decisions Needed (Phase 2)

### 1. Swift-Electron Bridge Architecture
**Question**: How to structure the macOS Swift bridge for FluidAudio?
- Option A: Native Node module with N-API
- Option B: IPC bridge with separate Swift process
- Option C: Electron native module wrapper
- **Considerations**: Performance, memory, lifecycle management, error handling

### 2. Ollama Constrained JSON Configuration
**Question**: How to enforce JSON schema in Ollama generation?
- Requirement: Grammar-based constrained decoding
- **Considerations**: Ollama API format parameter, schema validation fallback, error recovery

### 3. MCP Server Management
**Question**: How to register, configure, and lifecycle-manage MCP servers?
- **Considerations**: Discovery, authentication, health checks, failover, sandboxing

### 4. Policy Engine Performance
**Question**: What's the caching and optimization strategy?
- Requirement: <50ms evaluation time
- **Considerations**: Skill matching, constraint compilation, memoization, hot path optimization

### 5. Rollback Mechanism Design
**Question**: Per-operation rollback strategies?
- Types: FULL, PARTIAL, COMPENSATABLE, IRREVERSIBLE
- **Considerations**: State capture, undo stack, compensation actions, error handling

### 6. Encryption Key Management
**Question**: Key generation, storage, rotation, recovery approach?
- Requirement: AES-256-GCM with macOS Keychain
- **Considerations**: First-run setup, backup/recovery, key rotation schedule

### 7. Trust Level State Machine
**Question**: Exact promotion/demotion rules and attestation workflow?
- **Considerations**: Success tracking, rollback impact, attestation UX, grace periods

### 8. Module Boundaries
**Question**: How to decompose into implementable modules with clear interfaces?
- **Considerations**: Service boundaries, dependency injection, testing seams

---

## Open Questions for Planning

1. **Swift Bridge**: Should the FluidAudio bridge be in-process or out-of-process?
2. **Policy Engine**: Compile constraints to functions or interpret at runtime?
3. **MCP Plugin System**: Should we support custom MCP server registration UI?
4. **Ollama Updates**: How to handle model updates without breaking saved proposals?
5. **Multi-Step Rollback**: Strategy for partially-completed actions across multiple MCP calls?
6. **Skill Versioning**: How to handle skill updates when proposals reference old versions?
7. **Offline Mode**: What functionality is available when Ollama is unavailable?
8. **Error Recovery**: Fast path vs full recovery for policy engine failures?

---

## Artifacts & Files

### Key Files for Phase 2 Planning

**Essential References:**
- 📄 **[docs/requirements/requirement_v02.md](../requirements/requirement_v02.md)** - **START HERE** (2,274 lines)
- 📄 **[CLAUDE.md](../../CLAUDE.md)** - Project instructions and CodeMaestro integration
- 📄 **[.CodeMaestro/prompts/02-planning.md](../../.CodeMaestro/prompts/02-planning.md)** - Phase 2 workflow

**Framework References:**
- 📄 [.CodeMaestro/config/constraints-reference.md](../../.CodeMaestro/config/constraints-reference.md) - Design constraints
- 📄 [.CodeMaestro/agents/architect.md](../../.CodeMaestro/agents/architect.md) - Architect role definition
- 📄 [.CodeMaestro/config/quality-gates.md](../../.CodeMaestro/config/quality-gates.md) - Quality thresholds

**Documentation Structure:**
```
docs/
├── requirements/
│   └── requirement_v02.md          ← Requirements source
├── specifications/
│   ├── phase-1-completion.md       ← Phase 1 report
│   └── phase-2-handoff.md          ← This document
└── architecture/                   ← Phase 2 deliverables go here
    ├── blueprint.md                (to be created)
    ├── task-dag.mermaid            (to be created)
    ├── adrs/                       (to be created)
    └── tasks/                      (to be created)
```

---

## Token Metrics

### Phase 1 Session
- **Model Used**: Claude Sonnet 4.5 (1M context)
- **Tokens Used**: ~52K tokens (5.2%)
- **Phase 1 Target**: 5K-15K per session
- **Status**: ✅ Within expected range

### Phase 2 Estimate (Opus 4.5)
- **Expected**: 15K-40K tokens per session
- **Tasks**: ~10-15 architectural tasks
- **Total Estimate**: 150K-300K tokens
- **Sessions Needed**: 1-2 sessions (Opus 4.5 @ 1M context)

**Phase 2 Deliverables:**
1. Technical blueprint (architecture overview)
2. Component decomposition with interfaces
3. Technology spike validation (Ollama, Swift bridge, MCP)
4. Task DAG with dependencies
5. Architecture Decision Records (ADRs)
6. Risk mitigation strategies
7. Implementation milestones with acceptance criteria

---

## Git State

**Current Branch:** `dev`
**Main Branch:** `main`
**Last Commit:** `a841af2 - fix: add missing CLAUDE.md`

**Git Status:**
```
?? docs/requirements/
```

**Recommended Git Workflow for Phase 2:**
1. Commit Phase 1 checkpoint documents
2. Create git tag: `v0.1.0-spec` (requirements complete)
3. Work on `dev` branch for Phase 2 planning
4. Create feature branches for architecture spikes if needed
5. Tag completion: `v0.2.0-plan` (planning complete)

**Branch Strategy:**
- `main` - Production-ready code
- `dev` - Integration branch (current)
- `feature/*` - Milestone features
- `task/*` - Individual tasks

---

## Next Phase Preparation

### Phase 2 Entry Conditions (All Met ✅)

- [x] Requirements document complete and comprehensive
- [x] System architecture conceptually defined
- [x] Non-negotiable constraints identified
- [x] Phase 1 MVP scope locked
- [x] Phase 1 completion documented
- [x] Handoff package prepared

### Phase 2 Success Criteria

**Must Deliver:**
1. ✅ Technical blueprint with module decomposition
2. ✅ Technology stack validation (spikes for Ollama, Swift, MCP)
3. ✅ Architecture Decision Records (ADRs) for critical decisions
4. ✅ Task DAG with dependencies and estimates
5. ✅ Implementation milestones with acceptance criteria
6. ✅ Risk assessment and mitigation strategies
7. ✅ API contracts and interface definitions
8. ✅ Test strategy and coverage plan

**Expected Duration:** 8-12 hours (Opus 4.5)
**Primary Role:** Software Architect
**Supporting Roles:** Security Engineer, DevOps Engineer, Tech Lead

---

## Model Selection Rationale

### Why Opus 4.5 for Phase 2?

**Architectural Complexity** ⭐⭐⭐⭐⭐
- Novel dual-LLM design with governance layer
- Multiple integration boundaries (Swift, Ollama, MCP, Electron)
- Security-critical policy engine design
- Progressive trust system state machine

**Risk Profile** ⭐⭐⭐⭐⭐
- Constrained JSON decoding with Ollama (unproven)
- Swift-Electron bridge (custom architecture)
- Policy engine performance at scale
- Rollback mechanism design for multi-step operations

**Architectural Guarantees Required** ⭐⭐⭐⭐⭐
- Security constraints must be architecturally enforced, not just implemented
- No silent permission escalation (architecture must prevent)
- Append-only audit logs (storage design must guarantee)

**Cost-Benefit Analysis:**
- Opus Phase 2: ~$5-10 for 200K tokens @ ~$15/1M input
- Risk of architectural mistakes: High (security, governance, novel design)
- Cost of rework: Very high (affects all subsequent phases)
- **Conclusion**: Opus investment justified

### Alternative: Sonnet 4.5

**When Sonnet would be acceptable:**
- Standard CRUD architecture
- Well-established patterns
- Lower security requirements
- Budget-constrained project
- Willing to iterate and refine architecture during implementation

**For Lumos:** Not recommended due to governance requirements and novel architecture.

---

## Phase 2 First Steps

### Immediate Actions (Do These First)

1. **Read Phase 2 Prompt**
   ```bash
   # Load the planning phase workflow
   cat .CodeMaestro/prompts/02-planning.md
   ```

2. **Review Requirements in Detail**
   - Focus on Section 3: Core Services (lines 295-1195)
   - Study Section 2: Data Models (lines 54-292)
   - Understand Section 4: Storage Layer (lines 1198-1531)

3. **Validate Technology Choices**
   - Confirm Ollama supports constrained JSON decoding
   - Research Swift-Electron bridge patterns
   - Verify MCP server availability (Calendar, Filesystem)
   - Assess FluidAudio integration feasibility

4. **Begin Blueprint**
   - Create [docs/architecture/blueprint.md](../architecture/blueprint.md)
   - Start with high-level component diagram
   - Define module boundaries and interfaces
   - Establish data flow paths

5. **Identify Spikes**
   - List technical unknowns requiring validation
   - Prioritize by risk (e.g., Ollama constrained JSON first)
   - Plan spike tasks for validation

---

## Summary

**Phase 1 Status:** ✅ **COMPLETE**

**Deliverables Ready:**
- Comprehensive requirements document (2,274 lines)
- System architecture conceptual design
- Data models and interfaces defined
- UI/UX specifications complete
- Storage strategy defined
- Phase 1 checkpoint documented

**Phase 2 Ready to Start:** ✅

**Recommended Approach:**
1. Use **Claude Opus 4.5** for Phase 2 planning
2. Start with technology validation spikes
3. Create comprehensive technical blueprint
4. Generate task DAG with dependencies
5. Document architecture decisions in ADRs
6. Return to **Sonnet 4.5** for Phase 3 implementation

**Key Success Factor:**
Get the architecture right in Phase 2. The governance constraints are non-negotiable and must be architecturally guaranteed, not just implemented. Invest in thorough planning to avoid costly rework.

---

**Handoff Complete** ✅
**Next Agent:** Software Architect (Opus 4.5)
**Next Phase:** Phase 2 - Planning & Architecture
**Start Date:** 2026-01-28

---

*This handoff document was generated by CodeMaestro v1.1.0 (Phoenix) following the Phase 1 → Phase 2 transition protocol.*
