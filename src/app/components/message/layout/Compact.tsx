import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { Box, as } from 'folds';
import * as css from './layout.css';

export const CompactLayout = as<
  'div',
  {
    collapse?: boolean;
    header?: ReactNode;
  }
>(({ className, collapse, header, children, ...props }, ref) => (
  <Box
    className={classNames(css.Compact({ collapse }), className)}
    alignItems="Start"
    gap="200"
    {...props}
    ref={ref}
  >
    <Box
      className={css.CompactHeader}
      gap="200"
      shrink="No"
      justifyContent="SpaceBetween"
      alignItems="Baseline"
    >
      {header}
    </Box>
    {children}
  </Box>
));
