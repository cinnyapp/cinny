import React, { MutableRefObject, ReactNode } from 'react';
import { Box, Scroll } from 'folds';
import * as css from './style.css';

export function ClientDrawerContentLayout({
  scrollRef,
  children,
}: {
  children: ReactNode;
  scrollRef?: MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <Box grow="Yes" direction="Column">
      <Scroll
        ref={scrollRef}
        variant="Background"
        direction="Vertical"
        size="300"
        hideTrack
        visibility="Hover"
      >
        <div className={css.ClientDrawerContentLayout}>{children}</div>
      </Scroll>
    </Box>
  );
}
