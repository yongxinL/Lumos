---
id: I009
trigger: 'When starting any React application or adding UI components'
confidence: 0.95
domain: React & Frontend
source: S001 (Electron + React integration success)
phase: Implementation (Phase 3+)
created: 2026-01-29
last_reinforced: 2026-01-29
---

# Instinct I009: Implement Error Boundary Early

## Action

Always implement an Error Boundary component as a core application component, not as an afterthought. Place it at the root level of your React app before adding other features.

## Evidence

From S001 (Electron + React Renderer Implementation):

**What Happened:**

- Created ErrorBoundary component alongside Layout and Zustand stores
- Positioned it as wrapper for entire app (App → ErrorBoundary → Layout → Routes)
- Component includes: error display, development details, recovery buttons, IPC logging

**Why It Matters:**

1. **Catches Unhandled React Errors:** Some errors skip try-catch blocks
2. **Production Resilience:** Users see recovery options, not blank screen
3. **Development Debugging:** Shows full stack traces in dev mode
4. **Error Logging:** Integrates with main process for diagnostic data
5. **Error Boundary Placement:** At root level catches everything, at component level catches child errors

**If We Had Skipped It:**

- Single component crash = white screen of death
- User has no recovery option (refresh, try again, go home)
- No error logging to main process
- Difficult to debug in production
- Result: Poor user experience and lost error information

## Example

### ❌ Incorrect: No Error Boundary

```tsx
function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* If any component throws, user sees blank screen */}
          <Route path="/chat" element={<ChatView />} />
        </Routes>
      </Layout>
    </Router>
  );
}
```

### ✅ Correct: Error Boundary at Root

```tsx
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            {/* Error caught, user sees error UI with recovery options */}
            <Route path="/chat" element={<ChatView />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}
```

### ✅ Better: Component-Level Boundaries

```tsx
function ChatView() {
  return (
    <ErrorBoundary>
      <div className="view">
        {/* Only this view's errors caught, rest of app still works */}
        <ChatComponent />
      </div>
    </ErrorBoundary>
  );
}
```

## When to Apply

**Trigger Conditions:**

- ✅ Starting new React application
- ✅ Adding components that might throw
- ✅ Integrating third-party libraries with error-prone code
- ✅ Building production user-facing features
- ✅ After initial app bootstrap (part of core setup)

**Timing:** Implement in first session, not after bugs appear

**Scope:**

- Root app: Catches all unhandled errors
- Feature sections: Catch errors in specific areas
- Complex components: Wrap expensive render logic

## Impact

### What It Prevents

- Blank white screen crashes
- Lost user context (no recovery path)
- Unlogged errors in production
- Cascading failures (one error crashing entire app)
- Poor user experience when bugs occur

### What It Enables

- **Graceful Degradation:** App stays responsive
- **User Recovery:** "Try Again", "Go Home" buttons
- **Error Diagnostics:** Stack traces sent to main process
- **Development Speed:** See full error details immediately
- **Production Confidence:** Known error handling for unknown bugs

## Related Instincts

- **I006:** Validate build tool ecosystem (catches configuration errors)
- **I002:** Use multi-source verification (prevents configuration bugs)
- **I010:** Zustand over Redux (simpler state = fewer errors)

## Related Patterns

- **P003** (Future): React error handling patterns
- **P002** (Existing): Electron + React integration

## Related Decisions

- **D002** (Future): Frontend stack selection (includes error handling approach)

## Example in Lumos

**File:** `src/renderer/components/ErrorBoundary.tsx`

**Features:**

- Catches all React errors in subtree
- Logs errors to main process via IPC
- Shows development details in dev mode
- Shows user-friendly message in production
- Provides "Try Again" (reset state) and "Go Home" (navigate to /) buttons

**Usage in App:**

```tsx
// src/renderer/App.tsx
export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}
```

**Result:** Production-ready error handling established before adding features

## Confidence Rationale

**High Confidence (0.95):**

- Essential React pattern, proven in 1000s of apps
- Prevents class of errors that are otherwise invisible
- Early implementation costs ~50 lines, saves hours of debugging
- No downside to implementing early
- Only downside is not implementing it

---

**Session:** 2026-01-29 T-1.2.1, T-1.2.2
**Success Rate:** 100% (implemented, working, caught potential errors)
**Recommended Action:** Apply to all future React applications immediately
