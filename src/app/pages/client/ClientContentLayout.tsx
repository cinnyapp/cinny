import { Box, Line } from 'folds';
import React, { ReactNode } from 'react';

type ClientContentLayoutProps = {
  navigation: ReactNode;
  children: ReactNode;
};

export function ClientContentLayout({ navigation, children }: ClientContentLayoutProps) {
  return (
    <Box grow="Yes">
      {navigation}
      <Line variant="Surface" size="300" direction="Vertical" />
      {children}
    </Box>
  );
}
