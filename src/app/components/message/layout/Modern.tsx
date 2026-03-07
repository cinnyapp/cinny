import React, { ReactNode } from 'react';
import { Box, as } from 'folds';
import * as css from './layout.css';

type ModernLayoutProps = {
  before?: ReactNode;
  context?: ReactNode;
};

export const ModernLayout = as<'div', ModernLayoutProps>(
  ({ before, context, children, ...props }, ref) => (
    <Box direction="Column" {...props} ref={ref}>
      {!!context && (
        <Box gap="300">
          <Box className={css.ModernBefore} shrink="No" />
          {context}
        </Box>
      )}
      <Box gap="300">
        <Box className={css.ModernBefore} shrink="No">
          {before}
        </Box>
        <Box grow="Yes" direction="Column">
          {children}
        </Box>
      </Box>
    </Box>
  )
);
