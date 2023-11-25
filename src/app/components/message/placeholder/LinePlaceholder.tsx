import React from 'react';
import { Box, as } from 'folds';
import classNames from 'classnames';
import * as css from './LinePlaceholder.css';

export const LinePlaceholder = as<'div'>(({ className, ...props }, ref) => (
  <Box className={classNames(css.LinePlaceholder, className)} shrink="No" {...props} ref={ref} />
));
