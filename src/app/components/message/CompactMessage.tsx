import React from 'react';
import classNames from 'classnames';
import { Box, as } from 'folds';
import * as css from './CompactMessage.css';

export const CompactMessage = as<'div'>(({ className, children, ...props }, ref) => (
  <Box
    className={classNames(css.CompactMessage, className)}
    alignItems="Start"
    gap="200"
    {...props}
    ref={ref}
  >
    {children}
  </Box>
));
