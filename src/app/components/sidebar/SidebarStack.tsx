import React from 'react';
import classNames from 'classnames';
import { as } from 'folds';
import * as css from './Sidebar.css';

export const SidebarStack = as<'div'>(
  ({ as: AsSidebarStack = 'div', className, ...props }, ref) => (
    <AsSidebarStack className={classNames(css.SidebarStack, className)} {...props} ref={ref} />
  )
);
