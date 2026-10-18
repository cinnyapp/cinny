import React, { ReactNode } from 'react';
import { Box, Text } from 'folds';
import { BreakWord } from '../../styles/Text.css';
import { useSettingHighlight } from '../../features/settings/search/SettingsHighlight';
import { TileHighlight } from '../../features/settings/search/SettingsSearch.css';

type SettingTileProps = {
  title?: ReactNode;
  description?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  children?: ReactNode;
};
export function SettingTile({ title, description, before, after, children }: SettingTileProps) {
  // When the Settings search jumps to this setting, scroll to it and flash it.
  const { ref, highlighted } = useSettingHighlight(title);

  return (
    <Box
      ref={ref}
      className={highlighted ? TileHighlight : undefined}
      alignItems="Center"
      gap="300"
    >
      {before && <Box shrink="No">{before}</Box>}
      <Box grow="Yes" direction="Column" gap="100">
        {title && (
          <Text className={BreakWord} size="T300">
            {title}
          </Text>
        )}
        {description && (
          <Text className={BreakWord} size="T200" priority="300">
            {description}
          </Text>
        )}
        {children}
      </Box>
      {after && <Box shrink="No">{after}</Box>}
    </Box>
  );
}
