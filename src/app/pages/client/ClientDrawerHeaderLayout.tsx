import React, { ReactNode } from 'react';
import { Header } from 'folds';
import * as css from './style.css';

type ClientDrawerHeaderLayoutProps = {
  children: ReactNode;
};
export function ClientDrawerHeaderLayout({ children }: ClientDrawerHeaderLayoutProps) {
  return (
    <Header className={css.ClientDrawerHeaderLayout} variant="Background" size="600">
      {children}
    </Header>
  );
}
