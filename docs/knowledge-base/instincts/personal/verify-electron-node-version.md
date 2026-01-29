---
id: verify-electron-node-version
trigger: 'when selecting or documenting Electron version'
confidence: 0.9
domain: 'validation'
source: 'session-observation'
phase: '2'
created: '2026-01-29'
last_reinforced: '2026-01-29'
---

# Verify Electron/Node.js Version Claims

## Action

Always verify Electron/Node.js version mappings with official release notes before documenting or implementing.

## Evidence

- Discovered docs claimed Electron 33 has Node.js 22, actually 20.18.0
- Would have caused critical runtime incompatibility
- Verified with electronjs.org official releases
- High confidence due to severity of potential issue

## Example

```bash
# Don't trust documentation claims - verify with official sources
Documentation: Electron 33 → Node.js 22 ❌ WRONG
Verified (electronjs.org): Electron 33 → Node.js 20.18.0 ✓
Verified (electronjs.org): Electron 39 → Node.js 22.20.0 ✓
```

## When to Apply

- During Phase 2 (Planning) when selecting tech stack
- Before writing technical specifications
- When reviewing architecture documents
- Before starting implementation

## Impact

Prevents runtime incompatibility and wasted implementation time.
