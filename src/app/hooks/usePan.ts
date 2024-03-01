import { MouseEventHandler, TouchEventHandler, useEffect, useState } from 'react';

export type Pan = {
  translateX: number;
  translateY: number;
};

export type TouchPos = {
  touchX: number;
  touchY: number;
  initX: number;
  initY: number;
}

const INITIAL_PAN = {
  translateX: 0,
  translateY: 0,
};

const INITIAL_TOUCH_POS = {
  touchX: 0,
  touchY: 0,
  initX: 0,
  initY: 0
};

export const usePan = (active: boolean) => {
  const [pan, setPan] = useState<Pan>(INITIAL_PAN);
  const [cursor, setCursor] = useState<'grab' | 'grabbing' | 'initial'>(
    active ? 'grab' : 'initial'
  );
  const [_touchPos, setTouchPos] = useState<TouchPos>(INITIAL_TOUCH_POS);

  useEffect(() => {
    setCursor(active ? 'grab' : 'initial');
  }, [active]);

  const handleMouseMove = (evt: MouseEvent) => {
    evt.preventDefault();
    evt.stopPropagation();

    setPan((p) => {
      const { translateX, translateY } = p;
      const mX = translateX + evt.movementX;
      const mY = translateY + evt.movementY;

      return { translateX: mX, translateY: mY };
    });
  };

  const handleMouseUp = (evt: MouseEvent) => {
    evt.preventDefault();
    setCursor('grab');

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown: MouseEventHandler<HTMLElement> = (evt) => {
    if (!active) return;
    evt.preventDefault();
    setCursor('grabbing');

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Touch handlers for usePan. Intentionally not handling 2 touches (may do in the future). 
  const handleTouchMove = (evt: TouchEvent) => {
    evt.preventDefault();
    evt.stopPropagation();
    evt.stopImmediatePropagation();

    let x = evt.touches[0].clientX;
    let y = evt.touches[0].clientY;

    setTouchPos(pos => {
      pos.touchX = x;
      pos.touchY = y;
      setPan({ translateX: pos.touchX - pos.initX, translateY: pos.touchY - pos.initY });
      return pos;
    });
  }

  const handleTouchEnd = (evt: TouchEvent) => {
    evt.preventDefault();
    evt.stopPropagation();
    evt.stopImmediatePropagation();
    setCursor('grab');

    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  }

  const handleTouchStart: TouchEventHandler<HTMLElement> = (evt) => {
    if (!active || evt.touches.length != 1) return;
    evt.preventDefault();
    evt.stopPropagation();
    setCursor('grabbing');

    let x = evt.touches[0].clientX;
    let y = evt.touches[0].clientY;
    setTouchPos({
      touchX: x,
      touchY: y,
      initX: x,
      initY: y
    });

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  }

  useEffect(() => {
    if (!active) setPan(INITIAL_PAN);
  }, [active]);

  return {
    pan,
    cursor,
    onMouseDown: handleMouseDown,
    onTouchStart: handleTouchStart,
  };
};
