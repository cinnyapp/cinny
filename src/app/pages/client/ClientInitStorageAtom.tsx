import React, { ReactNode, useMemo } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { makeClosedNavCategoriesAtom } from '../../state/closedNavCategories';
import { ClosedNavCategoriesProvider } from '../../state/hooks/closedNavCategories';

type ClientInitStorageAtomProps = {
  children: ReactNode;
};
export function ClientInitStorageAtom({ children }: ClientInitStorageAtomProps) {
  const mx = useMatrixClient();
  const userId = mx.getUserId()!;

  const closedNavCategoriesAtom = useMemo(() => {
    return makeClosedNavCategoriesAtom(userId);
  }, [userId]);

  return (
    <ClosedNavCategoriesProvider value={closedNavCategoriesAtom}>
      {children}
    </ClosedNavCategoriesProvider>
  );
}
