import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { Box, as } from 'folds';
import * as css from './layout.css';

export const DefaultLayout = as<
  'div',
  {
    avatar?: ReactNode;
    header?: ReactNode;
  } & css.BaseMessageVariants
>(({ className, space, collapse, highlight, avatar, header, children, ...props }, ref) => (
  <Box
    className={classNames(css.BaseMessage({ collapse, space, highlight }), className)}
    alignItems="Start"
    gap="300"
    {...props}
    ref={ref}
  >
    <Box className={css.DefaultAvatar} shrink="No">
      {avatar}
    </Box>
    <Box grow="Yes" direction="Column">
      {header && (
        <Box alignItems="Baseline" justifyContent="SpaceBetween" gap="200">
          {header}
        </Box>
      )}
      <Box>{children}</Box>
    </Box>
  </Box>
));
