# I007: Initialize Event Emitter After Window Ready

**Category:** Technical Instinct
**Confidence:** 0.9
**Context:** Electron IPC, Event-Driven Architecture
**Date:** 2026-01-29

## Pattern

When implementing IPC event emitters in Electron, initialize the emitter in the `ready-to-show` callback, not in the `ready` event handler.

## Reasoning

### Why It Matters

1. **Window Reference Validity**: The BrowserWindow must be fully created before initializing event emitter
2. **Race Condition Prevention**: `ready` event fires before window creation completes
3. **Null Reference Safety**: Emitter needs valid window reference to send events

### What Can Go Wrong

```typescript
// ❌ BAD: Initialize in ready event
app.on('ready', () => {
  createWindow();
  initializeEventEmitter(mainWindow); // mainWindow may not be fully ready!
});

// Window creation is async
function createWindow() {
  mainWindow = new BrowserWindow({ show: false });
  mainWindow.loadURL('...');
  // Not ready yet!
}
```

### Correct Approach

```typescript
// ✅ GOOD: Initialize in ready-to-show
app.on('ready', () => {
  createWindow();
});

function createWindow() {
  mainWindow = new BrowserWindow({ show: false });
  mainWindow.loadURL('...');

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();

    // Now safe to initialize emitter
    if (mainWindow) {
      initializeEventEmitter(mainWindow);
    }
  });
}
```

## When to Apply

- ✅ Initializing IPC event emitters
- ✅ Setting up window-dependent services
- ✅ Registering window-specific event listeners
- ✅ Starting services that send events to renderer

## When NOT to Apply

- ❌ Registering IPC handlers (can be done in `ready`)
- ❌ Database initialization (no window dependency)
- ❌ Menu setup (independent of window)
- ❌ Global shortcuts (system-level, not window-specific)

## Evidence

From T-1.2.3 implementation:

- Event emitter initialized in `ready-to-show` callback
- No null reference errors during event emission
- Clean window lifecycle management
- All typecheck and build gates passing

## Related Patterns

- Window lifecycle management in Electron
- Service initialization order
- Dependency injection patterns

---

**Tags:** #electron #ipc #event-emitter #window-lifecycle #race-condition
**Confidence:** 0.9
**Verified:** Yes (T-1.2.3)
