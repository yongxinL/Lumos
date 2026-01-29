---
id: document-verification-sources
trigger: 'when making version claims in documentation'
confidence: 0.7
domain: 'documentation'
source: 'session-observation'
phase: '2'
created: '2026-01-29'
last_reinforced: '2026-01-29'
---

# Document Verification Sources

## Action

Always include verification sources and dates when documenting version claims or technical specifications.

## Evidence

- Initial docs lacked source references for version claims
- Error went unnoticed until user questioned it
- Updated docs now include "Verified via [source] (January 2026)"
- Creates audit trail for future reviews

## Example

```markdown
# Good (with verification)

> **Note:** These versions are verified via multiple sources (January 2026).

Electron 39.0.0: https://www.electronjs.org/blog/electron-39-0
React 19.2.4: https://react.dev/blog/2024/12/05/react-19
Verified: 2026-01-29

# Bad (no verification)

Use Electron 33 with Node.js 22 runtime.
```

## When to Apply

- Writing technical specifications
- Documenting architecture decisions
- Creating task requirements
- Any version-specific claims

## Impact

Creates accountability and enables future verification.
