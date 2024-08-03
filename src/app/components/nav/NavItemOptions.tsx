import React, { ComponentProps } from 'react';
import { Box, as } from 'folds';
import classNames from 'classnames';
import * as css from './styles.css';

export const NavItemOptions = as<'div', ComponentProps<typeof Box>>(
  ({ className, ...props }, ref) => (
    <Box
      className={classNames(css.NavItemOptions, className)}
      alignItems="Center"
      shrink="No"
      gap="0"
      {...props}
      ref={ref}
    />
  )
);
