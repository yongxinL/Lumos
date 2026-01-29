---
id: check-eslint-version-compatibility
name: Check ESLint Version Compatibility
trigger: 'When selecting ESLint version or configuring linting in a project'
confidence: 0.9
domain: Build Tools & Linting
source: 'F002 - ESLint v9 Configuration Format Migration (2026-01-29)'
phase: 'T-1.1.1 (Project Setup & Tooling)'
created: 2026-01-29
updated: 2026-01-29
---

## Action

Before installing ESLint, verify the major version's configuration format and required plugins. ESLint v9+ uses `eslint.config.js` (not `.eslintrc.*`). Explicitly check version compatibility with React, TypeScript, and Prettier before proceeding.

## Evidence

During Lumos T-1.1.1 setup, ESLint v9.39.2 was installed following setup documentation specifying `.eslintrc.js`. When running `pnpm lint`, ESLint rejected the configuration, stating it only accepts `eslint.config.js` format. This blocked the entire lint verification step and required:

1. Rewrite configuration to new format (ES modules)
2. Installation of additional dependencies (@eslint/js, globals)
3. Explicit installation of React/TypeScript plugins

Investigation revealed ESLint v9 (released Q4 2024) made this breaking change intentionally. No documentation error—pure version incompatibility.

## Example

### ❌ Incorrect: Ignoring Version-Specific Format Changes

```bash
# Installed ESLint v9
pnpm add -D eslint@^9.39.2

# Followed setup guide from pre-v9 era
# Created .eslintrc.js with traditional format

# Result: pnpm lint fails
# Error: "ESLint couldn't find an eslint.config.(js|mjs|cjs) file"
```

### ✅ Correct: Verify Format Before Installation

```bash
# Step 1: Check version requirements
# ESLint v9+ requires eslint.config.js format
# ESLint pre-v9 supports .eslintrc.* formats

# Step 2: Install base ESLint v9 dependencies
pnpm add -D eslint@^9.39.2 @eslint/js globals

# Step 3: Install required plugins (v9 requires explicit installation)
pnpm add -D \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  typescript-eslint

# Step 4: Create eslint.config.js (ES module format)
cat > eslint.config.js << 'EOF'
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import typescriptEslint from 'typescript-eslint';

export default [
  {
    ignores: ['node_modules', 'dist'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parser: typescriptEslint.parser,
    },
    plugins: {
      '@typescript-eslint': typescriptEslint.plugin,
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      // v9 config rules here
    },
  },
];
EOF

# Step 5: Verify configuration works
pnpm lint
```

## When to Apply

- **Trigger:** When selecting ESLint version for new project or dependency upgrade
- **Phase:** T-1.1.1 (Project Setup & Tooling) or equivalent
- **Scope:** All projects using ESLint
- **Timing:** Before initial setup; re-check on major version upgrades

**Critical for:**

- Projects using TypeScript with linting
- Projects with React component linting requirements
- Multi-tool setups (ESLint + Prettier + TypeScript)

## Impact

**Immediate:**

- Prevents setup blocking on linting configuration
- Avoids wasted time debugging "missing config file" errors
- Ensures pre-commit hooks work from first setup

**Long-term:**

- Establishes ecosystem compatibility checking habit
- Builds knowledge of tool version breaking changes
- Reduces setup documentation errors

## Related Instincts

- [I001: Verify Electron/Node.js Version](verify-electron-node-version.md) - Similar version verification for runtime
- [I006: Validate Build Tool Ecosystem](validate-build-tool-ecosystem.md) - Broader ecosystem readiness check

## Related Failures

- [F002: ESLint v9 Configuration Format Migration](../failures/F002-eslint-v9-configuration-format-migration.md) - The incident that created this instinct

## References

- [ESLint v9 Migration Guide](https://eslint.org/docs/latest/use/configure/migration-guide) (verified 2026-01-29)
- [ESLint Configuration Documentation](https://eslint.org/docs/latest/use/configure/) (v9.39.2 format)
