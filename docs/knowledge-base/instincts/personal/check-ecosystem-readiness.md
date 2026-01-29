---
id: check-ecosystem-readiness
trigger: "when considering major version updates"
confidence: 0.7
domain: "validation"
source: "session-observation"
phase: "2"
created: "2026-01-29"
last_reinforced: "2026-01-29"
---

# Check Ecosystem Readiness for Major Updates

## Action
Wait 6-12 months after major releases for ecosystem maturity before adopting in production.

## Evidence
- React 19 released Dec 2024, by Jan 2026 (13 months) fully ready
- All dependent packages updated (React Router 7, shadcn/ui, Zustand 5)
- Official migration guides available
- Community resources abundant

## Example
```markdown
Release Timeline Assessment:
- < 3 months: Early adopter risk (breaking changes, missing tools)
- 6-12 months: Ecosystem catching up (most packages compatible)
- 12+ months: Mature & safe (React 19 in Jan 2026)

Check:
✓ UI frameworks (React Router, shadcn/ui)
✓ State management (Zustand)
✓ Build tools (Vite, Vitest)
✓ Type definitions (@types/react)
✓ Official migration guides
```

## When to Apply
- Evaluating major framework updates (React 18→19, Vue 2→3)
- Selecting versions for new projects
- Planning migration timelines

## Impact
Avoids immature ecosystems while staying modern.
