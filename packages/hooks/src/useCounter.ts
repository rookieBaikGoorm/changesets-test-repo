import { useState, useCallback } from 'react';

export interface UseCounterReturn {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  incrementBy: (amount: number) => void;
  decrementBy: (amount: number) => void;
  setValue: (value: number) => void;
}

export function useCounter(initialValue = 0): UseCounterReturn {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  const decrement = useCallback(() => {
    setCount((prev) => prev - 1);
  }, []);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  const incrementBy = useCallback((amount: number) => {
    setCount((prev) => prev + amount);
  }, []);

  const decrementBy = useCallback((amount: number) => {
    setCount((prev) => prev - amount);
  }, []);

  const setValue = useCallback((value: number) => {
    setCount(value);
  }, []);

  return {
    count,
    increment,
    decrement,
    reset,
    incrementBy,
    decrementBy,
    setValue,
  };
}
