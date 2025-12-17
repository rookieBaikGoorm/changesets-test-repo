import { useState, useEffect, useRef } from 'react';

export interface UseDebounceOptions {
  delay?: number;
  leading?: boolean;
  maxWait?: number;
}

/**
 * Debounce a value with advanced options
 * @param value - value to debounce
 * @param options - debounce configuration options
 * @returns debounced value
 */
export function useDebounce<T>(
  value: T,
  options: UseDebounceOptions | number = 500
): T {
  const delay = typeof options === 'number' ? options : options.delay ?? 500;
  const leading = typeof options === 'object' ? options.leading ?? false : false;
  const maxWait = typeof options === 'object' ? options.maxWait : undefined;

  const [debouncedValue, setDebouncedValue] = useState<T>(
    leading ? value : value
  );
  const lastExecutionTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Fix: Handle zero or negative delay case immediately
    if (delay <= 0) {
      setDebouncedValue(value);
      return;
    }

    // Leading edge: Update immediately on first change
    if (leading && lastExecutionTimeRef.current === 0) {
      setDebouncedValue(value);
      lastExecutionTimeRef.current = Date.now();
    }

    const handler = setTimeout(() => {
      setDebouncedValue(value);
      lastExecutionTimeRef.current = Date.now();
    }, delay);

    // Max wait: Ensure execution after maxWait time
    let maxWaitHandler: NodeJS.Timeout | undefined;
    if (maxWait !== undefined) {
      const elapsed = Date.now() - lastExecutionTimeRef.current;
      if (elapsed >= maxWait) {
        setDebouncedValue(value);
        lastExecutionTimeRef.current = Date.now();
      } else {
        maxWaitHandler = setTimeout(() => {
          setDebouncedValue(value);
          lastExecutionTimeRef.current = Date.now();
        }, maxWait - elapsed);
      }
    }

    return () => {
      clearTimeout(handler);
      if (maxWaitHandler) clearTimeout(maxWaitHandler);
    };
  }, [value, delay, leading, maxWait]);

  return debouncedValue;
}
