# Instinct: Handle Electron App Lifecycle with Async Cleanup

**ID:** electron-lifecycle-async-cleanup
**Category:** Technical / Platform
**Domain:** Electron & Application Lifecycle
**Confidence:** 0.95 (High - Electron best practice)
**Date Learned:** 2026-01-29
**Project:** Lumos (T-2.2.3 - Swift-Electron IPC Bridge)

---

## Trigger

When building Electron apps that need to:

- Initialize services on app startup
- Clean up resources before app exit
- Handle multiple exit paths (Windows vs macOS)
- Ensure async operations complete before quit
- Close native bridges or external processes

## Instinctive Response

**Implement lifecycle handlers for all exit paths:**

1. `ready` event: Initialize services (can be async)
2. `window-all-closed`: Cleanup on Windows/Linux
3. `before-quit`: Cleanup on macOS (Command+Q, Dock quit)
4. Use `event.preventDefault()` to allow async cleanup
5. Call `app.exit(0)` after cleanup, NOT `app.quit()`

**Critical Pattern:**

```typescript
app.on('before-quit', async (event) => {
  event.preventDefault(); // MUST prevent default
  await cleanupServices(); // Wait for async cleanup
  app.exit(0); // Exit cleanly, NOT app.quit()
});
```

## Context

### What Happened

While integrating Swift helper process with Electron:

- Swift process spawned on app ready
- Process needed clean shutdown (SIGTERM)
- Multiple exit paths: window close, Command+Q, Dock quit
- Async cleanup required (stop Swift bridge, cleanup handlers)

### Failed Approaches

**❌ Without `before-quit`:**

- macOS Command+Q would quit immediately
- Swift process left running (orphaned)
- No cleanup opportunity

**❌ Without `event.preventDefault()`:**

- Async cleanup started but app quit before completion
- Resources not released properly

**❌ Using `app.quit()` instead of `app.exit(0)`:**

- Created event loop issues
- Sometimes triggered cleanup twice

### Successful Implementation

```typescript
app.on('ready', async () => {
  // Initialize services
  try {
    await initializeInputHandler();
    console.log('[Main] Services initialized');
  } catch (error) {
    console.error('[Main] Failed to initialize:', error);
    // Continue app startup even if optional services fail
  }

  createWindow();
});

app.on('window-all-closed', async () => {
  // Windows/Linux: quit when all windows closed
  if (process.platform !== 'darwin') {
    await cleanupInputHandler();
    app.quit();
  }
  // macOS: keep app running (standard behavior)
});

app.on('before-quit', async (event) => {
  // macOS: handle Command+Q and Dock quit
  event.preventDefault(); // Critical: allow async cleanup
  await cleanupInputHandler();
  app.exit(0); // Exit cleanly after cleanup
});
```

## Why This Works

**Multiple Exit Paths:**

- Windows/Linux: `window-all-closed` → cleanup → quit
- macOS: `before-quit` → cleanup → exit
- Both paths ensure cleanup happens

**Async Cleanup:**

- `event.preventDefault()` stops immediate quit
- Await ensures cleanup completes
- `app.exit(0)` exits after cleanup done

**Platform Differences:**

- Windows/Linux: quit when windows close
- macOS: app stays open (standard behavior)
- Different events handle different platforms

## When to Apply

**Use this instinct when:**

- App spawns child processes (Swift, Python, etc.)
- Services need cleanup (database connections, IPC bridges)
- Async operations required before exit
- Building cross-platform Electron app
- Native resources need releasing

**Don't use when:**

- App has no cleanup requirements
- All resources auto-cleanup on process exit
- Synchronous cleanup sufficient

## Warning Signs to Ignore This Instinct

- App is single-platform only (simplify lifecycle)
- No external processes or connections
- All state is ephemeral (no persistence)

## Related Patterns

- **Graceful Shutdown:** Ensure clean resource release
- **Platform-Specific Behavior:** Handle OS differences
- **Async Lifecycle Management:** Await async operations

## Code Example

### Full Lifecycle Implementation

```typescript
import { app } from 'electron';
import { initializeInputHandler, cleanupInputHandler } from './ipc';

// Flag to prevent double cleanup
let isCleaningUp = false;

async function performCleanup(): Promise<void> {
  if (isCleaningUp) return;
  isCleaningUp = true;

  try {
    console.log('[Main] Starting cleanup...');
    await cleanupInputHandler();
    console.log('[Main] Cleanup complete');
  } catch (error) {
    console.error('[Main] Cleanup error:', error);
  }
}

// Initialize on app ready
app.on('ready', async () => {
  try {
    await initializeInputHandler();
    console.log('[Main] InputHandler initialized');
  } catch (error) {
    console.error('[Main] Failed to initialize:', error);
    // Continue - don't block app startup
  }

  createWindow();
});

// Windows/Linux quit behavior
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await performCleanup();
    app.quit();
  }
});

// macOS Command+Q behavior
app.on('before-quit', async (event) => {
  event.preventDefault();
  await performCleanup();
  app.exit(0);
});

// Handle activate (macOS dock click)
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

### Service Cleanup Example

```typescript
export async function cleanupInputHandler(): Promise<void> {
  try {
    const inputHandler = getInputHandler();
    await inputHandler.cleanup();

    const swiftBridge = getSwiftBridge();
    await swiftBridge.stop();

    console.log('[Cleanup] Services stopped');
  } catch (error) {
    console.error('[Cleanup] Failed:', error);
  }
}
```

## Verification

**How to know this instinct worked:**

- ✅ App starts cleanly with services initialized
- ✅ Windows/Linux: quit when windows close
- ✅ macOS: quit on Command+Q
- ✅ No orphaned child processes
- ✅ Resources released properly
- ✅ No error logs about unclosed connections

**Testing Checklist:**

- [ ] Test window close on Windows/Linux
- [ ] Test Command+Q on macOS
- [ ] Test Dock quit on macOS
- [ ] Verify child processes terminate
- [ ] Check for resource leaks

## Confidence Level: 0.95

**Why High Confidence:**

- Documented Electron best practice
- Handles all exit paths correctly
- Works across platforms
- Prevents resource leaks
- Used in production Electron apps

**Would increase confidence if:**

- Already at maximum confidence for this pattern

## Common Mistakes

**1. Forgetting `event.preventDefault()`:**

```typescript
// ❌ Wrong - app quits before cleanup
app.on('before-quit', async (event) => {
  await cleanup(); // Never completes
  app.exit(0);
});

// ✅ Correct
app.on('before-quit', async (event) => {
  event.preventDefault(); // Essential!
  await cleanup();
  app.exit(0);
});
```

**2. Using `app.quit()` after async cleanup:**

```typescript
// ❌ Wrong - can cause event loops
await cleanup();
app.quit(); // May trigger events again

// ✅ Correct
await cleanup();
app.exit(0); // Direct exit
```

**3. Missing platform check:**

```typescript
// ❌ Wrong - macOS quits unexpectedly
app.on('window-all-closed', () => {
  app.quit(); // macOS users expect app to stay open
});

// ✅ Correct
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

## Tags

`#electron` `#lifecycle` `#platform` `#async` `#cleanup` `#macos` `#windows` `#cross-platform`
