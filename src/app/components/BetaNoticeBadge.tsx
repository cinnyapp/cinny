// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React from 'react';
import { TooltipProvider, Tooltip, Box, Text, Badge, toRem } from 'folds';

export function BetaNoticeBadge() {
  return (
    <TooltipProvider
      position="Right"
      align="Center"
      tooltip={
        <Tooltip style={{ maxWidth: toRem(200) }}>
          <Box direction="Column">
            <Text size="L400">Notice</Text>
            <Text size="T200">This feature is under testing and may change over time.</Text>
          </Box>
        </Tooltip>
      }
    >
      {(triggerRef) => (
        <Badge size="500" tabIndex={0} ref={triggerRef} variant="Primary" fill="Solid">
          <Text size="L400">Beta</Text>
        </Badge>
      )}
    </TooltipProvider>
  );
}
