/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, { ReactNode } from 'react';
import { Box, Text } from 'folds';
import { BreakWord } from '../../styles/Text.css';

type SettingTileProps = {
  title?: ReactNode;
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
