# L038: Test Mocking Strategies for Third-Party Clients

**Category:** Testing / Mocking
**Confidence:** 0.95 (Standard testing pattern)
**Session:** T-3.2.1 (AI Provider Interface)
**Date:** 2026-01-30

## Discovery

When testing wrapper classes that depend on third-party clients, **mock at the module level** but preserve the interface. This provides control over responses while maintaining realism.

## The Pattern

```typescript
// In test file
vi.mock('../ollamaClient', () => {
  const EventEmitter = require('events');

  class MockOllamaClient extends EventEmitter {
    async generate() {
      return 'mocked text';
    }

    async generateStream(request, onChunk) {
      onChunk('chunk1');
      onChunk('chunk2');
      return 'chunk1chunk2';
    }

    async checkHealth() {
      return true;
    }

    async listModels() {
      return [
        {
          name: 'qwen2.5:3b',
          modified_at: '2026-01-30T00:00:00Z',
          size: 1000000,
          digest: 'abc123',
          details: {
            format: 'gguf',
            family: 'qwen',
            parameter_size: '3B',
            quantization_level: 'Q4_0',
          },
        },
      ];
    }
  }

  return { OllamaClient: MockOllamaClient };
});

// Tests run without real dependencies
describe('OllamaProvider', () => {
  it('should generate text', async () => {
    const provider = createOllamaProvider(config);
    const response = await provider.generate({ model: 'test', prompt: 'hi' });
    expect(response.text).toBe('mocked text');
  });
});
```

## Benefits

- Tests run without real dependencies
- Full control over responses
- Can test error cases easily
- Fast test execution
- No external service requirements

## Best Practices

1. **Mock returns same types as real implementation**
2. **Include EventEmitter if wrapped class uses it**
3. **Test both success and error paths**
4. **Keep mock simple but realistic**

```typescript
// Test error cases
class MockOllamaClient {
  async generate() {
    if (this.shouldFail) {
      throw new OllamaConnectionError('Connection failed');
    }
    return 'success';
  }

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }
}
```

## See Also

- Implementation: `src/main/services/ai/__tests__/providers.test.ts`
- Vitest Mocking: https://vitest.dev/guide/mocking.html
