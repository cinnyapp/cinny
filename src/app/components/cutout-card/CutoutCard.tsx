/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { as, ContainerColor as TContainerColor } from 'folds';
import React from 'react';
import classNames from 'classnames';
import { ContainerColor } from '../../styles/ContainerColor.css';
import * as css from './CutoutCard.css';

export const CutoutCard = as<'div', { variant?: TContainerColor }>(
  ({ as: AsCutoutCard = 'div', className, variant = 'Surface', ...props }, ref) => (
    <AsCutoutCard
      className={classNames(ContainerColor({ variant }), css.CutoutCard, className)}
      {...props}
      ref={ref}
    />
  )
);
