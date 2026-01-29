# L036: Event Forwarding in Wrapper Classes

**Category:** Event-Driven Architecture
**Confidence:** 0.90 (Best practice)
**Session:** T-3.2.1 (AI Provider Interface)
**Date:** 2026-01-30

## Discovery

When wrapping classes that emit events, **forward those events** to maintain the event-driven interface. Consumers expect to listen for progress events, even through abstraction layers.

## The Pattern

```typescript
class OllamaProvider extends EventEmitter implements IAIProvider {
  private client: OllamaClient; // Also extends EventEmitter

  constructor(config: AIProviderConfig) {
    super();
    this.client = new OllamaClient(config);

    // Forward events from wrapped client
    this.client.on('pull:progress', (progress) => {
      this.emit('pull:progress', progress);
    });

    this.client.on('generate:chunk', (chunk) => {
      this.emit('generate:chunk', chunk);
    });
  }
}
```

## Why Important

- Consumers might listen for progress events
- Wrapper should be drop-in replacement
- Maintains reactive programming patterns
- Allows for event transformation if needed

## Considerations

```typescript
// 1. Forward all relevant events
this.client.on('event1', (data) => this.emit('event1', data));
this.client.on('event2', (data) => this.emit('event2', data));

// 2. Transform event payloads for consistency
this.client.on('progress', (ollamaProgress) => {
  this.emit('progress', {
    provider: 'ollama',
    percent: ollamaProgress.percentage,
    ...ollamaProgress
  });
});

// 3. Handle cleanup (remove listeners)
destroy() {
  this.client.removeAllListeners();
  this.removeAllListeners();
}
```

## See Also

- [L033: Simplified API Wrapping Pattern](simplified-api-wrapping.md)
- Implementation: `src/main/services/ai/providers/ollama.ts`
