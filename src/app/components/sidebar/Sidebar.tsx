// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import classNames from 'classnames';
import { as } from 'folds';
import React from 'react';
import * as css from './Sidebar.css';

export const Sidebar = as<'div'>(({ as: AsSidebar = 'div', className, ...props }, ref) => (
  <AsSidebar className={classNames(css.Sidebar, className)} {...props} ref={ref} />
));
