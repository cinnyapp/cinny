import { useRef } from 'react';

export const getAttemptDelaySec = (attempt: number): number => {
  if (attempt > 5) return 60;
  if (attempt === 5) return 45;
  if (attempt === 4) return 30;
  if (attempt === 3) return 15;
  if (attempt === 2) return 10;
  if (attempt === 1) return 5;

  return 0;
};

export const useRecoveryAttempt = (hasError: boolean, hasRecovered: boolean): number => {
  const recoverAttemptRef = useRef(0);

  if (hasError) {
    recoverAttemptRef.current += 1;
  }

  if (hasRecovered) {
    recoverAttemptRef.current = 0;
  }

  return recoverAttemptRef.current;
};
