# L042: Context Pruning Strategy

**ID:** L042
**Date:** 2026-01-30
**Session:** T-3.2.2 (Expert AI Service)
**Confidence:** 0.90
**Category:** AI / Context Management
**Tags:** #ai #llm #context-management #conversation #pruning

---

## Discovery

Multi-turn conversations can exceed token limits quickly. A pruning strategy that preserves system messages while removing oldest user/assistant pairs maintains conversation quality within constraints.

## Pattern

```typescript
private pruneContext(conversation: Conversation): void {
  if (conversation.messages.length <= this.config.maxConversationLength) {
    return; // No pruning needed
  }

  // Separate system messages (always keep) from user/assistant pairs
  const systemMessages = conversation.messages.filter((m) => m.role === 'system');
  const recentMessages = conversation.messages
    .filter((m) => m.role !== 'system')
    .slice(-this.config.maxConversationLength); // Keep most recent

  conversation.messages = [...systemMessages, ...recentMessages];
  this.emit('context:pruned', { conversationId: conversation.id });
}
```

## Lesson

- System messages define AI behavior, must never be pruned
- Prune oldest user/assistant pairs first (FIFO)
- Configurable `maxConversationLength` balances memory vs context retention
- Emit event when pruning for observability and debugging
- Consider sliding window vs. fixed-size strategies based on use case
- For token-precise pruning, count actual tokens (not message count)

## When to Use

- When implementing multi-turn LLM conversations
- When managing conversation history for context retention
- When balancing token limits vs conversation continuity
- When building chat interfaces with AI models

## Advanced Considerations

- **Token Counting:** Use tokenizer to count actual tokens, not just message count
- **Sliding Window:** Keep recent N messages regardless of age
- **Semantic Importance:** Optionally keep important messages even if old
- **Compression:** Summarize old context instead of deleting

## Related Learnings

- L020: Constrained JSON decoding with Ollama format parameter
- L022: LLM prompt engineering for structured output
