import React, { ReactNode } from 'react';
import { Box, as } from 'folds';
import * as css from './layout.css';

type ModernLayoutProps = {
  avatar?: ReactNode;
  header?: ReactNode;
  content: ReactNode;
};

export const ModernLayout = as<'div', ModernLayoutProps>(
  ({ avatar, header, content, ...props }, ref) => (
    <Box alignItems="Start" gap="300" {...props} ref={ref}>
      <Box className={css.ModernAvatar} shrink="No">
        {avatar}
      </Box>
      <Box grow="Yes" direction="Column">
        {header}
        {content}
      </Box>
    </Box>
  )
);
