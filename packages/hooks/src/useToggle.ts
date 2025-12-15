import { useState, useCallback } from 'react';

export interface UseToggleReturn {
  value: boolean;
  toggle: () => void;
  setTrue: () => void;
  setFalse: () => void;
  setValue: (value: boolean) => void;
  reset: () => void;
}

export function useToggle(initialValue = false): UseToggleReturn {
  const [value, setInternalValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setInternalValue((prev) => !prev);
  }, []);

  const setTrue = useCallback(() => {
    setInternalValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setInternalValue(false);
  }, []);

  const setValue = useCallback((newValue: boolean) => {
    setInternalValue(newValue);
  }, []);

  const reset = useCallback(() => {
    setInternalValue(initialValue);
  }, [initialValue]);

  return {
    value,
    toggle,
    setTrue,
    setFalse,
    setValue,
    reset,
  };
}
