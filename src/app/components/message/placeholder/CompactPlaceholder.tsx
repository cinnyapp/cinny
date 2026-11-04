// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React, { useMemo } from 'react';
import { as, ContainerColor, toRem } from 'folds';
import { randomNumberBetween } from '../../../utils/common';
import { LinePlaceholder } from './LinePlaceholder';
import { CompactLayout } from '../layout';

export const CompactPlaceholder = as<'div', { variant?: ContainerColor }>(
  ({ variant, ...props }, ref) => {
    const nameSize = useMemo(() => randomNumberBetween(40, 100), []);
    const msgSize = useMemo(() => randomNumberBetween(120, 500), []);

    return (
      <CompactLayout
        {...props}
        ref={ref}
        before={
          <>
            <LinePlaceholder variant={variant} style={{ maxWidth: toRem(50) }} />
            <LinePlaceholder variant={variant} style={{ maxWidth: toRem(nameSize) }} />
          </>
        }
      >
        <LinePlaceholder variant={variant} style={{ maxWidth: toRem(msgSize) }} />
      </CompactLayout>
    );
  }
);
