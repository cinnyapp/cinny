import React from 'react';
import { Box, Text, as } from 'folds';
import classNames from 'classnames';
import * as css from './style.css';

export const RoomCard = as<'div'>(({ className, ...props }, ref) => (
  <Box
    direction="Column"
    gap="300"
    className={classNames(css.RoomCard, className)}
    {...props}
    ref={ref}
  />
));

export const RoomCardName = as<'h6'>(({ ...props }, ref) => (
  <Text as="h6" size="H6" truncate {...props} ref={ref} />
));

export const RoomCardTopic = as<'p'>(({ className, ...props }, ref) => (
  <Text
    as="p"
    size="T200"
    truncate
    className={classNames(css.RoomCardTopic, className)}
    {...props}
    ref={ref}
  />
));
