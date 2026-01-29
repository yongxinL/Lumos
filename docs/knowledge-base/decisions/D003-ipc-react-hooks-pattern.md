# D003: IPC React Hooks Pattern Selection

**Status:** Accepted
**Date:** 2026-01-29
**Context:** T-1.2.3 - IPC Bridge Implementation
**Deciders:** Development Team

## Context

Needed to design React hooks for IPC communication that:

1. Provide type-safe interface to IPC channels
2. Handle loading/error states automatically
3. Feel familiar to React developers
4. Support both request-response and event subscription patterns
5. Prevent memory leaks from event listeners

## Decision

Implement React hooks modeled after **React Query patterns**:

- `useIPC()` - Core invoke function (like `useMutation` invoke)
- `useIPCMutation()` - For commands that change state
- `useIPCQuery()` - For data fetching with auto-refetch
- `useIPCEvent()` - For event subscriptions with auto-cleanup

## Alternatives Considered

### 1. Redux-Style Actions

```typescript
// Dispatch actions for IPC
const dispatch = useIPCDispatch();
dispatch({ type: 'input:submit-text', payload: text });
```

**Pros:** Familiar to Redux users, clear action flow
**Cons:** More boilerplate, less type-safe, requires middleware setup

### 2. Simple Wrapper Hook

```typescript
// Single generic hook
const { data, loading, error } = useIPC('skills:list', {});
```

**Pros:** Minimal API surface
**Cons:** No distinction between queries and mutations, harder to optimize

### 3. Context-Based Provider

```typescript
// Provider wraps app
<IPCProvider>
  <App />
</IPCProvider>

const ipc = useIPCContext();
```

**Pros:** Easy global configuration
**Cons:** Extra provider layer, less flexible, harder to test

### 4. RxJS Observables

```typescript
// Observable-based
const result$ = useIPCObservable('skills:list');
```

**Pros:** Powerful stream operations
**Cons:** RxJS dependency, steeper learning curve, overkill for simple IPC

## Rationale

### Why React Query Pattern?

1. **Familiar Developer Experience**
   - React Query is widely adopted (100K+ weekly downloads)
   - Developers already understand mutation/query distinction
   - Similar API reduces learning curve

2. **Built-in State Management**
   - Loading, error, success states handled automatically
   - No need for additional useState/useEffect boilerplate
   - Optimistic updates possible

3. **Type Safety**
   - TypeScript infers payload/response types from channel
   - Compile-time checking prevents invalid calls
   - IntelliSense shows available channels and payloads

4. **Memory Safety**
   - Event subscriptions auto-cleanup on unmount
   - No manual listener removal needed
   - useEffect dependency tracking prevents stale closures

5. **Performance Optimization**
   - Query results can be cached (future enhancement)
   - Mutations batch automatically (future enhancement)
   - Suspense support possible (future enhancement)

## Implementation

### Core Hook (useIPC)

```typescript
export function useIPC() {
  const invoke = useCallback(
    async <C extends IPCChannel>(
      channel: C,
      payload: IPCChannelPayloads[C]
    ): Promise<IPCChannelResponses[C]> => {
      return window.api.invoke(channel, payload);
    },
    []
  );
  return { invoke };
}
```

### Mutation Hook (useIPCMutation)

```typescript
export function useIPCMutation<C extends IPCChannel>(
  channel: C,
  options?: IPCMutationOptions<C>
): IPCMutationResult<C> {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const mutateAsync = useCallback(
    async (payload) => {
      setIsLoading(true);
      try {
        const result = await window.api.invoke(channel, payload);
        setData(result);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        setError(err);
        options?.onError?.(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [channel, options]
  );

  return { mutateAsync, data, error, isLoading };
}
```

### Event Hook (useIPCEvent)

```typescript
export function useIPCEvent<E extends IPCEventType>(
  event: E,
  callback: (payload: IPCEventPayloads[E]) => void
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const unsubscribe = window.api.on(event, (payload) => {
      callbackRef.current(payload);
    });
    return unsubscribe;
  }, [event]);
}
```

## Consequences

### Positive

- ✅ Familiar API for React developers
- ✅ Less boilerplate in components
- ✅ Type-safe throughout
- ✅ Automatic memory cleanup
- ✅ Easy to test (mock window.api)
- ✅ Extensible (custom hooks built on top)

### Negative

- ⚠️ Different from Electron IPC conventions (more web-like)
- ⚠️ Slight learning curve for Electron-first developers
- ⚠️ Future migration to React Query requires refactor

### Neutral

- 📝 Adds ~450 lines of hook code
- 📝 Requires global type declarations for window.api
- 📝 Hooks follow React rules (can't call conditionally)

## Specialized Hooks Built

Built on core hooks for common patterns:

- `useSkills()` - Fetch skills list
- `usePendingProposals()` - Fetch + subscribe to proposals
- `useTrustLevels()` - Fetch + subscribe to trust updates
- `useSubmitInput()` - Submit text input mutation
- `useConfirmProposal()` - Confirm proposal mutation
- `useRejectProposal()` - Reject proposal mutation

## Validation

From T-1.2.3 implementation:

- ✅ All hooks type-check successfully
- ✅ Build passes with no warnings
- ✅ Memory cleanup verified (no leaks in useEffect)
- ✅ TypeScript inference works correctly
- ✅ Developer experience tested positive

## Future Enhancements

1. **Caching**: Add in-memory cache for query results
2. **Suspense**: Support React Suspense for loading states
3. **Optimistic Updates**: Update UI before server response
4. **Retry Logic**: Automatic retry for failed mutations
5. **Request Deduplication**: Merge identical concurrent requests

## References

- React Query documentation
- React hooks best practices
- Electron IPC patterns
- TypeScript generic constraints

---

**Tags:** #decision #react #hooks #ipc #type-safety #developer-experience
**Status:** Accepted and Implemented
**Review Date:** 2026-03-29 (2 months)
