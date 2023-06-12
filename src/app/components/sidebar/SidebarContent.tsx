import React, { ReactNode } from 'react';
import { Box, Scroll } from 'folds';

type SidebarContentProps = {
  scrollable: ReactNode;
  sticky: ReactNode;
};
export function SidebarContent({ scrollable, sticky }: SidebarContentProps) {
  return (
    <>
      <Box direction="Column" grow="Yes">
        <Scroll variant="Background" size="0">
          {scrollable}
        </Scroll>
      </Box>
      <Box direction="Column" shrink="No">
        {sticky}
      </Box>
    </>
  );
}
