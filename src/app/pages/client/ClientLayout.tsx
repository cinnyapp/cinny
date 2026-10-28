import React, { ReactNode } from 'react';
import { Box } from 'folds';
import { Toaster } from '../../components/toast';
import { WordSwapEffect } from '../../features/word-swap/WordSwapEffect';

type ClientLayoutProps = {
  nav: ReactNode;
  children: ReactNode;
};
export function ClientLayout({ nav, children }: ClientLayoutProps) {
  return (
    <Box grow="Yes">
      <Box shrink="No">{nav}</Box>
      <Box grow="Yes">{children}</Box>
      <Toaster />
      <WordSwapEffect />
    </Box>
  );
}
