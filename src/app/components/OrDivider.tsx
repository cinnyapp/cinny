// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React from 'react';
import { Box, Line, Text } from 'folds';

export function OrDivider() {
  return (
    <Box gap="400" alignItems="Center">
      <Line style={{ flexGrow: 1 }} direction="Horizontal" size="300" variant="Surface" />
      <Text>OR</Text>
      <Line style={{ flexGrow: 1 }} direction="Horizontal" size="300" variant="Surface" />
    </Box>
  );
}
