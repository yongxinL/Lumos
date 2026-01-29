---
id: use-multi-source-verification
trigger: 'when verifying version claims or API compatibility'
confidence: 0.8
domain: 'validation'
source: 'session-observation'
phase: '2'
created: '2026-01-29'
last_reinforced: '2026-01-29'
---

# Use Multi-Source Verification

## Action

Cross-reference at least 2-3 authoritative sources when verifying version claims or API compatibility.

## Evidence

- Single documentation source had incorrect Electron/Node mapping
- Cross-referencing with electronjs.org, npm, and GitHub releases caught error
- Web search provided additional confirmation
- Pattern applied successfully to verify 24+ dependency versions

## Example

```markdown
Sources to check:

1. Official website (electronjs.org, reactjs.org)
2. npm package page (peer dependencies)
3. GitHub releases page (changelogs)
4. Official blog announcements

Don't rely on:

- Single documentation source
- Assumptions based on release timeline
- Third-party tutorials (as primary source)
```

## When to Apply

- Verifying runtime versions (Electron, Node, etc.)
- Checking API compatibility
- Validating dependency requirements
- During tech stack selection

## Impact

Catches documentation errors before implementation.
