# L041: Event-Driven Service Pattern

**ID:** L041
**Date:** 2026-01-30
**Session:** T-3.2.2 (Expert AI Service)
**Confidence:** 0.95
**Category:** Architecture / Event-Driven Design
**Tags:** #architecture #event-driven #eventemitter #loose-coupling #observability

---

## Discovery

EventEmitter pattern enables loose coupling between service layers while maintaining reactivity. Services can emit domain events that consumers subscribe to without tight dependencies.

## Pattern

```typescript
export class ExpertAIService extends EventEmitter {
  async processQuery(input: ExpertProcessedInput): Promise<ExpertResponse> {
    // ... processing ...
    this.emit('query:complete', { conversationId, provider });
    return response;
  }

  async processQueryStream(input, onChunk): Promise<ExpertResponse> {
    // ... streaming ...
    this.emit('stream:chunk', { conversationId, text: chunk.text });
    // ... on complete ...
    this.emit('stream:complete', { conversationId, provider });
  }
}

// Consumers subscribe without coupling
service.on('query:complete', ({ conversationId }) => {
  logger.info('Query completed', { conversationId });
});
```

## Events from Expert AI Service

- `initialized` - Service ready
- `query:complete` - Non-streaming query finished
- `stream:chunk` - Streaming chunk received
- `stream:complete` - Streaming finished
- `conversation:created` - New conversation started
- `conversation:cleared` - Conversation deleted
- `context:pruned` - Context size limit reached
- `plan:generated` - Action plan created
- `rollback:generated` - Rollback plan created
- `provider:switched` - AI provider changed

## Lesson

- Events enable observability without tight coupling
- Consumers can add logging, metrics, UI updates independently
- Event names follow pattern: `resource:action` for clarity
- Always call `removeAllListeners()` in cleanup/reset functions
- EventEmitter adds minimal overhead but significant flexibility

## When to Use

- When building service layers that need loose coupling
- When multiple consumers need to react to service operations
- When adding logging, metrics, or monitoring to services
- When building reactive architectures

## Related Learnings

- L002: EventEmitter typing in strict mode
- L013: Service integration via singleton pattern and event forwarding
- L036: Event forwarding in wrapper classes
