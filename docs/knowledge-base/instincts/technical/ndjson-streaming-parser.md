# L018: NDJSON Streaming Parser Implementation

**Category:** I/O / Protocol Handling
**Confidence:** 0.95 (Stream parsing pattern)
**Session:** T-3.1.1 (Ollama Client Service)
**Date:** 2026-01-30

## Discovery

NDJSON (newline-delimited JSON) is used by Ollama and other APIs for streaming responses. Each line is a separate JSON object, but network chunks can split JSON objects across boundaries. Proper implementation requires maintaining a buffer for incomplete lines.

## The Problem

When receiving streaming data, you might receive chunks like:

```
Chunk 1: '{"model":"llama3.2","response":"Hello","done":false}\n{"model":"llama3.2","response":" wo'
Chunk 2: 'rld","done":true}\n'
```

If you parse line-by-line without buffering, you'll try to parse an incomplete JSON object and fail:

```
❌ JSON.parse('{"model":"llama3.2","response":" wo') // SyntaxError!
```

## The Solution

**Maintain a buffer for incomplete lines:**

```typescript
async parseStreamingResponse(
  response: Response,
  onChunk: (chunk: string) => void
): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';  // ← Holds incomplete line
  let fullResponse = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines (NDJSON format)
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';  // ← Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {  // Skip empty lines
          try {
            const chunk = JSON.parse(line);

            // Emit chunk text via callback
            if (chunk.response) {
              onChunk(chunk.response);
              fullResponse += chunk.response;
            }

            // Emit progress event
            this.emit('generate:chunk', chunk);

            // Stop when generation is complete
            if (chunk.done) {
              return fullResponse;
            }
          } catch (error) {
            throw new OllamaInvalidResponseError(
              `Failed to parse JSON chunk: ${line}`,
              error as Error
            );
          }
        }
      }
    }

    // Handle final incomplete line (if stream ended without newline)
    if (buffer.trim()) {
      try {
        const chunk = JSON.parse(buffer);
        if (chunk.response) {
          onChunk(chunk.response);
          fullResponse += chunk.response;
        }
        this.emit('generate:chunk', chunk);
      } catch (error) {
        throw new OllamaInvalidResponseError(
          `Failed to parse final JSON chunk: ${buffer}`,
          error as Error
        );
      }
    }

    return fullResponse;
  } finally {
    reader.releaseLock();
  }
}
```

## How It Works

**Example with actual data:**

```
Network receives:
  Chunk 1: '{"response":"Hel'
  Chunk 2: 'lo"}\n{"response":" there"}\n'

Step-by-step:
1. buffer = '' → Add Chunk 1 → buffer = '{"response":"Hel'
2. split('\n') → ['{"response":"Hel'] → lines.pop() → buffer = '{"response":"Hel'
3. No complete lines yet, loop continues

4. buffer = '{"response":"Hel' → Add Chunk 2 → buffer = '{"response":"Hello"}\n{"response":" there"}\n'
5. split('\n') → ['{"response":"Hello"}', '{"response":" there"}', '']
6. lines.pop() → buffer = '' (last element is empty string after \n)
7. Process complete lines:
   - JSON.parse('{"response":"Hello"}') ✅
   - JSON.parse('{"response":" there"}') ✅

8. No more chunks (done=true), return fullResponse
```

## Critical Details

### 1. **Always pop the last element**

```typescript
const lines = buffer.split('\n');
buffer = lines.pop() || ''; // ← Might be incomplete
```

The last element after split might be an incomplete line. By popping it, you keep it in the buffer for the next chunk.

### 2. **Check trim() before parsing**

```typescript
if (line.trim()) {
  // ← Skips empty lines
  const chunk = JSON.parse(line);
}
```

Empty lines from trailing `\n` would cause parse errors.

### 3. **Handle final incomplete line**

```typescript
if (buffer.trim()) {
  const chunk = JSON.parse(buffer); // ← Last chunk might not end with \n
}
```

If the stream ends without a trailing newline, the final JSON is still in the buffer.

### 4. **Release reader lock**

```typescript
finally {
  reader.releaseLock();  // ← Always release, even on error
}
```

Prevents "ReadableStreamDefaultReader locked" errors.

## NDJSON Format

Each line is a separate JSON object:

```
{"model":"llama3.2","response":"Hello","done":false}
{"model":"llama3.2","response":" world","done":false}
{"model":"llama3.2","response":"!","done":true}
```

**Not:**

```
[
  {"model":"llama3.2","response":"Hello"},
  {"model":"llama3.2","response":" world"}
]
```

NDJSON is simpler for streaming because:

- Each line is independently parseable
- No array wrapping overhead
- Simple line-by-line protocol
- Works well for event-driven processing

## Application to Ollama

Ollama uses NDJSON for:

1. **Generation streaming:** `POST /api/generate` with `stream: true`

   ```json
   {"model":"llama3.2","response":"chunk1","done":false}
   {"model":"llama3.2","response":"chunk2","done":false}
   {"model":"llama3.2","response":"chunk3","done":true}
   ```

2. **Model pulling:** `POST /api/pull` with download progress
   ```json
   {"status":"downloading","total":1000000,"completed":250000}
   {"status":"downloading","total":1000000,"completed":500000}
   {"status":"success","digest":"sha256:abc..."}
   ```

## Error Handling

**Gracefully handle parse errors:**

```typescript
try {
  const chunk = JSON.parse(line);
  processChunk(chunk);
} catch (error) {
  throw new OllamaInvalidResponseError(`Failed to parse JSON chunk: ${line}`, error as Error);
}
```

This provides:

- Clear error message with the problematic line
- Cause chaining for debugging
- User-friendly error type

## Performance Notes

- **Buffer size:** Typically small (< 1KB for metadata)
- **Split operation:** Linear in buffer size, acceptable
- **Parsing:** One JSON.parse per complete line (as received)
- **Memory:** O(chunk size) at peak, not O(total response size)

## See Also

- [L016: HTTP Client Retry Pattern with Exponential Backoff](http-client-retry-exponential-backoff.md)
- [L017: Custom Error Hierarchy with Cause Chaining](custom-error-hierarchy-cause-chaining.md)
- Streaming implementation: `src/main/services/ai/ollamaClient.ts:394` (parseStreamingResponse)
- Pull progress parsing: `src/main/services/ai/ollamaClient.ts:189` (pullModel)
- Tests: `src/main/services/ai/__tests__/ollamaClient.test.ts` (streaming tests)
