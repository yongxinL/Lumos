# Instinct: Trust TypeScript Unused Variable Detection

**ID:** typescript-unused-variable-detection
**Category:** Technical / Code Quality
**Domain:** TypeScript & Type System
**Confidence:** 0.95 (High - Core TypeScript behavior)
**Date Learned:** 2026-01-29
**Project:** Lumos (T-2.2.3 - Swift-Electron IPC Bridge)

---

## Trigger

When TypeScript compiler flags unused variables with error `ts(6133)`:

- Variable is declared in class or function
- You think you're "using" the variable
- Compiler insists it's unused
- You're tempted to ignore the warning

## Instinctive Response

**Trust the compiler - investigate what "unused" really means:**

1. Understand: "Unused" means "written but never read"
2. Check if variable is only written to, never read from
3. Either remove the variable or add read operations
4. Don't disable the rule - it catches dead code

**Key Insight:**

```typescript
// ❌ Unused (written but never read)
private value: string = '';
someMethod() {
  this.value = 'new';  // Write only
}

// ✅ Used (written AND read)
private value: string = '';
someMethod() {
  this.value = 'new';  // Write
  console.log(this.value);  // Read
}
```

## Context

### What Happened

While implementing InputHandler with Swift bridge:

```typescript
export class InputHandler extends EventEmitter {
  private currentTranscription: string = ''; // ts(6133)

  async startRecording(): Promise<void> {
    this.currentTranscription = ''; // Written
  }

  private handleRecordingStopped(finalText: string): void {
    this.currentTranscription = finalText; // Written
    // Never read anywhere!
  }
}
```

**Compiler error:** `'currentTranscription' is declared but its value is never read.`

### Initial Confusion

**Thought:** "But I'm using it in multiple places!"

**Reality:** Only writing to it, never reading from it.

### Investigation

Searched for all uses:

- ✍️ `this.currentTranscription = ''` - Write
- ✍️ `this.currentTranscription = partial` - Write
- ✍️ `this.currentTranscription = finalText` - Write
- 👀 No reads anywhere!

**Conclusion:** Variable was storing values but never using them. Dead code.

### Resolution

Removed the variable since we:

- Pass finalText directly in events
- Don't need to store partial transcriptions (streaming deferred)
- Can add it back if real-time streaming is implemented

## Why This Works

**TypeScript's Definition of "Unused":**

- Variable is "used" only if its value is READ
- Writing to a variable doesn't count as "using" it
- If only written, it's dead code

**Benefits of Trusting This:**

- Catches unnecessary state tracking
- Identifies dead code paths
- Simplifies data flow
- Reduces memory usage
- Makes code easier to understand

**Real-World Example:**

```typescript
// Dead code (unused variable)
private cache: Map<string, string> = new Map();

processItem(key: string, value: string) {
  this.cache.set(key, value);  // Store but never retrieve
  return value;
}

// Simplified (removed unused cache)
processItem(key: string, value: string) {
  return value;  // Cache wasn't needed
}
```

## When to Apply

**Trust the warning when:**

- Variable is class member or local variable
- Compiler shows ts(6133) error
- You're storing values but not using them
- Variable seemed necessary but isn't read

**Investigate further when:**

- Variable is written in one method, read in another (should work)
- Variable is part of public API (might be read externally)
- Variable is used in conditional (check logic)
- Getter/setter patterns (should count as read)

## Warning Signs to Ignore This Instinct

- Variable is part of interface contract (must exist)
- Variable read by reflection or metaprogramming
- Variable is debug placeholder (temporary)
- Variable will be needed soon (but comment why)

## Related Patterns

- **Dead Code Elimination:** Remove code that doesn't affect behavior
- **Minimal State:** Only store state that's actually used
- **Single Responsibility:** Each variable should serve a purpose

## Code Example

### Example 1: Unused State Tracking

```typescript
// ❌ Before (unused variable)
export class InputHandler extends EventEmitter {
  private currentTranscription: string = '';

  private handleRecordingStopped(finalText: string): void {
    this.currentTranscription = finalText; // Store but never read
    this.emit('transcription:complete', { text: finalText });
  }
}

// ✅ After (removed unused state)
export class InputHandler extends EventEmitter {
  private handleRecordingStopped(finalText: string): void {
    // Pass finalText directly - no need to store
    this.emit('transcription:complete', { text: finalText });
  }
}
```

### Example 2: Legitimate Use

```typescript
// ✅ Used (written AND read)
export class InputHandler extends EventEmitter {
  private isRecording: boolean = false;

  async startRecording(): Promise<void> {
    this.isRecording = true; // Write
  }

  getRecordingState(): RecordingState {
    return {
      is_recording: this.isRecording, // Read
      timestamp: iso8601(new Date().toISOString()),
    };
  }
}
```

### Example 3: Write-Only Trap

```typescript
// ❌ Unused (write-only pattern)
export class Logger {
  private lastMessage: string = '';

  log(message: string): void {
    this.lastMessage = message; // Store but never retrieve
    console.log(message);
  }
}

// ✅ Either use it or remove it
export class Logger {
  private lastMessage: string = '';

  log(message: string): void {
    this.lastMessage = message;
    console.log(message);
  }

  getLastMessage(): string {
    return this.lastMessage; // Now it's read
  }
}

// ✅ Or simplify if not needed
export class Logger {
  log(message: string): void {
    console.log(message); // No state needed
  }
}
```

## Verification

**How to know this instinct worked:**

- ✅ TypeScript compilation passes without ts(6133) errors
- ✅ Code is simpler (less state to track)
- ✅ Behavior unchanged (removed dead code only)
- ✅ Easier to understand data flow
- ✅ No performance impact from unused storage

**What NOT to do:**

- ❌ Don't disable the rule (`@ts-ignore` or eslint-disable)
- ❌ Don't add fake reads just to silence warning
- ❌ Don't assume compiler is wrong

## Confidence Level: 0.95

**Why High Confidence:**

- Core TypeScript behavior (well-defined)
- Helps catch real bugs and dead code
- Improves code quality consistently
- No false positives in normal usage
- Standard practice in TypeScript projects

**Would increase confidence if:**

- Already at maximum confidence for this pattern

## Common Scenarios

**1. Deferred Features:**

```typescript
// Variable for future streaming feature (currently unused)
export class InputHandler {
  // TODO: Will be used when real-time streaming is implemented
  // private currentTranscription: string = '';

  updatePartialTranscription(partial: string): void {
    // TODO: Store when streaming is ready
    // this.currentTranscription = partial;
    this.emit('transcription:update', partial);
  }
}
```

**2. Event Handlers:**

```typescript
// Compiler correctly identifies write-only
private lastError: Error | null = null;

onError(error: Error): void {
  this.lastError = error;  // Stored but never checked
  this.emit('error', error);
}

// Add read to make it useful
getLastError(): Error | null {
  return this.lastError;  // Now it's used
}
```

**3. Cleanup:**

```typescript
// Before: Tracking state that's never checked
private cleanupDone: boolean = false;

async cleanup(): Promise<void> {
  await this.service.stop();
  this.cleanupDone = true;  // Never read
}

// After: Remove unused flag
async cleanup(): Promise<void> {
  await this.service.stop();
  // No need to track if never checked
}
```

## Tags

`#typescript` `#code-quality` `#compiler` `#dead-code` `#type-system` `#best-practices`
