/**
 * React Hooks for IPC Communication
 * Provides React hooks for type-safe IPC calls and event subscriptions
 * AC-1.2.3.6: React hook (useIPC) for renderer-side IPC calls
 */

import { useEffect, useCallback, useRef, useState, type DependencyList } from 'react';
import type {
  IPCChannel,
  IPCEventType,
  IPCChannelPayloads,
  IPCChannelResponses,
  IPCEventPayloads,
} from '../../types/ipc';

// ============================================================================
// Core IPC Hook
// ============================================================================

/**
 * Main IPC hook for invoking handlers
 * Returns a memoized invoke function
 */
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

// ============================================================================
// Event Subscription Hook
// ============================================================================

/**
 * Hook for subscribing to IPC events
 * Automatically unsubscribes on unmount
 */
export function useIPCEvent<E extends IPCEventType>(
  event: E,
  callback: (payload: IPCEventPayloads[E]) => void,
  deps: DependencyList = []
): void {
  // Use ref to always have latest callback without re-subscribing
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const unsubscribe = window.api.on(event, (payload) => {
      callbackRef.current(payload);
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

/**
 * Hook for one-time IPC event listening
 * Automatically cleans up after receiving the event
 */
export function useIPCEventOnce<E extends IPCEventType>(
  event: E,
  callback: (payload: IPCEventPayloads[E]) => void,
  deps: DependencyList = []
): void {
  useEffect(() => {
    window.api.once(event, callback);
    // No cleanup needed - once() automatically removes the listener
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

// ============================================================================
// Mutation Hook (for commands that change state)
// ============================================================================

export interface IPCMutationOptions<C extends IPCChannel> {
  onSuccess?: (data: IPCChannelResponses[C]) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
}

export interface IPCMutationResult<C extends IPCChannel> {
  mutate: (payload: IPCChannelPayloads[C]) => Promise<void>;
  mutateAsync: (payload: IPCChannelPayloads[C]) => Promise<IPCChannelResponses[C]>;
  data: IPCChannelResponses[C] | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

/**
 * Hook for IPC mutations (commands that change state)
 * Provides loading/error/success states similar to React Query
 */
export function useIPCMutation<C extends IPCChannel>(
  channel: C,
  options?: IPCMutationOptions<C>
): IPCMutationResult<C> {
  const [data, setData] = useState<IPCChannelResponses[C] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mutateAsync = useCallback(
    async (payload: IPCChannelPayloads[C]): Promise<IPCChannelResponses[C]> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await window.api.invoke(channel, payload);
        setData(result);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        options?.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
        options?.onSettled?.();
      }
    },
    [channel, options]
  );

  const mutate = useCallback(
    async (payload: IPCChannelPayloads[C]): Promise<void> => {
      await mutateAsync(payload);
    },
    [mutateAsync]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    mutate,
    mutateAsync,
    data,
    error,
    isLoading,
    isSuccess: !isLoading && !error && data !== null,
    isError: !isLoading && error !== null,
    reset,
  };
}

// ============================================================================
// Query Hook (for fetching data)
// ============================================================================

export interface IPCQueryOptions<C extends IPCChannel> {
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: IPCChannelResponses[C]) => void;
  onError?: (error: Error) => void;
}

export interface IPCQueryResult<C extends IPCChannel> {
  data: IPCChannelResponses[C] | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook for IPC queries (fetching data)
 * Automatically fetches on mount and provides refetch capability
 */
export function useIPCQuery<C extends IPCChannel>(
  channel: C,
  payload: IPCChannelPayloads[C],
  options?: IPCQueryOptions<C>
): IPCQueryResult<C> {
  const [data, setData] = useState<IPCChannelResponses[C] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const enabled = options?.enabled ?? true;
  const refetchOnMount = options?.refetchOnMount ?? true;
  const refetchInterval = options?.refetchInterval;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.api.invoke(channel, payload);
      setData(result);
      options?.onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      options?.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [channel, payload, enabled, options]);

  // Initial fetch
  useEffect(() => {
    if (refetchOnMount && enabled) {
      fetchData();
    }
  }, [fetchData, refetchOnMount, enabled]);

  // Polling
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const intervalId = setInterval(fetchData, refetchInterval);

    return () => clearInterval(intervalId);
  }, [fetchData, refetchInterval, enabled]);

  return {
    data,
    error,
    isLoading,
    isSuccess: !isLoading && !error && data !== null,
    isError: !isLoading && error !== null,
    refetch: fetchData,
  };
}

// ============================================================================
// Specialized Hooks for Common Patterns
// ============================================================================

/**
 * Hook for skills list
 */
export function useSkills(query?: IPCChannelPayloads['skills:list']) {
  return useIPCQuery('skills:list', query || {});
}

/**
 * Hook for pending proposals
 */
export function usePendingProposals() {
  const [proposals, setProposals] = useState<any[]>([]);

  const query = useIPCQuery('proposals:get-pending', undefined);

  // Subscribe to new proposals
  useIPCEvent('proposal:new', (event) => {
    setProposals((prev) => [...prev, event.proposal]);
  });

  // Subscribe to approved proposals
  useIPCEvent('proposal:approved', (event) => {
    setProposals((prev) => prev.filter((p) => p.id !== event.proposalId));
  });

  // Subscribe to rejected proposals
  useIPCEvent('proposal:rejected', (event) => {
    setProposals((prev) => prev.filter((p) => p.id !== event.proposalId));
  });

  return {
    ...query,
    proposals: proposals.length > 0 ? proposals : query.data || [],
  };
}

/**
 * Hook for trust levels
 */
export function useTrustLevels() {
  const query = useIPCQuery('trust:get-levels', undefined);

  // Subscribe to trust level updates
  useIPCEvent('trust:level-updated', () => {
    query.refetch();
  });

  return query;
}

/**
 * Hook for submitting text input
 */
export function useSubmitInput() {
  return useIPCMutation('input:submit-text');
}

/**
 * Hook for confirming proposals
 */
export function useConfirmProposal() {
  return useIPCMutation('proposals:confirm');
}

/**
 * Hook for rejecting proposals
 */
export function useRejectProposal() {
  return useIPCMutation('proposals:reject');
}
