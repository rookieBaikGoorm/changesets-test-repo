import { useState, useEffect } from 'react';

/**
 * Debounce a value
 * @param value - value to debounce
 * @param delay - delay in milliseconds
 * @returns debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Fix: Handle zero delay case immediately
    if (delay === 0) {
      setDebouncedValue(value);
      return;
    }

    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
