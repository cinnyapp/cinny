import React, { ReactNode } from 'react';
import { Box, Scroll } from 'folds';
import * as css from './style.css';

export function ClientDrawerContentLayout({ children }: { children: ReactNode }) {
  return (
    <Box grow="Yes" direction="Column">
      <Scroll variant="Background" direction="Vertical" size="300" hideTrack visibility="Hover">
        <Box className={css.ClientDrawerContentLayout} direction="Column">
          {children}
        </Box>
      </Scroll>
    </Box>
  );
}
