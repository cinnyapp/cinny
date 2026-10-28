import React, { ReactNode } from 'react';
import { Box, Text, config } from 'folds';

type EmptyStateProps = {
  children: ReactNode;
};
export function EmptyState({ children }: EmptyStateProps) {
  return (
    <Box justifyContent="Center" style={{ padding: config.space.S700 }}>
      <Text size="T300" priority="300" align="Center">
        {children}
      </Text>
    </Box>
  );
}
