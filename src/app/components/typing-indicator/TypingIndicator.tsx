import React from 'react';
import { Box, as, toRem } from 'folds';
import * as css from './TypingIndicator.css';

export type TypingIndicatorProps = {
  size?: '300' | '400';
};

export const TypingIndicator = as<'div', TypingIndicatorProps>(({ size, style, ...props }, ref) => (
  <Box
    as="span"
    alignItems="Center"
    shrink="No"
    style={{ gap: toRem(size === '300' ? 1 : 2), ...style }}
    {...props}
    ref={ref}
  >
    <span className={css.TypingDot({ size, index: '0' })} />
    <span className={css.TypingDot({ size, index: '1' })} />
    <span className={css.TypingDot({ size, index: '2' })} />
  </Box>
));
