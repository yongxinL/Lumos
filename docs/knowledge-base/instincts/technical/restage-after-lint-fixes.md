# I009: Re-stage Files After Fixing Lint Errors

**Category:** Technical Instinct
**Confidence:** 0.95
**Context:** Git, lint-staged, Pre-commit Hooks
**Date:** 2026-01-29

## Pattern

When pre-commit hooks fail with linting errors, fix the errors and **re-stage the files** before attempting to commit again.

## Reasoning

### Why It Matters

1. **Staged Content is Checked**: Pre-commit hooks like `lint-staged` check the **staged** version of files, not the working directory
2. **Fixes Aren't Automatically Staged**: After fixing linting errors, changes remain in working directory until re-staged
3. **Repeated Failures**: Without re-staging, the same errors will occur on every commit attempt

### What Happens Without Re-staging

```bash
# Stage files (with errors)
git add src/

# Commit fails with lint errors
git commit -m "feat: new feature"
# ✖ eslint --fix: error: 'NodeJS' is not defined

# Fix the errors in editor
# (edit file, change NodeJS.Timeout to ReturnType<typeof setTimeout>)

# Try to commit again WITHOUT re-staging
git commit -m "feat: new feature"
# ✖ eslint --fix: error: 'NodeJS' is not defined  (SAME ERROR!)

# Check git status
git status
# Changes to be committed:
#   modified:   src/file.ts  (staged with OLD content)
#
# Changes not staged for commit:
#   modified:   src/file.ts  (has the fixes)
```

### Correct Workflow

```bash
# Stage files
git add src/

# Commit fails with lint errors
git commit -m "feat: new feature"
# ✖ eslint --fix: error: 'NodeJS' is not defined

# Fix the errors
# (edit file, fix the issues)

# ✅ IMPORTANT: Re-stage the fixed files
git add src/file.ts

# Now commit succeeds
git commit -m "feat: new feature"
# ✓ All checks pass
```

## When to Apply

- ✅ After fixing any lint errors from pre-commit hooks
- ✅ After fixing type errors that blocked commit
- ✅ After formatting fixes that weren't auto-applied
- ✅ When modifying files that are already staged

## When NOT to Apply

- ❌ When adding completely new files (they're not staged yet)
- ❌ When errors are in different files than you modified
- ❌ When using `git commit -a` (auto-stages all changes)

## Quick Check

Before committing after fixing errors, verify staging status:

```bash
# Check if fixes are staged
git diff --cached src/file.ts | grep "your fix"

# If no output, your fixes aren't staged!
git add src/file.ts
```

## Evidence

From T-1.2.3 implementation:

- Pre-commit hook failed twice with same errors
- Cause: Files were staged before fixes were made
- Solution: Re-staged files after fixes
- Result: Commit succeeded immediately

## Common Scenarios

### Scenario 1: TypeScript Type Errors

```bash
git commit
# ✖ error: 'NodeJS' is not defined

# Fix: Change NodeJS.Timeout → ReturnType<typeof setTimeout>
git add src/main/ipc/events.ts

git commit  # ✓ Now succeeds
```

### Scenario 2: ESLint Rule Violations

```bash
git commit
# ✖ error: 'React' is not defined

# Fix: Import React or use specific imports
git add src/renderer/hooks/useIPC.ts

git commit  # ✓ Now succeeds
```

### Scenario 3: Multiple Files

```bash
git commit
# ✖ errors in file1.ts and file2.ts

# Fix both files
git add src/file1.ts src/file2.ts

git commit  # ✓ Now succeeds
```

## Automated Check

You can verify all staged files pass linting before committing:

```bash
# Check staged files for errors
pnpm lint-staged --diff=HEAD

# Or run full lint
pnpm lint
```

## Related Patterns

- Git staging area vs working directory
- Pre-commit hook workflow
- Lint-staged tool behavior

## Tools That Help

- **IDE Git Integration**: Shows which version is staged
- **Git GUI tools**: Visual diff of staged vs unstaged
- **`git status -v`**: Verbose output shows staging state

---

**Tags:** #git #lint-staged #pre-commit #staging #workflow
**Confidence:** 0.95
**Verified:** Yes (T-1.2.3)
**Frequency:** Common issue with pre-commit hooks
