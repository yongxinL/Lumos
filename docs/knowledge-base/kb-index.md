# Knowledge Base Index

**Version:** 1.1
**Last Updated:** 2026-01-29
**Purpose:** Central index of organizational learning across all projects

> **Usage:** This index provides quick access to failures, patterns, and decisions captured during development. Load this file instead of reading all KB entries for token efficiency.

---

## Index Summary

| Category  | Count  | Last Updated |
| --------- | ------ | ------------ |
| Failures  | 2      | 2026-01-29   |
| Successes | 2      | 2026-01-29   |
| Patterns  | 1      | 2026-01-29   |
| Decisions | 3      | 2026-01-29   |
| Instincts | 14     | 2026-01-29   |
| **Total** | **22** | 2026-01-29   |

---

## Failures Index

### F001: Electron/Node.js Version Documentation Error

**Date:** 2026-01-29
**Project:** Lumos
**Severity:** High
**Status:** Resolved

**Summary:** Documentation incorrectly stated Electron 33 provides Node.js 22 (actually 20.18.0). Would have caused runtime incompatibility. Fixed by upgrading to Electron 39 (correct Node.js 22.20.0).

**Key Lesson:** Always verify version claims with official sources before implementation.

**File:** [failures/F001-electron-node-version-documentation-error.md](failures/F001-electron-node-version-documentation-error.md)

---

### F002: ESLint v9 Configuration Format Migration

**Date:** 2026-01-29
**Project:** Lumos
**Severity:** Medium
**Status:** Resolved

**Summary:** ESLint v9 deprecated `.eslintrc.*` format in favor of `eslint.config.js`. Setup guide used `.eslintrc.js` causing lint verification to fail. Required migration to new config format and installation of additional dependencies (@eslint/js, globals, explicit React/TypeScript plugins).

**Key Lesson:** Major tool version upgrades may include breaking changes to configuration formats. Validate ecosystem compatibility before setup.

**File:** [failures/F002-eslint-v9-configuration-format-migration.md](failures/F002-eslint-v9-configuration-format-migration.md)

---

## Successes Index

### S001: Electron Main Process & React Renderer Integration

**Date:** 2026-01-29
**Project:** Lumos
**Tasks:** T-1.2.1, T-1.2.2
**Status:** Completed
**Confidence:** 0.95

**Summary:** Successfully implemented production-ready Electron main process with React renderer, Tailwind CSS styling, and Zustand state management. All 14 acceptance criteria completed without blockers. Build metrics: 259.20 kB JS, 19.38 kB CSS, 100% verification gates passing.

**Key Achievements:**

- Security-first architecture (context isolation, sandbox, preload whitelist)
- Three Zustand stores with localStorage persistence
- Tailwind CSS with HSL design tokens and dark mode support
- Error boundary for production error handling
- System tray, menu bar, and global keyboard shortcuts
- electron-updater configured for macOS auto-updates

**Why It Succeeded:**

- Pre-existing foundation (T-1.1.3, T-1.1.4) eliminated blockers
- Clear acceptance criteria aligned with implementation
- No scope creep, focused on core functionality
- Architecture patterns align with React community best practices
- Security hardening done from start

**File:** [successes/S001-electron-react-renderer-integration.md](successes/S001-electron-react-renderer-integration.md)

---

### S003: Type-Safe IPC Bridge Implementation

**Date:** 2026-01-29
**Project:** Lumos
**Task:** T-1.2.3
**Status:** Completed
**Confidence:** 0.95

**Summary:** Implemented comprehensive type-safe IPC bridge for Electron with React hooks, message validation, and event-driven architecture. Created 40+ type-safe channels, 8 React hooks (useIPC, useIPCMutation, useIPCQuery), AJV validation for critical channels, and middleware system for logging/rate-limiting.

**Key Achievements:**

- Full TypeScript type safety with mapped types (IPCChannel → Payload → Response)
- React Query-inspired hooks for familiar developer experience
- Automatic error handling and memory cleanup
- Production-ready validation with AJV
- Throttled/debounced event emitters for high-frequency updates

**Why It Succeeded:**

- Layered architecture (types → transport → handlers → validation → React)
- Complete separation of concerns
- Developer experience prioritized (IntelliSense, familiar patterns)
- Global type declarations in separate .d.ts file prevented conflicts

**File:** [successes/S003-ipc-bridge-type-safe-implementation.md](successes/S003-ipc-bridge-type-safe-implementation.md)

---

## Patterns Index

### P001: Dependency Version Verification

**Date:** 2026-01-29
**Context:** Electron desktop app tech stack selection
**Applicability:** Any project with complex dependency chains
**Maturity:** Proven (1 successful application)

**Summary:** Systematic multi-step process for verifying dependency versions against authoritative sources, checking ecosystem readiness, and validating compatibility chains.

**Use When:** Selecting tech stack, auditing dependencies, or verifying documentation claims.

**File:** [patterns/P001-dependency-version-verification.md](patterns/P001-dependency-version-verification.md)

---

## Decisions Index

### D001: Lumos Tech Stack Version Selection (2026)

**Date:** 2026-01-29
**Project:** Lumos
**Status:** Approved & Implemented

**Summary:** Selected React 19.2.0 + Electron 39.0.0 with comprehensive updates to 24+ dependencies. Rejected outdated Electron 33 + React 18 stack after discovering documentation errors.

**Key Outcomes:**

- Modern, production-ready tech stack
- React 19 stable for 13+ months
- Correct Node.js 22 runtime via Electron 39
- All dependencies verified and updated

**File:** [decisions/D001-tech-stack-version-selection-2026.md](decisions/D001-tech-stack-version-selection-2026.md)

---

### D002: Frontend Stack Selection - Zustand + Tailwind + electron-updater

**Date:** 2026-01-29
**Project:** Lumos
**Status:** Approved & Implemented

**Summary:** Selected Zustand for state management, Tailwind CSS for styling, and electron-updater for app updates. Decision prioritizes developer experience, bundle size, and simplicity over feature richness, matching Lumos' moderate complexity profile (3 stores, 5 views).

**Why These Choices:**

- **Zustand:** Perfect for 1-5 stores (current needs). 2.4 kB vs Redux 10+ kB. Built-in persistence. Full TypeScript support.
- **Tailwind CSS:** Utility-first = faster development. Design tokens via CSS custom properties. Dark mode support. Works with shadcn/ui.
- **electron-updater:** Electron team recommendation. Zero configuration. Auto-updates for macOS. User notifications.

**Options Evaluated:**

1. Redux + styled-components (rejected: 600+ LOC boilerplate, 10+ kB overhead)
2. **Zustand + Tailwind + electron-updater (selected)** ✅
3. MobX + CSS Modules (rejected: over-complex for 3 stores)

**Trade-offs:**

- No Redux DevTools (mitigated: React DevTools sufficient for 3 stores)
- Zustand only ideal for 1-5 stores (clear upgrade path to Redux if needed)
- Tailwind lower-level than Bootstrap (mitigated: shadcn/ui provides components)

**File:** [decisions/D002-frontend-stack-selection-zustand-tailwind.md](decisions/D002-frontend-stack-selection-zustand-tailwind.md)

---

### D003: IPC React Hooks Pattern Selection

**Date:** 2026-01-29
**Project:** Lumos
**Task:** T-1.2.3
**Status:** Accepted & Implemented

**Summary:** Adopted React Query-inspired hooks pattern for IPC communication: useIPC(), useIPCMutation(), useIPCQuery(), useIPCEvent(). Provides familiar developer experience with automatic loading/error states, type safety, and memory cleanup.

**Why This Pattern:**

- React Query patterns widely adopted (100K+ weekly downloads)
- Automatic state management (loading, error, success)
- Full TypeScript inference from channel → payload → response
- Memory safety with auto-cleanup on unmount
- Familiar to web developers transitioning to Electron

**Alternatives Rejected:**

- Redux-style actions (more boilerplate, less type-safe)
- Simple wrapper hook (no query/mutation distinction)
- Context-based provider (extra layer, harder to test)
- RxJS observables (overkill, steeper learning curve)

**Trade-offs:**

- Different from traditional Electron IPC patterns (more web-like)
- Future React Query migration requires refactor
- Can't call hooks conditionally (React rules apply)

**File:** [decisions/D003-ipc-react-hooks-pattern.md](decisions/D003-ipc-react-hooks-pattern.md)

---

## Instincts Index

### Session 1: Tech Stack Verification (2026-01-29)

| Instinct                                                                             | Confidence | Domain        | Trigger                         |
| ------------------------------------------------------------------------------------ | ---------- | ------------- | ------------------------------- |
| [verify-electron-node-version](instincts/personal/verify-electron-node-version.md)   | 0.9        | validation    | When selecting Electron version |
| [use-multi-source-verification](instincts/personal/use-multi-source-verification.md) | 0.8        | validation    | When verifying version claims   |
| [validate-compatibility-chains](instincts/personal/validate-compatibility-chains.md) | 0.8        | validation    | When using native dependencies  |
| [check-ecosystem-readiness](instincts/personal/check-ecosystem-readiness.md)         | 0.7        | validation    | When considering major updates  |
| [audit-all-when-one-wrong](instincts/personal/audit-all-when-one-wrong.md)           | 0.7        | validation    | When finding version errors     |
| [document-verification-sources](instincts/personal/document-verification-sources.md) | 0.7        | documentation | When making version claims      |

**Summary:** Learned from Electron 33→39 + React 18→19 upgrade session. All instincts reinforce verification-first approach to tech stack selection.

### Session 2: Build Tool Ecosystem (2026-01-29)

| Instinct                                                                                       | Confidence | Domain      | Trigger                                                          |
| ---------------------------------------------------------------------------------------------- | ---------- | ----------- | ---------------------------------------------------------------- |
| [check-eslint-version-compatibility](instincts/personal/check-eslint-version-compatibility.md) | 0.9        | Build Tools | When selecting ESLint version or configuring linting             |
| [validate-build-tool-ecosystem](instincts/personal/validate-build-tool-ecosystem.md)           | 0.85       | Build Tools | When selecting versions for build tools (ESLint, Prettier, etc.) |

**Summary:** Learned from T-1.1.1 setup session when ESLint v9's breaking configuration format change blocked lint verification. Both instincts reinforce ecosystem-wide validation before tool selection.

### Session 3: Frontend Implementation (2026-01-29)

| Instinct                                                                                               | Confidence | Domain             | Trigger                                         |
| ------------------------------------------------------------------------------------------------------ | ---------- | ------------------ | ----------------------------------------------- |
| [implement-error-boundary-early](instincts/personal/implement-error-boundary-early.md)                 | 0.95       | React & Frontend   | When starting React app or adding UI components |
| [zustand-over-redux-simple-apps](instincts/personal/zustand-over-redux-simple-apps.md)                 | 0.90       | React & State Mgmt | When selecting state management for new app     |
| [define-design-tokens-before-components](instincts/personal/define-design-tokens-before-components.md) | 0.92       | Design & Frontend  | When starting styling with Tailwind CSS         |

**Summary:** Learned from T-1.2.1 and T-1.2.2 implementation session (Electron + React renderer). All instincts reinforce doing foundational work first: error boundaries before components, design tokens before styling, appropriate state management tool selection based on actual complexity.

### Session 4: IPC Bridge Implementation (2026-01-29)

| Instinct                                                                                                          | Confidence | Domain             | Trigger                                          |
| ----------------------------------------------------------------------------------------------------------------- | ---------- | ------------------ | ------------------------------------------------ |
| [initialize-event-emitter-after-window-ready](instincts/technical/initialize-event-emitter-after-window-ready.md) | 0.90       | Electron & IPC     | When implementing IPC event emitters in Electron |
| [separate-global-type-declarations](instincts/technical/separate-global-type-declarations.md)                     | 0.85       | TypeScript & Types | When extending global interfaces (Window)        |
| [restage-after-lint-fixes](instincts/technical/restage-after-lint-fixes.md)                                       | 0.95       | Git & Workflow     | After fixing lint errors from pre-commit hooks   |

**Summary:** Learned from T-1.2.3 IPC bridge implementation. First instinct prevents race conditions by initializing event emitter after window is fully ready. Second instinct prevents "duplicate identifier" errors by using dedicated .d.ts files for global declarations. Third instinct prevents repeated commit failures by re-staging files after fixing lint errors (lint-staged checks staged version, not working directory).

---

## How to Use

### Adding Entries

```bash
# Add a failure entry
/kb add failure

# Add a pattern entry
/kb add pattern

# Add a decision entry
/kb add decision
```

### Searching Entries

```bash
# Search by keyword
/kb search "rate limiting"

# View specific entry
/kb view F001
```

### Updating This Index

After adding KB entries, update this index manually or use "Update KB index" to regenerate counts and summaries.
