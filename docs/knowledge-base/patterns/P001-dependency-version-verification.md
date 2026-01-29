# P001: Dependency Version Verification Pattern

**Category:** Pattern
**ID:** P001
**Date:** 2026-01-29
**Project:** Lumos
**Context:** Electron desktop app tech stack selection
**Applicability:** Any project with complex dependency chains

---

## Pattern Name

**Systematic Dependency Version Verification for Production Tech Stacks**

---

## Problem

How do you select and verify dependency versions for a production tech stack when:
- Documentation may be outdated or incorrect
- Version numbers don't always indicate compatibility
- Dependencies have transitive requirements (Electron → Node → native modules)
- Ecosystem readiness varies after major releases
- Multiple sources provide conflicting information

---

## Solution

Use a systematic multi-step verification process that validates version claims against authoritative sources and checks the entire compatibility chain.

---

## Pattern Steps

### Phase 1: Document Current State
1. List all dependencies with their claimed versions
2. Note the justifications/reasons for each version
3. Identify dependencies with version-specific features (e.g., "Node.js 22 runtime")

### Phase 2: Verify Core Runtime
1. **Identify runtime dependencies first** (e.g., Electron → Node.js → Chromium)
2. **Check official release notes** for exact versions
3. **Cross-reference multiple sources**:
   - Official website (electronjs.org)
   - npm package page
   - GitHub releases page
   - Official blog announcements

**Example:**
```bash
Claimed: Electron 33 → Node.js 22
Verified: Electron 33 → Node.js 20.18.0 ❌
Verified: Electron 39 → Node.js 22.20.0 ✓
```

### Phase 3: Check Ecosystem Readiness
For major version updates, verify ecosystem compatibility:

1. **Check release date**: How long has it been stable?
   - < 3 months: Early adopter risk
   - 6-12 months: Ecosystem catching up
   - 12+ months: Mature, safe to use

2. **Verify dependent package compatibility**:
   - UI frameworks (React Router, shadcn/ui)
   - State management (Zustand)
   - Build tools (Vite)
   - Testing tools (Vitest, Playwright)

3. **Look for official migration guides**:
   - React 19 migration guide
   - Vite 7 changelog
   - Breaking changes documentation

### Phase 4: Validate Compatibility Chains
Check transitive dependencies:

1. **Native module compatibility**:
   ```
   Electron 39 → Node.js 22 → better-sqlite3 12.6.2 ✓
   ```
   - better-sqlite3 12.4.5+ explicitly supports Electron 39
   - Earlier versions would fail with V8 API errors

2. **Build tool compatibility**:
   ```
   Electron 39 → electron-builder 26.5.0 ✓
   ```
   - Newer Electron may need newer build tools

3. **Type definitions**:
   ```
   React 19 → @types/react 19.0.0 ✓
   Node.js 22 → @types/node 22.x ✓
   ```

### Phase 5: Comprehensive Audit
If one version is wrong, audit everything:

1. **List all dependencies** (24+ packages typical)
2. **Search for latest compatible versions**:
   - Check npm: `npm view <package> versions --json`
   - Check GitHub releases
   - Read changelogs for breaking changes

3. **Group by update type**:
   - Major (breaking): React 18→19, Vite 6→7
   - Minor (features): TypeScript 5.6→5.9
   - Patch (fixes): Zustand 5.0.0→5.0.10

4. **Update systematically**:
   - Major updates first (framework, runtime)
   - Then tools (build, test)
   - Then utilities (validation, helpers)
   - Finally types

### Phase 6: Document Verification
Create audit trail:

1. **Document sources**:
   ```markdown
   - Electron 39.0.0: https://www.electronjs.org/blog/electron-39-0
   - React 19.2.4: https://react.dev/blog/2024/12/05/react-19
   - better-sqlite3 12.6.2: https://github.com/WiseLibs/better-sqlite3/releases
   ```

2. **Note verification date**:
   ```markdown
   > **Note:** These versions are verified via multiple sources (January 2026).
   > Use exact versions for compatibility.
   ```

3. **Create compatibility matrix**:
   ```markdown
   | Electron | Node.js | Chromium | React | TypeScript | Vite |
   |----------|---------|----------|-------|------------|------|
   | 39.x     | 22.x    | 142.x    | 19.x  | 5.x        | 7.x  |
   ```

---

## Anti-Patterns (What NOT to Do)

### ❌ Trusting Documentation Blindly
```markdown
BAD: "Docs say Electron 33 has Node 22, use that"
GOOD: "Docs say Node 22, let me verify with official releases"
```

### ❌ Using Latest of Everything
```markdown
BAD: "Just use latest versions of all packages"
GOOD: "Check ecosystem readiness and compatibility first"
```

### ❌ Single-Source Verification
```markdown
BAD: Checked npm page only
GOOD: Cross-referenced npm + GitHub + official docs
```

### ❌ Partial Updates
```markdown
BAD: Update React, skip updating @types/react
GOOD: Update entire compatibility chain together
```

### ❌ Skipping Native Module Checks
```markdown
BAD: Electron 39 + better-sqlite3 11.x (incompatible)
GOOD: Electron 39 + better-sqlite3 12.4.5+ (verified compatible)
```

---

## Example Application (Lumos Project)

### Discovery
```markdown
Issue: Documentation claimed Electron 33 provides Node.js 22
Reality: Electron 33 provides Node.js 20.18.0
```

### Verification Process
1. **Checked official sources**:
   - electronjs.org/blog/electron-33-0 → Node 20.18.0
   - electronjs.org/blog/electron-39-0 → Node 22.20.0 ✓

2. **Checked ecosystem (React 19)**:
   - Released: December 2024 (13+ months ago)
   - React Router 7: Compatible ✓
   - shadcn/ui: Compatible ✓
   - Zustand 5: Compatible ✓

3. **Validated compatibility chain**:
   - Electron 39 → better-sqlite3 12.6.2 ✓ (explicit support)
   - Electron 39 → electron-builder 26.5.0 ✓

4. **Comprehensive audit**:
   - Found 24+ dependencies
   - 15+ had available updates
   - Updated all in single commit

### Results
- Caught critical error before implementation
- Updated to production-ready tech stack
- Created reusable verification process
- Documented in knowledge base

---

## Tools & Resources

### Verification Tools
- **npm**: `npm view <package> versions`
- **GitHub**: Check /releases for changelogs
- **Web search**: "electron 39 node version"
- **Official sites**: electronjs.org, reactjs.org, vitejs.dev

### Key Search Patterns
```
"<package> <version> release notes"
"<package> compatibility <dependency>"
"<framework> <major-version> ecosystem ready"
"<package> changelog <version>"
```

### Authoritative Sources (Priority Order)
1. Official website/blog (electronjs.org)
2. GitHub releases (/releases page)
3. npm package page (peerDependencies)
4. Official migration guides
5. Community discussions (as secondary validation)

---

## Benefits

### Immediate
- ✅ Catch version errors before implementation
- ✅ Avoid runtime incompatibilities
- ✅ Prevent wasted development time
- ✅ Use latest stable features

### Long-term
- ✅ Documented decision rationale
- ✅ Reusable verification process
- ✅ Knowledge base for future projects
- ✅ Team confidence in tech choices

---

## Related Patterns

- **Semantic Versioning**: Understanding major.minor.patch
- **Dependency Pinning**: When to use exact vs caret versions
- **Ecosystem Maturity Assessment**: 6-12 month rule for major releases

---

## Related Knowledge Base Entries

- **[F001: Electron/Node Version Documentation Error](F001-electron-node-version-documentation-error.md)** - Failure that led to this pattern
- **[D001: Tech Stack Version Selection (2026)](D001-tech-stack-version-selection-2026.md)** - Application of this pattern

---

## Checklist

Use this checklist when selecting dependency versions:

- [ ] Verified runtime version with official sources (not docs)
- [ ] Cross-referenced 2+ authoritative sources
- [ ] Checked release date and ecosystem maturity (6-12 months)
- [ ] Verified dependent package compatibility (UI, state, build tools)
- [ ] Validated native module compatibility (if using Electron/Node)
- [ ] Checked for migration guides and breaking changes
- [ ] Audited entire dependency tree (not just one package)
- [ ] Grouped updates by type (major/minor/patch)
- [ ] Documented sources and verification date
- [ ] Created compatibility matrix

---

**Created By:** Claude Sonnet 4.5 + George Li
**Date Created:** 2026-01-29
**Last Updated:** 2026-01-29
**Pattern Maturity:** Proven (1 successful application)
