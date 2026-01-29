---
id: audit-all-when-one-wrong
trigger: "when discovering any version error in documentation"
confidence: 0.7
domain: "validation"
source: "session-observation"
phase: "2"
created: "2026-01-29"
last_reinforced: "2026-01-29"
---

# Audit All Dependencies When One Is Wrong

## Action
If any version claim is incorrect, audit ALL dependencies comprehensively rather than fixing just the one error.

## Evidence
- Found Electron 33 → Node 20 error (expected 22)
- Expanded to full dependency audit
- Discovered 15+ packages with available updates
- React 18.3 was nearly 2 years old
- Comprehensive update prevented future drift

## Example
```markdown
Error Found:
❌ Electron version incorrect

Response:
1. ✓ Audit entire tech stack (24+ packages)
2. ✓ Group by update type (major/minor/patch)
3. ✓ Verify ecosystem compatibility
4. ✓ Update systematically in one commit

Don't:
❌ Fix only the one error
❌ Leave other outdated versions
❌ Create partial tech debt
```

## When to Apply
- After finding any documentation error
- During tech stack review
- Before Phase 3 (Implementation) starts
- When versions look suspicious

## Impact
Prevents incremental tech debt and ensures consistent stack.
