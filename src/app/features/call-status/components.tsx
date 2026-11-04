// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React from 'react';
import { Line } from 'folds';
import * as css from './styles.css';

export function StatusDivider() {
  return (
    <Line variant="Background" size="300" direction="Vertical" className={css.ControlDivider} />
  );
}
