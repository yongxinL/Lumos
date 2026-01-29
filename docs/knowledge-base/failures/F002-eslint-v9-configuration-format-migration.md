# F002: ESLint v9 Configuration Format Migration

**Category:** Configuration & Tooling
**ID:** F002
**Date:** 2026-01-29
**Project:** Lumos
**Phase:** T-1.1.1 (Project Setup & Tooling)
**Severity:** Medium
**Status:** Resolved
**Created:** 2026-01-29
**Last Updated:** 2026-01-29

---

## Summary

ESLint v9 deprecated the traditional `.eslintrc.*` configuration format in favor of the new `eslint.config.js` format. Following setup documentation that used `.eslintrc.js` resulted in ESLint refusing to run, blocking the lint verification step during environment setup. Required migration to new config format and installation of additional dependencies (@eslint/js, globals, explicit React/TypeScript plugins).

---

## What Happened

### Initial State

- Project following T-1.1.1 setup guide that specified `.eslintrc.js` configuration
- All dependencies installed: `eslint@^9.39.2`, `typescript-eslint`, etc.
- Setup documentation was accurate for ESLint pre-v9

### Discovery

- Attempted to run `pnpm lint` during verification step
- ESLint v9.39.2 threw error: "ESLint couldn't find an eslint.config.(js|mjs|cjs) file"
- Error referenced ESLint v9.0.0 breaking change with migration guide URL

### Verification

- Confirmed ESLint v9 changed default config format to `eslint.config.js`
- `.eslintrc.js` was created but ignored by ESLint
- Pattern: ESLint v9+ no longer supports legacy .eslintrc formats by default

### Actual Mapping

- **What we thought:** `.eslintrc.js` would work (true for ESLint v8.x and earlier)
- **What actually happened:** ESLint v9 requires `eslint.config.js` format with ES module exports
- **Missing knowledge:** Need for additional dependencies (@eslint/js, globals) in v9
- **Additional discovery:** React/TypeScript ESLint plugins must be explicitly installed and configured

---

## Impact

### Potential Issues Avoided

- **Build failure:** Lint step would have blocked verification pipeline permanently
- **Development blocks:** Developers couldn't have contributed code with linting
- **CI/CD failure:** Pre-commit hooks depend on successful lint execution
- **Wasted time:** Would have discovered this only after initial setup completion

### Actual Resolution

- Migrated to `eslint.config.js` format using ESM imports
- Installed missing dependencies: `@eslint/js`, `globals`, `eslint-plugin-react`, `eslint-plugin-react-hooks`
- Fixed rule conflicts (disabled plain `no-unused-vars` to use `@typescript-eslint/no-unused-vars`)
- All verification steps (typecheck, lint, build) now pass

---

## Root Cause

### Primary Factor

ESLint v9 introduced breaking change to configuration system in Q4 2024/Q1 2025. This is a legitimate ecosystem change, not a documentation error. However, the problem manifested because:

1. Setup guide specified ESLint v9 without noting format change
2. No explicit warning about new configuration format requirement
3. No pre-flight check for ESLint format compatibility

### Contributing Factors

1. Dependency resolution installed exact v9 version (v9.39.2)
2. Standard setup documentation didn't account for ESLint v9 breaking changes
3. No validation of "ESLint v9 ecosystem readiness" before version selection
4. React/TypeScript plugins are optional in ESLint config discovery phase

---

## Resolution

### Immediate Fix (T-1.1.1 Session)

Created new `eslint.config.js` with:

```javascript
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import typescriptEslint from 'typescript-eslint';
// ... proper v9 configuration format
```

### Dependency Additions

```bash
pnpm add -D @eslint/js globals eslint-plugin-react eslint-plugin-react-hooks
```

### Rule Conflict Resolution

- Disabled plain `no-unused-vars` to prevent conflicts with `@typescript-eslint/no-unused-vars`
- Configured TypeScript ESLint rule to ignore params starting with `_`

### Git Commit

Included in setup verification commit: "fix: migrate ESLint to v9 configuration format"

---

## Prevention Measures

### Process Changes

1. **Ecosystem Readiness Check:** When selecting tool/dependency versions, explicitly check:
   - Latest major version features breaking changes
   - Required configuration format changes
   - New dependency requirements
   - Plugin installation status

2. **Setup Guide Validation:** All setup/tooling documentation should include:
   - Tool version range and known compatibility notes
   - List of implicit plugin dependencies (mark as "required" vs "optional")
   - Configuration format specifications with version notes
   - Pre-flight checklist for tool verification

3. **Dependency Pattern Application:** Use P001 (Dependency Version Verification) for build tooling, not just runtime deps

### Documentation Standards

- ESLint: "v9+ requires `eslint.config.js` format (not `.eslintrc.*`)"
- Mark breaking changes with version in setup guides
- Include expected errors in troubleshooting section

### Tools to Use

- **Pre-commit validation:** Run `pnpm lint` early in setup (✓ already in step 14)
- **Explicit version notes:** Document "ESLint v9" rather than "eslint@latest"
- **Ecosystem maturity checks:** Verify plugin availability for specific versions

---

## Lessons Learned

### Key Takeaways

1. **Major version ecosystem changes cascade:** ESLint v9 change affected TypeScript, React, and Prettier integration
2. **Breaking changes aren't documentation errors:** This was intentional ESLint design change, not a mistake
3. **Plugin availability varies by version:** Some plugins lag major version support
4. **Configuration format validation should happen early:** Caught during verification, could have been pre-flight check

### Best Practices

1. When upgrading major versions of build tools, explicitly test all integrations (linting → formatting → type-checking)
2. Document the "why" behind version choices in decision logs (D001 format)
3. Include ecosystem readiness checks in P001 pattern for build-time dependencies
4. Create version compatibility matrix for common tool combinations (ESLint, Prettier, TypeScript, React)

### Instincts Created

- [I005: Check ESLint version compatibility before setup](../instincts/personal/check-eslint-version-compatibility.md) (confidence: 0.9)
- [I006: Validate build tool ecosystem before implementation](../instincts/personal/validate-build-tool-ecosystem.md) (confidence: 0.85)

---

## Related Entries

### Failures

- [F001: Electron/Node.js Version Documentation Error](F001-electron-node-version-documentation-error.md) - Similar version verification issue

### Patterns

- [P001: Dependency Version Verification](../patterns/P001-dependency-version-verification.md) - Should have been applied to ESLint selection

### Decisions

- [D001: Tech Stack Version Selection 2026](../decisions/D001-tech-stack-version-selection-2026.md) - ESLint v9 selected; should document breaking change

### Instincts

- [I001: Verify Electron/Node.js Version](../instincts/personal/verify-electron-node-version.md) - Similar version verification
- [I005: Check ESLint Version Compatibility](../instincts/personal/check-eslint-version-compatibility.md)

---

## References

- [ESLint v9 Migration Guide](https://eslint.org/docs/latest/use/configure/migration-guide) - Official breaking changes documentation (verified 2026-01-29)
- [ESLint v9.0.0 Release Notes](https://github.com/eslint/eslint/releases/tag/v9.0.0) - Breaking changes summary
- [TypeScript ESLint Documentation](https://typescript-eslint.io/getting-started) - v9 config format examples
- ESLint Configuration: v9.39.2 (installed 2026-01-29)

---

**Creator:** Claude Code (Environment Setup Agent)
**Created:** 2026-01-29
**Last Updated:** 2026-01-29
**Review Status:** Ready for team review
