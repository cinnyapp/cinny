import React, { ReactNode, useMemo } from 'react';
import { makeClosedNavCategoriesAtom } from '../../state/closedNavCategories';
import { ClosedNavCategoriesProvider } from '../../state/hooks/closedNavCategories';
import { makeClosedLobbyCategoriesAtom } from '../../state/closedLobbyCategories';
import { ClosedLobbyCategoriesProvider } from '../../state/hooks/closedLobbyCategories';
import { makeNavToActivePathAtom } from '../../state/navToActivePath';
import { NavToActivePathProvider } from '../../state/hooks/navToActivePath';
import { makeOpenedSidebarFolderAtom } from '../../state/openedSidebarFolder';
import { OpenedSidebarFolderProvider } from '../../state/hooks/openedSidebarFolder';
import { makeCallPreferencesAtom } from '../../state/callPreferences';
import { CallPreferencesProvider } from '../../state/hooks/callPreferences';
import { makeSettingsAtom } from '../../state/settings';
import { SettingsAtomProvider } from '../../state/hooks/settings';
import { useSession } from '../../hooks/useSessions';

type ClientInitStorageAtomProps = {
  children: ReactNode;
};
export function ClientInitStorageAtom({ children }: ClientInitStorageAtomProps) {
  const { userId } = useSession();

  const closedNavCategoriesAtom = useMemo(() => makeClosedNavCategoriesAtom(userId), [userId]);

  const closedLobbyCategoriesAtom = useMemo(() => makeClosedLobbyCategoriesAtom(userId), [userId]);

  const navToActivePathAtom = useMemo(() => makeNavToActivePathAtom(userId), [userId]);

  const openedSidebarFolderAtom = useMemo(() => makeOpenedSidebarFolderAtom(userId), [userId]);

  const callPreferencesAtom = useMemo(() => makeCallPreferencesAtom(userId), [userId]);

  const settingsAtom = useMemo(() => makeSettingsAtom(userId), [userId]);

  return (
    <ClosedNavCategoriesProvider value={closedNavCategoriesAtom}>
      <ClosedLobbyCategoriesProvider value={closedLobbyCategoriesAtom}>
        <NavToActivePathProvider value={navToActivePathAtom}>
          <OpenedSidebarFolderProvider value={openedSidebarFolderAtom}>
            <CallPreferencesProvider value={callPreferencesAtom}>
              <SettingsAtomProvider value={settingsAtom}>{children}</SettingsAtomProvider>
            </CallPreferencesProvider>
          </OpenedSidebarFolderProvider>
        </NavToActivePathProvider>
      </ClosedLobbyCategoriesProvider>
    </ClosedNavCategoriesProvider>
  );
}
