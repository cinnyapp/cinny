import React, { ComponentProps } from 'react';
import { Box, as } from 'folds';
import classNames from 'classnames';
import { ContainerColor, ContainerColorVariants } from '../../styles/ContainerColor.css';
import * as css from './style.css';

export const SequenceCard = as<
  'div',
  ComponentProps<typeof Box> & ContainerColorVariants & css.SequenceCardVariants
>(({ className, variant, outlined, ...props }, ref) => (
  <Box
    className={classNames(css.SequenceCard({ outlined }), ContainerColor({ variant }), className)}
    {...props}
    ref={ref}
  />
));
