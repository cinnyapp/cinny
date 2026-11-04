// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React from 'react';
import { Box, Icon, Icons, color, Text } from 'folds';

export function FieldError({ message }: { message: string }) {
  return (
    <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="100">
      <Icon size="50" filled src={Icons.Warning} />
      <Text size="T200">
        <b>{message}</b>
      </Text>
    </Box>
  );
}
