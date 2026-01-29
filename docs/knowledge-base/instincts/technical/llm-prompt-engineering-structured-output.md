# L022: LLM Prompt Engineering for Structured Output

**Category:** AI / Prompt Engineering
**Confidence:** 0.90 (LLM best practice)
**Session:** T-3.1.2 (Evaluation LLM Service)
**Date:** 2026-01-30

## Discovery

When prompting LLMs for structured JSON output, **explicit guidelines** about each field's purpose, valid values, and decision logic dramatically improve consistency and reduce validation errors.

Structure + Examples + Guidelines = High-quality structured output

## The Problem

Vague prompts produce inconsistent results:

```typescript
// ❌ Bad prompt
const prompt = `Generate a JSON object for the user input: "${input.text}"`;

// Results in:
// - Inconsistent field names (intent vs description vs summary)
// - Wrong types (confidence as string "high" instead of number 0.9)
// - Missing fields
// - Invalid enum values
// - Requires many retries
```

## The Solution

**Structure prompts with numbered steps, explicit guidelines, and examples:**

```typescript
private buildPrompt(input: ProposalGenerationInput): string {
  // Add conversation context if available
  let contextSection = '';
  if (input.context?.conversation_history?.length > 0) {
    const recentMessages = input.context.conversation_history
      .slice(-3) // Last 3 messages only
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    contextSection = `\nRecent conversation:\n${recentMessages}\n`;
  }

  return `You are an AI assistant that analyzes user requests and generates structured action proposals.

${contextSection}
User Input: "${input.text}"

Your task:
1. Analyze the user's intent and summarize what they want to accomplish
2. Determine the operation type in format "module:action" (e.g., "incident:create", "calendar:read")
3. Identify the target entity if applicable (null for new entities)
4. Assess data domain (enterprise for work-related, personal for individual tasks)
5. Classify data sensitivity (public, internal, confidential, restricted)
6. Determine reversibility type based on operation:
   - FULL: Read operations, easily undoable creates
   - PARTIAL: Updates where some changes can't be reversed
   - COMPENSATABLE: Deletes that can be recreated
   - IRREVERSIBLE: Sends, publishes, irreversible operations
7. Assign confidence score (0.0-1.0) based on clarity:
   - 0.9-1.0: Clear, unambiguous intent
   - 0.7-0.9: Mostly clear, minor ambiguity
   - 0.5-0.7: Moderate ambiguity
   - Below 0.5: Unclear or insufficient information
8. Determine if confirmation is required (true for write/delete, false for reads)
9. Assess risk level:
   - low: Read operations, simple views
   - medium: Create/update operations, reversible changes
   - high: Delete operations, bulk operations, irreversible changes

Available operation types (examples):
- incident:create, incident:update, incident:read, incident:delete
- calendar:create, calendar:update, calendar:read, calendar:delete
- task:create, task:update, task:read, task:delete
- note:create, note:update, note:read, note:delete
- file:read, file:write, file:delete

Guidelines:
- Use lowercase with underscores for operation names (e.g., "incident:create" not "Incident:Create")
- Set requires_confirmation=true for any write/delete operations
- High-risk operations (deletes, bulk) must require confirmation
- Read operations should be low risk and not require confirmation
- Confidence should reflect clarity of user intent, not system capability
- Data classification: public (no sensitive data), internal (company info), confidential (restricted), restricted (highly sensitive)

Generate a valid ActionProposal JSON object following the schema exactly.`;
}
```

## Why This Works

**Numbered Steps:**

- Provide clear structure for LLM to follow
- Reduce chance of skipping required fields
- Create logical flow for decision-making

**Explicit Guidelines:**

- Remove ambiguity about field meanings
- Specify format requirements (lowercase, pattern)
- Define value ranges and their meanings

**Examples:**

- Show concrete instances of valid operations
- Demonstrate correct format patterns
- Reduce format errors

**If-Then Logic:**

- Guide decision-making for complex fields
- Explain relationships between fields
- Improve logical consistency

**Context Integration:**

- Include conversation history for better understanding
- Maintain coherence across multi-turn interactions
- Improve confidence scoring accuracy

## Prompt Structure Template

```typescript
`You are [role with clear purpose].

[Optional: Context section - conversation, current state]

User Input: "[actual input]"

Your task:
1. [First step with clear objective]
2. [Second step with decision criteria]
3. [Continue numbered list]
...

Available [options/values] (examples):
- [Example 1 with format]
- [Example 2 with format]
- [Example 3 with format]

Guidelines:
- [Format requirement 1]
- [Decision rule 1]
- [Safety rule 1]
- [If-then logic 1]
...

Generate [output format description].`;
```

## Field-Specific Guidance

**For Enums:**

```typescript
// ✅ Good: List all valid values with explanations
risk_level:
- low: Read operations, simple views
- medium: Create/update operations, reversible changes
- high: Delete operations, bulk operations, irreversible changes

// ❌ Bad: Just list values
risk_level: low, medium, high
```

**For Numeric Ranges:**

```typescript
// ✅ Good: Explain what different values mean
confidence (0.0-1.0):
- 0.9-1.0: Clear, unambiguous intent
- 0.7-0.9: Mostly clear, minor ambiguity
- 0.5-0.7: Moderate ambiguity
- Below 0.5: Unclear or insufficient information

// ❌ Bad: Just give range
confidence: number between 0 and 1
```

**For Complex Logic:**

```typescript
// ✅ Good: Explicit if-then rules
reversibility based on operation:
- FULL: Read operations, easily undoable creates
- PARTIAL: Updates where some changes can't be reversed
- COMPENSATABLE: Deletes that can be recreated
- IRREVERSIBLE: Sends, publishes, irreversible operations

// ❌ Bad: Leave it to LLM interpretation
reversibility: choose appropriate value
```

## Prompt Optimization Tips

1. **Keep prompts focused:** Don't add unnecessary context or verbose explanations
2. **Use consistent terminology:** Same terms as in schema (e.g., "operation" not "action type")
3. **Provide format patterns:** Show exact format for strings (e.g., `module:action`)
4. **Give decision trees:** If X then Y, else Z (reduces ambiguity)
5. **Include recent context only:** Last 3 messages, not entire history
6. **Avoid redundancy:** Don't repeat what's in the schema
7. **Test with edge cases:** Unclear input, ambiguous requests, missing information

## Measuring Prompt Quality

Track these metrics to optimize prompts:

```typescript
{
  first_attempt_success_rate: 0.92,  // % valid on first try
  avg_confidence_score: 0.85,         // Average confidence
  avg_corrections_needed: 0.3,        // Business rule fixes per proposal
  avg_generation_time_ms: 2100,      // Latency
  retry_rate: 0.08                    // % requiring retries
}
```

**Good prompt indicators:**

- First attempt success rate > 90%
- Average corrections < 0.5 per proposal
- Retry rate < 10%

## Anti-Pattern

❌ **Bad:** Vague, unstructured prompt

```typescript
const prompt = `Create a proposal for: ${input.text}. Make it JSON format.`;
// Results: Inconsistent, many validation errors
```

✅ **Good:** Structured with guidelines

```typescript
const prompt = `
You are an AI that generates action proposals.

Task:
1. Analyze intent
2. Choose operation (format: module:action)
3. Assess risk (low/medium/high)
...

Guidelines:
- Delete operations → high risk
- Read operations → low risk
...
`;
// Results: Consistent, few validation errors
```

❌ **Bad:** No examples or format guidance

```typescript
confidence: 'Set confidence between 0 and 1';
// Results: Sometimes string "high", sometimes 0.9, sometimes null
```

✅ **Good:** Explicit range with meaning

```typescript
confidence (0.0-1.0):
- 0.9-1.0: Clear intent
- 0.7-0.9: Minor ambiguity
- 0.5-0.7: Moderate ambiguity
// Results: Consistently numeric, appropriate values
```

## Temperature Settings

Pair good prompts with appropriate temperature:

| Temperature | Use Case                   | Structure Quality   |
| ----------- | -------------------------- | ------------------- |
| 0.0-0.2     | Structured output, schemas | Maximum consistency |
| 0.3-0.5     | Balance structure/variety  | Good consistency    |
| 0.6-0.8     | Creative content           | Variable structure  |
| 0.9-1.0     | Maximum creativity         | Unpredictable       |

For structured output: **Use 0.1-0.2** with well-designed prompts.

## See Also

- [L020: Constrained JSON Decoding with Ollama](constrained-json-decoding-ollama.md)
- [L021: Business Rule Validation vs Schema Validation](business-rule-validation-vs-schema.md)
- [L023: Retry Strategy for LLM Generation](retry-strategy-llm-generation.md)
- Evaluation LLM Service: `src/main/services/ai/evaluationLlmService.ts` (see `buildPrompt`)
- Prompt examples: Unit tests in `src/main/services/ai/__tests__/evaluationLlmService.test.ts`
