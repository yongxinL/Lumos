---
id: validate-build-tool-ecosystem
name: Validate Build Tool Ecosystem Before Implementation
trigger: 'When selecting versions for build tools (ESLint, Prettier, TypeScript, Webpack, Vite, etc.)'
confidence: 0.85
domain: Build Tools & Tooling
source: 'F002 - ESLint v9 Configuration Format Migration + F001 - Electron/Node.js Version Error (2026-01-29)'
phase: 'T-1.1.1 (Project Setup & Tooling), Phase 2 Architecture'
created: 2026-01-29
updated: 2026-01-29
---

## Action

Before installing build tools, verify that the entire tooling ecosystem is compatible:

1. Check each tool's major version for breaking changes
2. Verify plugin/extension availability for selected versions
3. Confirm configuration format changes between versions
4. Validate integration between interdependent tools (ESLint + Prettier, TypeScript + Build Tool)

Document the compatibility matrix before proceeding with installation.

## Evidence

Two related incidents from Lumos T-1.1.1 setup:

**Incident 1 (F002):** ESLint v9.39.2 selected without checking that v9 changed configuration format from `.eslintrc.*` to `eslint.config.js`. Blocked lint verification until configuration was rewritten.

**Incident 2 (F001):** Electron v33 documentation claimed Node.js v22 when it actually provided v20.18.0. Discovered only after dependency investigation. Led to upgrade path documentation (D001).

**Pattern:** Selecting individual tool versions without verifying ecosystem compatibility cascades into setup blockers.

## Example

### ❌ Incorrect: Version Selection Without Ecosystem Check

```
Selected Versions (naive approach):
- ESLint: ^9.39.2 (latest, popular, "recommended")
- Prettier: ^3.8.1 (latest)
- TypeScript: ^5.9.3 (latest)
- React: ^19.2.4 (latest)

Result: ESLint v9 requires eslint.config.js format, breaking documented setup.
Additional plugins must be explicitly installed.
Configuration not compatible with guide examples.
Setup blocked on linting step.
```

### ✅ Correct: Ecosystem Validation Before Selection

```
Step 1: Identify Tool Versions Required
- ESLint (code quality)
- Prettier (formatting)
- TypeScript (type checking)
- Electron (desktop app runtime)
- Vite (development build tool)

Step 2: Verify Major Version Compatibility
┌─────────────────┬──────────┬─────────────────────────────────┐
│ Tool            │ Version  │ Breaking Changes v9/v5 Latest   │
├─────────────────┼──────────┼─────────────────────────────────┤
│ ESLint          │ v9.39.2  │ .eslintrc→eslint.config.js      │
│ Prettier        │ v3.8.1   │ None in v3 (stable API)         │
│ TypeScript      │ v5.9.3   │ None in v5 (LTS path)           │
│ Electron        │ v39.4.0  │ → Node.js 22.20.0 (verify!)     │
│ Vite            │ v7.3.1   │ v5.x breaking APIs (verify!)    │
└─────────────────┴──────────┴─────────────────────────────────┘

Step 3: Check Plugin/Ecosystem Status
- eslint-plugin-react: ✓ v7.37.5 supports v9
- eslint-plugin-typescript: ✓ typescript-eslint v8.54.0
- @vitejs/plugin-react: ✓ v5.1.2 compatible
- electron-builder: ✓ v26.6.0 compatible with v39

Step 4: Validate Configuration Integrations
- ESLint v9 + Prettier v3: ✓ Compatible with shared config
- TypeScript v5 + ESLint v9: ✓ Need typescript-eslint plugin
- Vite v7 + React v19: ✓ JSX handling via plugin

Step 5: Document & Commit Selection
→ Create D001 (Decision Log) with verification sources
→ Include in CLAUDE.md tech stack section
→ Note any configuration format changes

Result: Setup proceeds smoothly, all verification steps pass.
```

## When to Apply

- **Trigger:** Phase 2 Architecture or Phase 3 Implementation kickoff for any new project
- **Timing:** Before creating setup documentation or task decomposition
- **Scope:** Required for build tool selection; recommended for runtime dependencies
- **Critical Decision Point:** T-1.1.1 (Project Setup & Tooling) equivalent

**Apply for:**

- TypeScript + Build Tool combinations (ESLint, Webpack, Vite, Turbopack)
- Desktop app frameworks (Electron, Tauri) with Node.js runtime
- Multi-tool setups with configuration interdependencies
- Any version selection appearing in setup guides

## Impact

**Prevents:**

- Setup documentation becoming outdated on major version bumps
- Configuration format surprises during initial setup
- Plugin availability gaps blocking development
- Wasted time debugging version incompatibilities

**Enables:**

- Confident version selection with documented tradeoffs
- Smoother onboarding for new team members
- Faster troubleshooting when issues occur
- Better long-term maintenance of setup guides

## Related Instincts

- [I001: Verify Electron/Node.js Version](verify-electron-node-version.md) - Specific version check
- [I005: Check ESLint Version Compatibility](check-eslint-version-compatibility.md) - Tool-specific check
- [I002: Use Multi-Source Verification](use-multi-source-verification.md) - Verification methodology
- [I003: Validate Compatibility Chains](validate-compatibility-chains.md) - Related validation

## Related Patterns

- [P001: Dependency Version Verification](../patterns/P001-dependency-version-verification.md) - Comprehensive pattern covering this approach

## Related Decisions

- [D001: Tech Stack Version Selection 2026](../decisions/D001-tech-stack-version-selection-2026.md) - Includes Lumos ecosystem validation

## Related Failures

- [F001: Electron/Node.js Version Documentation Error](../failures/F001-electron-node-version-documentation-error.md) - Version mismatch
- [F002: ESLint v9 Configuration Format Migration](../failures/F002-eslint-v9-configuration-format-migration.md) - Configuration format breaking change

## Checklist for Build Tool Selection

- [ ] List all build tools needed for project
- [ ] Document latest stable version of each
- [ ] Check official release notes for major version breaking changes
- [ ] Verify each tool has required plugins for other tools
- [ ] Create compatibility matrix (tool versions × features)
- [ ] Validate configuration format for selected versions
- [ ] Test sample setup with selected versions
- [ ] Document version selection in D### (Decision) entry
- [ ] Include breaking changes in setup guide troubleshooting
- [ ] Reference decision log from CLAUDE.md tech stack section

## References

- [P001: Dependency Version Verification](../patterns/P001-dependency-version-verification.md) (Step-by-step process)
- [F002: ESLint v9 Configuration Migration](../failures/F002-eslint-v9-configuration-format-migration.md) (incident details)
- [ESLint v9 Breaking Changes](https://eslint.org/docs/latest/use/configure/migration-guide)
- [Electron Release Notes](https://www.electronjs.org/releases) (version → Node.js mapping)
