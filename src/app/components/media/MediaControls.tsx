import React, { ReactNode } from 'react';
import { Box, as } from 'folds';

export type MediaControlProps = {
  top?: ReactNode;
  leftControl?: ReactNode;
  rightControl?: ReactNode;
};
export const MediaControl = as<'div', MediaControlProps>(
  ({ top, leftControl, rightControl, children, ...props }, ref) => (
    <Box grow="Yes" direction="Column" gap="300" {...props} ref={ref}>
      <Box alignItems="Center" gap="200">
        <Box grow="Yes" direction="Column">
          {top}
        </Box>
      </Box>
      <Box alignItems="Center" gap="200">
        <Box alignItems="Center" grow="Yes" gap="Inherit">
          {leftControl}
        </Box>

        <Box justifyItems="End" alignItems="Center" gap="Inherit">
          {rightControl}
        </Box>
      </Box>
      {children}
    </Box>
  )
);
