import classNames from 'classnames';
import React from 'react';
import { as } from 'folds';
import * as css from './styles.css';

export const NavItem = as<
  'div',
  {
    highlight?: boolean;
  } & css.RoomSelectorVariants
>(({ as: AsNavItem = 'div', className, highlight, variant, radii, children, ...props }, ref) => (
  <AsNavItem
    className={classNames(css.NavItem({ variant, radii }), className)}
    data-highlight={highlight}
    {...props}
    ref={ref}
  >
    {children}
  </AsNavItem>
));
