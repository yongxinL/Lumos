# Locked Specification

**Status:** ✅ **LOCKED**
**Version:** v0.1.0
**Locked Date:** 2026-01-28
**Project:** Lumos - AI Work Assistant for ServiceNow

---

## Document Reference

The complete specification for this project is contained in:

**[../requirements/requirements.md](../requirements/requirements.md)**

This document contains 2,274 lines of detailed specifications including:

- System Overview and Non-Negotiable Rules
- Data Models (12 TypeScript interfaces)
- Core Services (8 service definitions)
- Storage Layer (SQLite, Filesystem, Keychain)
- UI Components (5 primary views)
- Configuration schemas
- Error handling strategies

---

## Specification Summary

### System Overview

**Goal:** Build a desktop-first AI Work Assistant that operates as a governed AI operating layer for ServiceNow-style work.

**Core Principle:** AI proposes, humans approve, system enforces governance.

### Non-Negotiable System Rules

1. AI must never execute actions directly
2. Every action must pass through: Structured proposal → Policy engine → User confirmation
3. No silent permission escalation
4. No free-form AI memory
5. No self-modifying policies or skills

### User Guarantees

- Observable: User can always see what AI is allowed/not allowed to do
- Reversible: High-risk actions require explicit confirmation and rollback plans
- Controllable: User can revoke AI permissions instantly

### Target Platform

- **Phase 1 (MVP):** macOS (Electron)
- **Future Phases:** Cross-platform support

---

## Core Architecture Components

### Services (8)

1. **Input Handler Service** - Text/audio input processing, FluidAudio STT
2. **Fast Path Service** - Pattern-based routing for non-action queries
3. **Evaluation LLM Service** - Local-only intent extraction (Ollama)
4. **Policy Engine** - Deterministic TypeScript constraint evaluation
5. **Expert AI Service** - Complex reasoning, user-selectable model
6. **Execution Layer** - MCP tool invocation
7. **Audit Service** - Append-only logging
8. **Trust Management Service** - Per-operation trust levels

### Data Models (12)

1. ActionProposal
2. Skill
3. Policy
4. TrustLevelRecord
5. AuditRecord
6. RollbackPlan
7. EntityReference
8. PolicyConstraint
9. ExecutionResult
10. UserPreferences
11. MeetingTranscript
12. ModelOption

### Storage Layer

| Type           | Location                                                 | Purpose                |
| -------------- | -------------------------------------------------------- | ---------------------- |
| SQLite         | ~/Library/Application Support/AIWorkAssistant/runtime.db | Runtime data           |
| Filesystem     | ~/Library/Application Support/AIWorkAssistant/           | Human-editable content |
| macOS Keychain | System keychain                                          | Sensitive credentials  |

### UI Components (5)

1. Chat View - Primary interaction interface
2. Activity View - Audit log browser
3. Permissions View - Trust level management
4. Skills View - Capability management
5. Settings View - Application configuration

---

## Phase 1 MVP Scope

### In Scope

- macOS Electron desktop application
- Dual-LLM architecture (Evaluation + Expert)
- FluidAudio STT integration via Swift bridge
- Ollama for local evaluation LLM
- MCP servers: Calendar, Filesystem
- Progressive trust delegation
- Append-only audit logging
- Local authentication

### Out of Scope (Phase 2+)

- ServiceNow MCP integration
- Enterprise data domain
- Cross-platform support
- SSO/OAuth integration
- Advanced meeting analysis

---

## Performance Requirements

| Metric                   | Target      |
| ------------------------ | ----------- |
| Fast path classification | <10ms       |
| Proposal generation      | 2-3 seconds |
| Policy evaluation        | <50ms       |
| Transcription delay      | <5 seconds  |
| SQLite queries           | <100ms      |

---

## Security Requirements

- Evaluation LLM must be local-only (no cloud fallback)
- Field-level encryption for PII (AES-256-GCM)
- Credentials stored in macOS Keychain only
- Append-only audit logs (immutable)
- MCP tool sandboxing and registration

---

## Lock Status

This specification is **LOCKED** as of 2026-01-28.

Changes to this specification require:

1. Formal change request
2. Impact analysis
3. Version increment
4. Re-approval from stakeholders

---

**Full Specification:** [../requirements/requirements.md](../requirements/requirements.md)

**Phase 1 Completion Report:** [phase-1-completion.md](phase-1-completion.md)

**Phase 2 Handoff:** [phase-2-handoff.md](phase-2-handoff.md)
