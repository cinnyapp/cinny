import { Box } from 'folds';
import React, { ReactNode } from 'react';
import * as css from './style.css';

type ClientDrawerLayoutProps = {
  children: ReactNode;
};
export function ClientDrawerLayout({ children }: ClientDrawerLayoutProps) {
  // TODO: make it mobile friendly

  return (
    <Box className={css.ClientDrawerLayout}>
      <Box grow="Yes" direction="Column">
        {children}
      </Box>
    </Box>
  );
}
