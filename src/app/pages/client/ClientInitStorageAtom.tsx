import React, { ReactNode, useMemo } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { makeClosedNavCategoriesAtom } from '../../state/closedNavCategories';
import { ClosedNavCategoriesProvider } from '../../state/hooks/closedNavCategories';
import { makeClosedLobbyCategoriesAtom } from '../../state/closedLobbyCategories';
import { ClosedLobbyCategoriesProvider } from '../../state/hooks/closedLobbyCategories';

type ClientInitStorageAtomProps = {
  children: ReactNode;
};
export function ClientInitStorageAtom({ children }: ClientInitStorageAtomProps) {
  const mx = useMatrixClient();
  const userId = mx.getUserId()!;

  const closedNavCategoriesAtom = useMemo(() => {
    return makeClosedNavCategoriesAtom(userId);
  }, [userId]);

  const closedLobbyCategoriesAtom = useMemo(() => {
    return makeClosedLobbyCategoriesAtom(userId);
  }, [userId]);

  return (
    <ClosedNavCategoriesProvider value={closedNavCategoriesAtom}>
      <ClosedLobbyCategoriesProvider value={closedLobbyCategoriesAtom}>
        {children}
      </ClosedLobbyCategoriesProvider>
    </ClosedNavCategoriesProvider>
  );
}
