import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { Box, as } from 'folds';
import * as css from './layout.css';

export const CompactLayout = as<
  'div',
  {
    header?: ReactNode;
  } & css.BaseMessageVariants
>(({ className, space, collapse, header, children, ...props }, ref) => (
  <Box
    className={classNames(css.BaseMessage({ collapse, space }), className)}
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
