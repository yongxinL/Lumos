# Instinct: Defer Streaming When Actor-Isolated

**ID:** defer-streaming-when-actor-isolated
**Category:** Technical / Swift Concurrency
**Domain:** Swift & Concurrency
**Confidence:** 0.75 (Medium - Swift 6 may provide better solutions)
**Date Learned:** 2026-01-29
**Project:** Lumos (T-2.2.2 - FluidAudio Integration)

---

## Trigger

When encountering Swift actor isolation errors accessing AsyncSequence properties:

- Error: "actor-isolated property cannot be accessed from outside of the actor"
- Property type is AsyncSequence or AsyncStream
- Library doesn't provide nonisolated access methods
- `@preconcurrency` import doesn't resolve the issue

## Instinctive Response

**Instead of fighting actor isolation:**

1. Simplify to final-result-only pattern
2. Remove real-time streaming updates
3. Document as technical debt with TODO markers
4. Provide functional MVP with deferred features

**Don't waste time on:**

- Complex actor isolation workarounds
- Unsafe compiler flags or bit casting
- Over-engineering alternative architectures
- Blocking MVP on perfect real-time updates

## Context

### What Happened

While integrating FluidAudio's `StreamingAsrManager` for real-time speech transcription:

```swift
// Tried to access transcriptionUpdates in Task closure
let streamingManager = StreamingAsrManager(config: .streaming)
try await streamingManager.start(source: .microphone)

Task {
    for await update in streamingManager.transcriptionUpdates {  // ❌ Error
        // Handle update
    }
}
```

**Error:** "actor-isolated property 'transcriptionUpdates' cannot be accessed from outside of the actor"

### Failed Attempts

1. **@preconcurrency import** - Still blocked by compiler
2. **Local variable capture** - Same isolation issue
3. **Task.detached** - No access to actor-isolated property
4. **Explicit await** - Property is not async function

### Successful Workaround

Simplified to final transcription only:

```swift
let streamingManager = StreamingAsrManager(config: .streaming)
try await streamingManager.start(source: .microphone)
// ... user records audio ...
let finalText = try await streamingManager.finish()  // ✅ Works
```

## Why This Works

**MVP Acceptability:**

- Final transcription is often sufficient for MVP
- Real-time updates are enhancement, not requirement
- User can see "recording..." state without partial text

**Technical Debt Management:**

- Clearly documented with TODO markers
- Linked to GitHub issues or future tasks
- Doesn't block other features
- Can be revisited with Swift 6 or library updates

**Pragmatic Engineering:**

- Unblocks progress vs perfect solution
- Focuses on what's actually needed now
- Avoids premature optimization
- Reduces complexity for first release

## When to Apply

**Use this instinct when:**

- Actor isolation blocks AsyncSequence access
- Library is external (can't modify)
- Real-time updates are nice-to-have, not critical
- MVP needs to ship soon
- Workarounds would be complex/unsafe

**Don't use when:**

- Real-time streaming is core requirement
- You control the actor implementation
- Simple nonisolated wrapper is available
- Library provides alternative access patterns

## Warning Signs to Ignore This Instinct

- User experience heavily depends on real-time feedback
- Competitors offer real-time streaming
- Requirement explicitly states "progressive updates"
- You have Swift 6 with better actor isolation tools

## Related Patterns

- **Progressive Enhancement:** Start with basic, add features later
- **Technical Debt Documentation:** Mark TODOs clearly with context
- **MVP-First Development:** Ship functional features before perfect ones

## Future Improvements

**Swift 6 Considerations:**

- Check for new actor isolation patterns
- Review library updates for nonisolated methods
- Consider custom actor isolation domains

**Alternative Approaches:**

- Request library improvements (GitHub issue)
- Use callback-based APIs if available
- Implement polling-based updates as interim solution

## Code Example

### Before (Blocked by Actor Isolation)

```swift
class AudioHandler {
    func startRecording() async throws {
        let manager = StreamingAsrManager(config: .streaming)
        try await manager.start(source: .microphone)

        // ❌ Compiler error: actor-isolated property
        Task {
            for await update in manager.transcriptionUpdates {
                handleUpdate(update)
            }
        }
    }
}
```

### After (Simplified to Final Result)

```swift
class AudioHandler {
    func startRecording() async throws {
        let manager = StreamingAsrManager(config: .streaming)
        try await manager.start(source: .microphone)
        // ... recording happens ...

        // TODO: Real-time updates require resolving actor isolation
        // See: https://github.com/FluidInference/FluidAudio/issues/XXX
    }

    func stopRecording() async throws -> String {
        // ✅ Works: await method call, not property access
        return try await manager.finish()
    }
}
```

## Verification

**How to know this instinct worked:**

- ✅ Build compiles without actor isolation errors
- ✅ MVP functionality complete (recording + final transcription)
- ✅ Technical debt clearly documented
- ✅ User experience acceptable for v1
- ✅ Feature didn't block other tasks

## Confidence Level: 0.75

**Why Medium Confidence:**

- Swift concurrency is evolving rapidly
- Swift 6 may provide better solutions
- Workaround may not apply to all libraries
- Real-time streaming sometimes is critical

**Would increase confidence if:**

- Swift 6 documentation confirms this pattern
- More libraries exhibit similar actor isolation
- Community adopts this as standard practice

## Tags

`#swift` `#concurrency` `#actor-isolation` `#workarounds` `#technical-debt` `#mvp` `#pragmatic-engineering`
