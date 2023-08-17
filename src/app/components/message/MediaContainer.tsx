import React from 'react';
import { Box, as } from 'folds';
import classNames from 'classnames';
import * as css from './MediaContianer.css';

export const MediaContainer = as<'div'>(({ className, ...props }, ref) => (
  <Box
    direction="Column"
    className={classNames(css.MediaContainer(), className)}
    {...props}
    ref={ref}
  />
));
