/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React from 'react';
import { Box, as } from 'folds';
import classNames from 'classnames';
import * as css from './LinePlaceholder.css';

export const LinePlaceholder = as<'div', css.LinePlaceholderVariants>(
  ({ className, variant, ...props }, ref) => (
    <Box
      className={classNames(css.LinePlaceholder({ variant }), className)}
      shrink="No"
      {...props}
      ref={ref}
    />
  )
);
