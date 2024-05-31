import classNames from 'classnames';
import React, { ComponentProps, forwardRef } from 'react';
import { Link } from 'react-router-dom';
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

export const NavLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(
  ({ className, ...props }, ref) => (
    <Link className={classNames(css.NavLink, className)} {...props} ref={ref} />
  )
);

export const NavButton = as<'button'>(
  ({ as: AsNavButton = 'button', className, ...props }, ref) => (
    <AsNavButton className={classNames(css.NavLink, className)} {...props} ref={ref} />
  )
);
