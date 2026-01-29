# Instinct: Use Singleton Pattern with Event Forwarding for Multi-Layer Integration

**ID:** singleton-event-forwarding-integration
**Category:** Technical / Architecture
**Domain:** TypeScript & Service Integration
**Confidence:** 0.95 (High - Well-established pattern)
**Date Learned:** 2026-01-29
**Project:** Lumos (T-2.2.3 - Swift-Electron IPC Bridge)

---

## Trigger

When integrating multiple architectural layers that need to:

- Maintain stateful connections (e.g., IPC bridges, database connections)
- React to events across layer boundaries
- Avoid tight coupling between layers
- Ensure single source of truth for services

## Instinctive Response

**Use singleton pattern for stateful services with event forwarding:**

1. Create singleton instances for stateful services
2. Use EventEmitter for inter-layer communication
3. Forward events between layers with explicit handlers
4. Implement clear lifecycle methods (initialize/cleanup)
5. Create unidirectional event flow

**Pattern Structure:**

```
Swift → Bridge → Handler → IPC → UI
(each layer listens to previous, emits to next)
```

## Context

### What Happened

While integrating Swift audio capture with Electron and React:

- **Swift Layer:** FluidAudio with audio recording events
- **Bridge Layer:** SwiftBridge with IPC communication
- **Handler Layer:** InputHandler with business logic
- **IPC Layer:** Electron IPC handlers
- **UI Layer:** React components

Needed clean integration without tight coupling.

### Implementation

```typescript
// 1. Service singletons
const swiftBridge = getSwiftBridge();
const inputHandler = getInputHandler();

// 2. Event forwarding
swiftBridge.on('recording_started', () => {
  inputHandler.handleRecordingStarted();
});

swiftBridge.on('recording_stopped', (params) => {
  const finalText = params.final_text;
  inputHandler.handleRecordingStopped(finalText);
});

// 3. Lifecycle management
async function initialize() {
  await swiftBridge.start();
  await inputHandler.initialize();
}

async function cleanup() {
  await inputHandler.cleanup();
  await swiftBridge.stop();
}
```

## Why This Works

**Singleton Benefits:**

- Single source of truth for stateful connections
- Prevents multiple bridge instances competing for resources
- Simplifies testing (can mock singleton getter)
- Explicit lifecycle management

**Event Forwarding Benefits:**

- Decouples layers (Bridge doesn't know about Handler internals)
- Each layer focuses on its responsibility
- Easy to trace event flow through system
- Simple to add new event handlers

**Unidirectional Flow:**

- Events flow one direction: Swift → Bridge → Handler → IPC → UI
- State updates propagate naturally
- No circular dependencies
- Easy to debug with logging

## When to Apply

**Use this instinct when:**

- Integrating 3+ architectural layers
- Services maintain stateful connections
- Need decoupling between layers
- Events need to propagate across boundaries
- Multiple components need same service instance

**Don't use when:**

- Service is stateless (use pure functions)
- Only 2 layers involved (direct integration simpler)
- Need multiple instances (use factory pattern)
- Service has no lifecycle (no init/cleanup needed)

## Warning Signs to Ignore This Instinct

- Service needs different configurations per instance
- Testing requires multiple instances simultaneously
- Singleton introduces global state problems
- Service is CPU-intensive (should be worker pool)

## Related Patterns

- **Observer Pattern:** Event emitters implement observer
- **Facade Pattern:** Singleton can act as facade
- **Mediator Pattern:** Event forwarding implements mediator
- **Factory Pattern:** Use instead if multiple instances needed

## Code Example

### Service Layer (InputHandler)

```typescript
export class InputHandler extends EventEmitter {
  private swiftBridge: SwiftBridge | null = null;
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.swiftBridge = getSwiftBridge();
    await this.swiftBridge.start();

    // Listen to Swift events
    this.swiftBridge.on('recording_started', () => {
      this.handleRecordingStarted();
    });

    this.swiftBridge.on('recording_stopped', (params) => {
      this.handleRecordingStopped(params.final_text);
    });

    this.isInitialized = true;
  }

  async cleanup(): Promise<void> {
    if (this.swiftBridge) {
      await this.swiftBridge.stop();
      this.swiftBridge = null;
      this.isInitialized = false;
    }
  }

  private handleRecordingStarted(): void {
    // Update local state
    this.isRecording = true;

    // Emit event for next layer
    this.emit('recording:state-change', { is_recording: true });
  }
}

// Singleton
let inputHandlerInstance: InputHandler | null = null;

export function getInputHandler(): InputHandler {
  if (!inputHandlerInstance) {
    inputHandlerInstance = new InputHandler();
  }
  return inputHandlerInstance;
}
```

### Application Lifecycle

```typescript
// Main process initialization
app.on('ready', async () => {
  // Initialize services in order
  await initializeInputHandler();
  createWindow();
});

// Cleanup on quit
app.on('before-quit', async (event) => {
  event.preventDefault();
  await cleanupInputHandler();
  app.exit(0);
});
```

## Verification

**How to know this instinct worked:**

- ✅ No circular dependencies
- ✅ Clear event flow through layers
- ✅ Single service instance per type
- ✅ Clean initialization and cleanup
- ✅ Easy to add logging/debugging
- ✅ Testable (can mock singletons)

## Confidence Level: 0.95

**Why High Confidence:**

- Pattern used successfully in many production systems
- Well-documented in design pattern literature
- Clear separation of concerns
- Easy to understand and maintain
- Scales well with complexity

**Would increase confidence if:**

- Already at maximum confidence for this pattern

## Tags

`#typescript` `#architecture` `#singleton` `#event-emitter` `#integration` `#patterns` `#lifecycle`
