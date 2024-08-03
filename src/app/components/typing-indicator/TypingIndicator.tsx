import React from 'react';
import { Box, as, toRem } from 'folds';
import * as css from './TypingIndicator.css';

export type TypingIndicatorProps = {
  size?: '300' | '400';
  disableAnimation?: boolean;
};

export const TypingIndicator = as<'div', TypingIndicatorProps>(
  ({ size, disableAnimation, style, ...props }, ref) => (
    <Box
      as="span"
      alignItems="Center"
      shrink="No"
      style={{ gap: toRem(size === '300' ? 1 : 2), ...style }}
      {...props}
      ref={ref}
    >
      <span className={css.TypingDot({ size, index: '0', animated: !disableAnimation })} />
      <span className={css.TypingDot({ size, index: '1', animated: !disableAnimation })} />
      <span className={css.TypingDot({ size, index: '2', animated: !disableAnimation })} />
    </Box>
  )
);
