import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { Box, as } from 'folds';
import * as css from './layout.css';

export const BubbleLayout = as<
  'div',
  {
    collapse?: boolean;
    reverse?: boolean;
    avatar?: ReactNode;
    header?: ReactNode;
  }
>(({ className, collapse, reverse, avatar, header, children, ...props }, ref) => (
  <Box
    className={classNames(css.Bubble({ collapse }), className)}
    alignItems="Start"
    direction={reverse ? 'RowReverse' : 'Row'}
    gap="300"
    {...props}
    ref={ref}
  >
    <Box className={css.BubbleAvatar} shrink="No">
      {avatar}
    </Box>
    <Box className={css.BubbleContent} direction="Column">
      {header && (
        <Box alignItems="Baseline" justifyContent="SpaceBetween" gap="200">
          {header}
        </Box>
      )}
      <Box>{children}</Box>
    </Box>
  </Box>
));
