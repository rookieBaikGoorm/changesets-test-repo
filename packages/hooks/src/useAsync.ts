import { useState, useEffect, useCallback } from 'react';

export interface UseAsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export interface UseAsyncReturn<T> extends UseAsyncState<T> {
  execute: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook for handling async operations with loading and error states
 * @param asyncFunction - Async function to execute
 * @param immediate - Whether to execute immediately on mount (default: true)
 * @returns Object containing data, error, loading, execute, and reset
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
): UseAsyncReturn<T> {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    error: null,
    loading: immediate,
  });

  const execute = useCallback(async () => {
    setState({ data: null, error: null, loading: true });

    try {
      const data = await asyncFunction();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState({ data: null, error: error as Error, loading: false });
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { ...state, execute, reset };
}
