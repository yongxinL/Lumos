# Task Parallel Groups

**Project:** Lumos - AI Work Assistant
**Date:** 2026-01-28

---

## Overview

Tasks are organized into parallel groups within milestones. Tasks within the same group can be worked on simultaneously by different developers or AI sessions.

---

## Milestone Summary

| Milestone       | Tasks  | Parallel Groups | Effort (hrs) | Tokens (K) | Model Mix                 |
| --------------- | ------ | --------------- | ------------ | ---------- | ------------------------- |
| M1: Foundation  | 7      | 2               | 24           | 95         | 4 Haiku, 3 Sonnet         |
| M2: Input       | 5      | 2               | 20           | 85         | 2 Haiku, 3 Sonnet         |
| M3: AI Services | 6      | 2               | 28           | 120        | 1 Haiku, 4 Sonnet, 1 Opus |
| M4: Governance  | 6      | 2               | 32           | 150        | 6 Sonnet                  |
| M5: Execution   | 6      | 2               | 24           | 100        | 2 Haiku, 4 Sonnet         |
| M6: UI          | 9      | 3               | 36           | 140        | 4 Haiku, 5 Sonnet         |
| M7: Testing     | 8      | 3               | 28           | 100        | 5 Haiku, 3 Sonnet         |
| M8: Release     | 6      | 2               | 16           | 60         | 4 Haiku, 2 Sonnet         |
| **Total**       | **53** | -               | **208**      | **850**    | -                         |

---

## M1: Foundation & Core Infrastructure

### Group 1.A (Start Immediately)

| Task    | Name                      | Effort | Tokens | Model  |
| ------- | ------------------------- | ------ | ------ | ------ |
| T-1.1.1 | Project Setup & Tooling   | 4h     | 15K    | Haiku  |
| T-1.1.4 | Type Definitions & Models | 4h     | 20K    | Sonnet |

### Group 1.B (After T-1.1.1)

| Task    | Name                         | Effort | Tokens | Model |
| ------- | ---------------------------- | ------ | ------ | ----- |
| T-1.1.2 | Database Schema & Migrations | 4h     | 15K    | Haiku |
| T-1.2.1 | Electron Main Process Setup  | 4h     | 15K    | Haiku |
| T-1.2.2 | React Renderer Setup         | 4h     | 15K    | Haiku |

### Group 1.C (After T-1.1.2, T-1.2.1, T-1.2.2)

| Task    | Name                         | Effort | Tokens | Model  |
| ------- | ---------------------------- | ------ | ------ | ------ |
| T-1.1.3 | Storage Layer Implementation | 4h     | 20K    | Sonnet |
| T-1.2.3 | IPC Bridge Implementation    | 4h     | 20K    | Sonnet |

---

## M2: Input & Classification

### Group 2.A (After M1)

| Task    | Name                  | Effort | Tokens | Model  |
| ------- | --------------------- | ------ | ------ | ------ |
| T-2.1.1 | Fast Path Service     | 4h     | 15K    | Haiku  |
| T-2.2.1 | Swift Helper Scaffold | 4h     | 20K    | Sonnet |

### Group 2.B (After Group 2.A)

| Task    | Name                   | Effort | Tokens | Model  |
| ------- | ---------------------- | ------ | ------ | ------ |
| T-2.1.2 | Input Handler Service  | 4h     | 15K    | Haiku  |
| T-2.2.2 | FluidAudio Integration | 6h     | 25K    | Sonnet |

### Group 2.C (After Group 2.B)

| Task    | Name                      | Effort | Tokens | Model  |
| ------- | ------------------------- | ------ | ------ | ------ |
| T-2.2.3 | Swift-Electron IPC Bridge | 6h     | 25K    | Sonnet |

---

## M3: AI Services

### Group 3.A (After M1)

| Task    | Name                  | Effort | Tokens | Model  |
| ------- | --------------------- | ------ | ------ | ------ |
| T-3.1.1 | Ollama Client         | 4h     | 15K    | Haiku  |
| T-3.2.1 | AI Provider Interface | 4h     | 20K    | Sonnet |

### Group 3.B (After Group 3.A)

| Task    | Name                   | Effort | Tokens | Model  |
| ------- | ---------------------- | ------ | ------ | ------ |
| T-3.1.2 | Evaluation LLM Service | 6h     | 25K    | Sonnet |
| T-3.2.2 | Expert AI Service      | 6h     | 25K    | Sonnet |

### Group 3.C (After Group 3.B)

| Task    | Name                      | Effort | Tokens | Model  |
| ------- | ------------------------- | ------ | ------ | ------ |
| T-3.1.3 | Constrained JSON Decoding | 6h     | 30K    | Opus   |
| T-3.2.3 | Cloud Provider Clients    | 6h     | 20K    | Sonnet |

---

## M4: Governance Pipeline (Critical Path)

### Group 4.A (After M1)

| Task    | Name                      | Effort | Tokens | Model  |
| ------- | ------------------------- | ------ | ------ | ------ |
| T-4.1.1 | Skill Registry            | 6h     | 25K    | Sonnet |
| T-4.2.1 | Trust Level State Machine | 6h     | 25K    | Sonnet |

### Group 4.B (After Group 4.A)

| Task    | Name                     | Effort | Tokens | Model  |
| ------- | ------------------------ | ------ | ------ | ------ |
| T-4.1.2 | Constraint Evaluator     | 6h     | 30K    | Sonnet |
| T-4.2.2 | Trust Management Service | 6h     | 25K    | Sonnet |

### Group 4.C (After Group 4.B)

| Task    | Name               | Effort | Tokens | Model  |
| ------- | ------------------ | ------ | ------ | ------ |
| T-4.1.3 | Policy Engine Core | 8h     | 35K    | Sonnet |
| T-4.2.3 | Attestation System | 4h     | 15K    | Sonnet |

---

## M5: Execution & Audit

### Group 5.A (After M2, M3, M4)

| Task    | Name                      | Effort | Tokens | Model  |
| ------- | ------------------------- | ------ | ------ | ------ |
| T-5.1.1 | MCP Client Implementation | 4h     | 15K    | Haiku  |
| T-5.2.2 | Audit Service             | 6h     | 25K    | Sonnet |

### Group 5.B (After Group 5.A)

| Task    | Name                | Effort | Tokens | Model  |
| ------- | ------------------- | ------ | ------ | ------ |
| T-5.1.2 | MCP Server Registry | 4h     | 15K    | Haiku  |
| T-5.2.1 | Rollback Manager    | 6h     | 25K    | Sonnet |

### Group 5.C (After Group 5.B)

| Task    | Name            | Effort | Tokens | Model  |
| ------- | --------------- | ------ | ------ | ------ |
| T-5.1.3 | Execution Layer | 6h     | 25K    | Sonnet |
| T-5.2.3 | Audit Export    | 4h     | 15K    | Sonnet |

---

## M6: User Interface

### Group 6.A (After M1)

| Task    | Name                | Effort | Tokens | Model |
| ------- | ------------------- | ------ | ------ | ----- |
| T-6.1.1 | Navigation & Layout | 4h     | 15K    | Haiku |

### Group 6.B (After Group 6.A)

| Task    | Name                 | Effort | Tokens | Model  |
| ------- | -------------------- | ------ | ------ | ------ |
| T-6.1.2 | Chat View Components | 6h     | 20K    | Sonnet |
| T-6.2.1 | Activity View        | 4h     | 15K    | Haiku  |
| T-6.2.2 | Permissions View     | 4h     | 15K    | Haiku  |
| T-6.2.3 | Skills View          | 4h     | 15K    | Haiku  |
| T-6.2.4 | Settings View        | 4h     | 15K    | Sonnet |

### Group 6.C (After Group 6.B, M5)

| Task    | Name                         | Effort | Tokens | Model  |
| ------- | ---------------------------- | ------ | ------ | ------ |
| T-6.1.3 | Proposal Card                | 4h     | 20K    | Sonnet |
| T-6.3.1 | Accessibility Implementation | 4h     | 15K    | Sonnet |
| T-6.3.2 | Keyboard Shortcuts           | 4h     | 15K    | Sonnet |

---

## M7: Integration & Testing

### Group 7.A (After M5, M6)

| Task    | Name                | Effort | Tokens | Model  |
| ------- | ------------------- | ------ | ------ | ------ |
| T-7.1.1 | End-to-End Pipeline | 6h     | 25K    | Sonnet |
| T-7.2.1 | Unit Tests          | 4h     | 15K    | Haiku  |

### Group 7.B (After Group 7.A)

| Task    | Name                       | Effort | Tokens | Model |
| ------- | -------------------------- | ------ | ------ | ----- |
| T-7.1.2 | MCP Calendar Integration   | 4h     | 15K    | Haiku |
| T-7.1.3 | MCP Filesystem Integration | 4h     | 15K    | Haiku |
| T-7.2.2 | Integration Tests          | 4h     | 15K    | Haiku |

### Group 7.C (After Group 7.B)

| Task    | Name                | Effort | Tokens | Model  |
| ------- | ------------------- | ------ | ------ | ------ |
| T-7.2.3 | E2E Tests           | 4h     | 15K    | Haiku  |
| T-7.3.1 | Security Testing    | 4h     | 15K    | Sonnet |
| T-7.3.2 | Performance Testing | 4h     | 15K    | Sonnet |

---

## M8: Packaging & Release

### Group 8.A (After M7)

| Task    | Name                     | Effort | Tokens | Model |
| ------- | ------------------------ | ------ | ------ | ----- |
| T-8.1.1 | macOS Build Config       | 4h     | 10K    | Haiku |
| T-8.2.1 | Builtin Skills Packaging | 4h     | 10K    | Haiku |

### Group 8.B (After Group 8.A)

| Task    | Name                        | Effort | Tokens | Model  |
| ------- | --------------------------- | ------ | ------ | ------ |
| T-8.1.2 | Code Signing & Notarization | 4h     | 15K    | Sonnet |
| T-8.2.2 | Default Policies            | 4h     | 10K    | Haiku  |

### Group 8.C (After Group 8.B)

| Task    | Name                 | Effort | Tokens | Model  |
| ------- | -------------------- | ------ | ------ | ------ |
| T-8.1.3 | Auto-Update Setup    | 4h     | 15K    | Sonnet |
| T-8.2.3 | Documentation & Help | 4h     | 10K    | Haiku  |

---

## Token Budget Summary

### By Model

| Model      | Tasks  | Tokens   | Est. Cost  |
| ---------- | ------ | -------- | ---------- |
| Haiku 4.5  | 22     | 280K     | ~$0.28     |
| Sonnet 4.5 | 30     | 540K     | ~$1.62     |
| Opus 4.5   | 1      | 30K      | ~$0.45     |
| **Total**  | **53** | **850K** | **~$2.35** |

### By Milestone

| Milestone       | Tokens | Cost  |
| --------------- | ------ | ----- |
| M1: Foundation  | 95K    | $0.30 |
| M2: Input       | 85K    | $0.26 |
| M3: AI Services | 120K   | $0.40 |
| M4: Governance  | 150K   | $0.45 |
| M5: Execution   | 100K   | $0.31 |
| M6: UI          | 140K   | $0.43 |
| M7: Testing     | 100K   | $0.30 |
| M8: Release     | 60K    | $0.18 |

---

## Session Strategy

**Recommended Approach:**

1. **Session 1 (Sonnet):** M1 + M2.A - Foundation setup (~180K tokens)
2. **Session 2 (Sonnet):** M2.B-C + M3 - Input & AI Services (~205K tokens)
3. **Session 3 (Sonnet):** M4 - Governance Pipeline (~150K tokens)
4. **Session 4 (Sonnet):** M5 + M6.A-B - Execution & UI (~240K tokens)
5. **Session 5 (Sonnet):** M6.C + M7 - UI & Testing (~140K tokens)
6. **Session 6 (Sonnet):** M8 - Release (~60K tokens)

**Total Sessions:** 6 (with Sonnet 4.5)
**Total Tokens:** ~850K
**Total Est. Cost:** ~$2.35 (input only, excludes output)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-28
