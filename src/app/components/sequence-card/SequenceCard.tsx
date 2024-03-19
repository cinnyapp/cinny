import React, { ComponentProps } from 'react';
import { Box, as } from 'folds';
import classNames from 'classnames';
import { ContainerColor } from '../../styles/ContainerColor.css';
import * as css from './style.css';

export const SequenceCard = as<'div', ComponentProps<typeof Box>>(
  ({ className, ...props }, ref) => (
    <Box
      className={classNames(
        css.SequenceCard,
        ContainerColor({ variant: 'SurfaceVariant' }),
        className
      )}
      {...props}
      ref={ref}
    />
  )
);
