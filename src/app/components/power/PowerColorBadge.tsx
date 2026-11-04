/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React from 'react';
import { as } from 'folds';
import classNames from 'classnames';
import * as css from './style.css';

type PowerColorBadgeProps = {
  color?: string;
};
export const PowerColorBadge = as<'span', PowerColorBadgeProps>(
  ({ as: AsPowerColorBadge = 'span', color, className, style, ...props }, ref) => (
    <AsPowerColorBadge
      className={classNames(css.PowerColorBadge, { [css.PowerColorBadgeNone]: !color }, className)}
      style={{
        backgroundColor: color,
        ...style,
      }}
      {...props}
      ref={ref}
    />
  )
);
