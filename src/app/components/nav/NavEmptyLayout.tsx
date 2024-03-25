import { Box, config } from 'folds';
import React, { ReactNode } from 'react';

export function NavEmptyCenter({ children }: { children: ReactNode }) {
  return (
    <Box
      style={{
        padding: config.space.S500,
      }}
      grow="Yes"
      direction="Column"
      justifyContent="Center"
    >
      {children}
    </Box>
  );
}

type NavEmptyLayoutProps = {
  icon?: ReactNode;
  title?: ReactNode;
  content?: ReactNode;
  options?: ReactNode;
};
export function NavEmptyLayout({ icon, title, content, options }: NavEmptyLayoutProps) {
  return (
    <Box direction="Column" gap="400">
      <Box direction="Column" alignItems="Center" gap="200">
        {icon}
      </Box>
      <Box direction="Column" gap="100" alignItems="Center">
        {title}
        {content}
      </Box>
      <Box direction="Column" gap="200">
        {options}
      </Box>
    </Box>
  );
}
