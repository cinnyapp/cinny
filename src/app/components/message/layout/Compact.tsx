import React, { ReactNode } from 'react';
import { Box, as } from 'folds';
import * as css from './layout.css';

type CompactLayoutProps = {
  header?: ReactNode;
  content: ReactNode;
};

export const CompactLayout = as<'div', CompactLayoutProps>(({ header, content, ...props }, ref) => (
  <Box alignItems="Start" gap="200" {...props} ref={ref}>
    <Box
      className={css.CompactHeader}
      gap="200"
      shrink="No"
      justifyContent="SpaceBetween"
      alignItems="Baseline"
    >
      {header}
    </Box>
    {content}
  </Box>
));
