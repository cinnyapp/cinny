import React from 'react';
import { Box, as } from 'folds';
import classNames from 'classnames';
import * as css from './MessagePlaceholder.css';

export const MessagePlaceholderLine = as<'div'>(({ className, ...props }, ref) => (
  <Box
    className={classNames(css.MessagePlaceholderLine, className)}
    shrink="No"
    {...props}
    ref={ref}
  />
));
