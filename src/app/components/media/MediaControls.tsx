import React, { ReactNode } from 'react';
import { Box, as } from 'folds';

export type MediaControlProps = {
  before?: ReactNode;
  after?: ReactNode;
  leftControl?: ReactNode;
  rightControl?: ReactNode;
};
export const MediaControl = as<'div', MediaControlProps>(
  ({ before, after, leftControl, rightControl, children, ...props }, ref) => (
    <Box grow="Yes" direction="Column" gap="300" {...props} ref={ref}>
      {before && <Box direction="Column">{before}</Box>}
      <Box alignItems="Center" gap="200">
        <Box alignItems="Center" grow="Yes" gap="Inherit">
          {leftControl}
        </Box>

        <Box justifyItems="End" alignItems="Center" gap="Inherit">
          {rightControl}
        </Box>
      </Box>
      {after && <Box direction="Column">{after}</Box>}
      {children}
    </Box>
  )
);
