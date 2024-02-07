import React, { ReactNode } from 'react';
import { Header } from 'folds';
import * as css from './styles.css';

export type NavCategoryHeaderProps = {
  children: ReactNode;
};
export function NavCategoryHeader({ children }: NavCategoryHeaderProps) {
  return (
    <Header className={css.NavCategoryHeader} variant="Background" size="300">
      {children}
    </Header>
  );
}
