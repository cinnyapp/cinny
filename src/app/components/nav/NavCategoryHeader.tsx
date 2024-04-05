import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { Header, as } from 'folds';
import * as css from './styles.css';

export type NavCategoryHeaderProps = {
  children: ReactNode;
};
export const NavCategoryHeader = as<'div', NavCategoryHeaderProps>(
  ({ className, ...props }, ref) => (
    <Header
      className={classNames(css.NavCategoryHeader, className)}
      variant="Background"
      size="300"
      {...props}
      ref={ref}
    />
  )
);
