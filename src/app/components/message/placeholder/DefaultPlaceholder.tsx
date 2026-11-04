// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React, { CSSProperties, useMemo } from 'react';
import { Avatar, Box, ContainerColor, as, color, toRem } from 'folds';
import { randomNumberBetween } from '../../../utils/common';
import { LinePlaceholder } from './LinePlaceholder';
import { ModernLayout } from '../layout';

const contentMargin: CSSProperties = { marginTop: toRem(3) };

export const DefaultPlaceholder = as<'div', { variant?: ContainerColor }>(
  ({ variant, ...props }, ref) => {
    const nameSize = useMemo(() => randomNumberBetween(40, 100), []);
    const msgSize = useMemo(() => randomNumberBetween(80, 200), []);
    const msg2Size = useMemo(() => randomNumberBetween(80, 200), []);

    return (
      <ModernLayout
        {...props}
        ref={ref}
        before={
          <Avatar
            style={{ backgroundColor: color[variant ?? 'SurfaceVariant'].Container }}
            size="300"
          />
        }
      >
        <Box style={contentMargin} grow="Yes" direction="Column" gap="200">
          <Box grow="Yes" gap="200" alignItems="Center" justifyContent="SpaceBetween">
            <LinePlaceholder variant={variant} style={{ maxWidth: toRem(nameSize) }} />
            <LinePlaceholder variant={variant} style={{ maxWidth: toRem(50) }} />
          </Box>
          <Box grow="Yes" gap="200" wrap="Wrap">
            <LinePlaceholder variant={variant} style={{ maxWidth: toRem(msgSize) }} />
            <LinePlaceholder variant={variant} style={{ maxWidth: toRem(msg2Size) }} />
          </Box>
        </Box>
      </ModernLayout>
    );
  }
);
