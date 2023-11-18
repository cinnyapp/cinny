import React, { useCallback, useEffect, useState } from 'react';

export type Pan = {
  translateX: number;
  translateY: number;
};

const INITIAL_PAN: Pan = {
  translateX: 0,
  translateY: 0,
};

export const usePan = (active: boolean) => {
  const [pan, setPan] = useState<Pan>(INITIAL_PAN);
  const [cursor, setCursor] = useState<'grab' | 'grabbing' | 'initial'>(
    active ? 'grab' : 'initial'
  );
  const [status, setStatus] = useState<'idle' | 'moving'>('idle');

  useEffect(() => {
    setCursor(active ? 'grab' : 'initial');
  }, [active]);

  const handleMouseMove = useCallback((evt: MouseEvent) => {
    evt.preventDefault();
    evt.stopPropagation();

    setPan((p) => {
      const { translateX, translateY } = p;
      const mX = translateX + evt.movementX;
      const mY = translateY + evt.movementY;

      return { translateX: mX, translateY: mY };
    });
  }, []);

  const handleMouseUp = useCallback(
    (evt: MouseEvent) => {
      evt.preventDefault();
      setCursor('grab');
      setStatus('idle');

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    },
    [handleMouseMove]
  );

  const handleMouseDown = useCallback(
    (evt: React.MouseEvent<HTMLElement>) => {
      if (!active) return;
      evt.preventDefault();
      setCursor('grabbing');
      setStatus('moving');

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [active, handleMouseMove, handleMouseUp]
  );

  useEffect(() => {
    if (!active) setPan(INITIAL_PAN);
  }, [active]);

  return {
    pan,
    setPan,
    cursor,
    status,
    onMouseDown: handleMouseDown,
  };
};
