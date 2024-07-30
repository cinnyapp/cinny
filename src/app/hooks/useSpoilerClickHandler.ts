import { ReactEventHandler, useCallback } from 'react';

export const useSpoilerClickHandler = (): ReactEventHandler<HTMLElement> => {
  const handleClick: ReactEventHandler<HTMLElement> = useCallback((evt) => {
    const target = evt.currentTarget;
    if (target.getAttribute('aria-pressed') === 'true') {
      evt.stopPropagation();
      target.setAttribute('aria-pressed', 'false');
      target.style.cursor = 'initial';
    }
  }, []);

  return handleClick;
};
