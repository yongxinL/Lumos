---
id: validate-compatibility-chains
trigger: "when selecting versions with native dependencies"
confidence: 0.8
domain: "validation"
source: "session-observation"
phase: "2"
created: "2026-01-29"
last_reinforced: "2026-01-29"
---

# Validate Compatibility Chains

## Action
Check the entire dependency chain for compatibility, especially Electron → Node → native modules.

## Evidence
- Electron 39 → Node.js 22 → better-sqlite3 12.6.2 (all compatible)
- better-sqlite3 12.4.5+ explicitly added Electron 39 support
- Earlier versions would fail with V8 API errors
- Native modules are critical compatibility bottlenecks

## Example
```markdown
Compatibility Chain to Validate:
1. Runtime: Electron 39 → Node.js 22.20.0 ✓
2. Native Module: Node.js 22 → better-sqlite3 12.6.2 ✓
   - Check: Release notes mention Electron 39 support
3. Build Tool: Electron 39 → electron-builder 26.5.0 ✓
4. Type Defs: Node.js 22 → @types/node 22.x ✓

Critical for:
- SQLite (better-sqlite3)
- Native crypto modules
- Node-gyp dependencies
- Platform-specific bindings
```

## When to Apply
- Using Electron with native Node modules
- Selecting database drivers
- Planning build pipeline
- Before implementation starts

## Impact
Prevents V8 API errors and build failures.
