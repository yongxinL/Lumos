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
| Patterns  | 1      | 2026-01-29   |
| Decisions | 1      | 2026-01-29   |
| Instincts | 8      | 2026-01-29   |
| **Total** | **12** | 2026-01-29   |

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
