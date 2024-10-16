import React, { ReactNode } from 'react';
import { Box, Text } from 'folds';

type SettingTileProps = {
  title: ReactNode;
  description?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  children?: ReactNode;
};
export function SettingTile({ title, description, before, after, children }: SettingTileProps) {
  return (
    <Box alignItems="Center" gap="300">
      {before && <Box shrink="No">{before}</Box>}
      <Box grow="Yes" direction="Column" gap="100">
        <Text size="T300">{title}</Text>
        {description && (
          <Text size="T200" priority="300">
            {description}
          </Text>
        )}
        {children}
      </Box>
      {after && <Box shrink="No">{after}</Box>}
    </Box>
  );
}
