/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, { ComponentProps } from 'react';
import { Text, as } from 'folds';
import classNames from 'classnames';
import * as css from './styles.css';

export const NavItemContent = as<'p', ComponentProps<typeof Text>>(
  ({ className, ...props }, ref) => (
    <Text className={classNames(css.NavItemContent, className)} size="T300" {...props} ref={ref} />
  )
);
