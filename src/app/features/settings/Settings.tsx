import React, { useMemo, useState } from 'react';
import { Box, config, Icon, IconButton, Icons, IconSrc, MenuItem, Text } from 'folds';
import { General } from './General';
import { PageNav, PageNavContent, PageNavHeader, PageRoot } from '../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';

enum SettingsPages {
  GeneralPage,
  AccountPage,
  NotificationPage,
  SessionPage,
  EncryptionPage,
  EmojisStickersPage,
  DeveloperToolsPage,
  AboutPage,
}

type SettingsMenuItem = {
  page: SettingsPages;
  name: string;
  icon: IconSrc;
};

const useSettingsMenuItems = (): SettingsMenuItem[] =>
  useMemo(
    () => [
      {
        page: SettingsPages.GeneralPage,
        name: 'General',
        icon: Icons.Setting,
      },
      {
        page: SettingsPages.AccountPage,
        name: 'Account',
        icon: Icons.User,
      },
      {
        page: SettingsPages.NotificationPage,
        name: 'Notifications',
        icon: Icons.Bell,
      },
      {
        page: SettingsPages.SessionPage,
        name: 'Sessions',
        icon: Icons.Category,
      },
      {
        page: SettingsPages.EncryptionPage,
        name: 'Encryption',
        icon: Icons.ShieldLock,
      },
      {
        page: SettingsPages.EmojisStickersPage,
        name: 'Emojis & Stickers',
        icon: Icons.Smile,
      },
      {
        page: SettingsPages.DeveloperToolsPage,
        name: 'Developer Tools',
        icon: Icons.Terminal,
      },
      {
        page: SettingsPages.AboutPage,
        name: 'About',
        icon: Icons.Info,
      },
    ],
    []
  );

type SettingsProps = {
  requestClose: () => void;
};
export function Settings({ requestClose }: SettingsProps) {
  const screenSize = useScreenSizeContext();
  const [activePage, setActivePage] = useState<SettingsPages | undefined>(
    screenSize === ScreenSize.Mobile ? undefined : SettingsPages.GeneralPage
  );
  const menuItems = useSettingsMenuItems();

  const handlePageRequestClose = () => {
    if (screenSize === ScreenSize.Mobile) {
      setActivePage(undefined);
      return;
    }
    requestClose();
  };

  return (
    <PageRoot
      nav={
        screenSize === ScreenSize.Mobile && activePage !== undefined ? undefined : (
          <PageNav size="300">
            <PageNavHeader outlined={false}>
              <Box grow="Yes">
                <Text size="H4">Settings</Text>
              </Box>
              <Box shrink="No">
                {screenSize === ScreenSize.Mobile && (
                  <IconButton onClick={requestClose} variant="Background">
                    <Icon src={Icons.Cross} />
                  </IconButton>
                )}
              </Box>
            </PageNavHeader>
            <PageNavContent>
              <div>
                {menuItems.map((item) => (
                  <MenuItem
                    variant="Background"
                    radii="400"
                    aria-pressed={activePage === item.page}
                    before={<Icon src={item.icon} size="100" filled={activePage === item.page} />}
                    onClick={() => setActivePage(item.page)}
                  >
                    <Text
                      style={{
                        fontWeight: activePage === item.page ? config.fontWeight.W600 : undefined,
                      }}
                      size="T300"
                      truncate
                    >
                      {item.name}
                    </Text>
                  </MenuItem>
                ))}
              </div>
            </PageNavContent>
          </PageNav>
        )
      }
    >
      {activePage === SettingsPages.GeneralPage && (
        <General requestClose={handlePageRequestClose} />
      )}
    </PageRoot>
  );
}
