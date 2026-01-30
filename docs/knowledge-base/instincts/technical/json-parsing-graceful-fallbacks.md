# L043: JSON Parsing with Graceful Fallbacks

**ID:** L043
**Date:** 2026-01-30
**Session:** T-3.2.2 (Expert AI Service)
**Confidence:** 0.95
**Category:** AI / JSON Parsing / Error Handling
**Tags:** #ai #json #parsing #error-handling #llm-output

---

## Discovery

AI-generated JSON may be malformed or unexpected. Parsing strategies should include error handling with detailed context, enabling debugging while gracefully handling failures.

## Pattern

```typescript
private parseActionPlan(content: string, proposal: ActionProposal): ActionPlan {
  try {
    const parsed = JSON.parse(content);

    // Validate structure and transform
    const steps: ActionStep[] = (parsed.steps || []).map((s: any, index: number) => ({
      order: s.order || index + 1,
      action: s.action || `Step ${index + 1}`,
      description: s.description || '',
      estimatedDurationMs: s.estimatedDurationMs,
    }));

    return {
      id: uuid(crypto.randomUUID()),
      proposalId: proposal.id,
      steps,
      prerequisites: parsed.prerequisites || [],
      expectedOutcomes: parsed.expectedOutcomes || [],
      validationChecks: parsed.validationChecks || [],
    };
  } catch (error) {
    // For critical operations, throw with context rather than silent fallback
    throw new ParsingError(
      'Failed to parse action plan JSON',
      content, // Include raw content for debugging
      error instanceof Error ? error : undefined
    );
  }
}
```

## Lesson

- Always wrap `JSON.parse()` in try-catch for AI-generated content
- For critical operations (planning, rollback), throw errors with full context
- ParsingError should include: message, raw content, original error
- Use fallback values for non-critical fields (empty arrays, default strings)
- Log parsing failures for prompt engineering improvements
- Consider retry with different prompt if parsing fails consistently

## When to Use

- When parsing LLM-generated JSON responses
- When AI output needs to conform to specific structures
- When implementing structured output extraction
- When building reliable AI integrations

## Error Handling Strategy

**For Critical Operations:**

```typescript
throw new ParsingError('Failed to parse', rawContent, originalError);
```

**For Non-Critical Fields:**

```typescript
const value = parsed.field || defaultValue;
```

## Related Learnings

- L020: Constrained JSON decoding with Ollama format parameter
- L021: Business rule vs schema validation
- L023: Retry strategy for LLM generation
