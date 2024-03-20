import React, { RefObject, useCallback, useState } from 'react';
import { Box, as } from 'folds';
import classNames from 'classnames';
import * as css from './style.css';
import {
  getIntersectionObserverEntry,
  useIntersectionObserver,
} from '../../hooks/useIntersectionObserver';

export const ScrollTopContainer = as<
  'div',
  {
    scrollRef?: RefObject<HTMLElement>;
    anchorRef: RefObject<HTMLElement>;
  }
>(({ className, scrollRef, anchorRef, ...props }, ref) => {
  const [onTop, setOnTop] = useState(true);

  useIntersectionObserver(
    useCallback(
      (intersectionEntries) => {
        if (!anchorRef.current) return;
        const entry = getIntersectionObserverEntry(anchorRef.current, intersectionEntries);
        if (entry) setOnTop(entry.isIntersecting);
      },
      [anchorRef]
    ),
    useCallback(() => ({ root: scrollRef?.current }), [scrollRef]),
    useCallback(() => anchorRef.current, [anchorRef])
  );

  if (onTop) return null;

  return <Box className={classNames(css.ScrollTopContainer, className)} {...props} ref={ref} />;
});
