import React, { ReactNode } from 'react';
import * as css from './styles.css';

type NavCategoryProps = {
  children: ReactNode;
};
export function NavCategory({ children }: NavCategoryProps) {
  return <div className={css.NavCategory}>{children}</div>;
}
