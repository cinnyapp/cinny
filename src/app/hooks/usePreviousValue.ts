import { useEffect, useRef } from 'react';

export const usePreviousValue = <T>(currentValue: T, initialValue: T) => {
  const valueRef = useRef(initialValue);

  useEffect(() => {
    valueRef.current = currentValue;
  }, [currentValue]);

  return valueRef.current;
};
