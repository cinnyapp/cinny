import React, { ReactNode } from 'react';
import { Box, as } from 'folds';
import * as css from './layout.css';

type CompactLayoutProps = {
  before?: ReactNode;
  context?: ReactNode;
};

export const CompactLayout = as<'div', CompactLayoutProps>(
  ({ before, context, children, ...props }, ref) => (
    <Box direction="Column" {...props} ref={ref}>
      <Box gap="200">
        <Box className={css.CompactHeader} shrink="No" />
        {context}
      </Box>
      <Box gap="200">
        <Box className={css.CompactHeader} gap="200" shrink="No">
          {before}
        </Box>
        {children}
      </Box>
    </Box>
  )
);
