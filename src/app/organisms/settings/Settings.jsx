import React, { useState, useEffect } from 'react';
import './Settings.scss';

import { useTranslation } from 'react-i18next';
import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import settings from '../../../client/state/settings';
import navigation from '../../../client/state/navigation';
import {
  toggleSystemTheme, toggleMarkdown, toggleMembershipEvents, toggleNickAvatarEvents,
  toggleNotifications, toggleNotificationSounds,
} from '../../../client/action/settings';
import logout from '../../../client/action/logout';
import { usePermission } from '../../hooks/usePermission';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import Toggle from '../../atoms/button/Toggle';
import Tabs from '../../atoms/tabs/Tabs';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import SegmentedControls from '../../atoms/segmented-controls/SegmentedControls';

import PopupWindow from '../../molecules/popup-window/PopupWindow';
import SettingTile from '../../molecules/setting-tile/SettingTile';
import ImportE2ERoomKeys from '../../molecules/import-export-e2e-room-keys/ImportE2ERoomKeys';
import ExportE2ERoomKeys from '../../molecules/import-export-e2e-room-keys/ExportE2ERoomKeys';
import { ImagePackUser, ImagePackGlobal } from '../../molecules/image-pack/ImagePack';

import ProfileEditor from '../profile-editor/ProfileEditor';
import CrossSigning from './CrossSigning';
import KeyBackup from './KeyBackup';
import DeviceManage from './DeviceManage';

import SunIC from '../../../../public/res/ic/outlined/sun.svg';
import EmojiIC from '../../../../public/res/ic/outlined/emoji.svg';
import LockIC from '../../../../public/res/ic/outlined/lock.svg';
import BellIC from '../../../../public/res/ic/outlined/bell.svg';
import InfoIC from '../../../../public/res/ic/outlined/info.svg';
import PowerIC from '../../../../public/res/ic/outlined/power.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import CinnySVG from '../../../../public/res/svg/cinny.svg';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';

import '../../i18n';

function AppearanceSection() {
  const [, updateState] = useState({});

  const { t } = useTranslation();

  return (
    <div className="settings-appearance">
      <div className="settings-appearance__card">
        <MenuHeader>Theme</MenuHeader>
        <SettingTile
          title={t('Organisms.Settings.theme.follow_system.title')}
          options={(
            <Toggle
              isActive={settings.useSystemTheme}
              onToggle={() => { toggleSystemTheme(); updateState({}); }}
            />
          )}
          content={<Text variant="b3">{t('Organisms.Settings.theme.follow_system.description')}</Text>}
        />
        <SettingTile
          title={t('Organisms.Settings.theme.title')}
          content={(
            <SegmentedControls
              selected={settings.useSystemTheme ? -1 : settings.getThemeIndex()}
              segments={[
                  { text: t('Organisms.Settings.theme.theme_light') },
                  { text: t('Organisms.Settings.theme.theme_silver') },
                  { text: t('Organisms.Settings.theme.theme_dark') },
                  { text: t('Organisms.Settings.theme.theme_butter') },
              ]}
              onSelect={(index) => {
                if (settings.useSystemTheme) toggleSystemTheme();
                settings.setTheme(index);
                updateState({});
              }}
            />
        )}
        />
      </div>
      <div className="settings-appearance__card">
        <MenuHeader>Room messages</MenuHeader>
        <SettingTile
          title={t('Organisms.Settings.markdown.title')}
          options={(
            <Toggle
              isActive={settings.isMarkdown}
              onToggle={() => { toggleMarkdown(); updateState({}); }}
            />
          )}
          content={<Text variant="b3">{t('Organisms.Settings.markdown.description')}</Text>}
        />
        <SettingTile
          title={t('Organisms.Settings.hide_membership_events.title')}
          options={(
            <Toggle
              isActive={settings.hideMembershipEvents}
              onToggle={() => { toggleMembershipEvents(); updateState({}); }}
            />
          )}
          content={<Text variant="b3">{t('Organisms.Settings.hide_membership_events.description')}</Text>}
        />
        <SettingTile
          title={t('Organisms.Settings.hide_nickname_avatar_events.title')}
          options={(
            <Toggle
              isActive={settings.hideNickAvatarEvents}
              onToggle={() => { toggleNickAvatarEvents(); updateState({}); }}
            />
          )}
          content={<Text variant="b3">{t('Organisms.Settings.hide_nickname_avatar_events.description')}</Text>}
        />
      </div>
    </div>
  );
}

function NotificationsSection() {
  const [permission, setPermission] = usePermission('notifications', window.Notification?.permission);

  const [, updateState] = useState({});

  const { t } = useTranslation();

  const renderOptions = () => {
    if (window.Notification === undefined) {
      return <Text className="settings-notifications__not-supported">{t('errors.browser_not_supported')}</Text>;
    }

    if (permission === 'granted') {
      return (
        <Toggle
          isActive={settings._showNotifications}
          onToggle={() => {
            toggleNotifications();
            setPermission(window.Notification?.permission);
            updateState({});
          }}
        />
      );
    }

    return (
      <Button
        variant="primary"
        onClick={() => window.Notification.requestPermission().then(setPermission)}
      >
        Request permission
      </Button>
    );
  };

  return (
    <div className="settings-notifications">
      <MenuHeader>{t('Organisms.Settings.notifications_and_sound.title')}</MenuHeader>
      <SettingTile
        title={t('Organisms.Settings.notifications_and_sound.desktop.title')}
        options={renderOptions()}
        content={<Text variant="b3">{t('Organisms.Settings.notifications_and_sound.desktop.description')}</Text>}
      />
      <SettingTile
        title={t('Organisms.Settings.notifications_and_sound.sound.title')}
        options={(
          <Toggle
            isActive={settings.isNotificationSounds}
            onToggle={() => { toggleNotificationSounds(); updateState({}); }}
          />
          )}
        content={<Text variant="b3">{t('Organisms.Settings.notifications_and_sound.desktop.description')}</Text>}
      />
    </div>
  );
}

function EmojiSection() {
  return (
    <>
      <div className="settings-emoji__card"><ImagePackUser /></div>
      <div className="settings-emoji__card"><ImagePackGlobal /></div>
    </>
  );
}

function SecuritySection() {
  const { t } = useTranslation();

  return (
    <div className="settings-security">
      <div className="settings-security__card">
        <MenuHeader>{t('Organisms.Settings.security.cross_signing.title')}</MenuHeader>
        <CrossSigning />
        <KeyBackup />
      </div>
      <DeviceManage />
      <div className="settings-security__card">
        <MenuHeader>{t('Organisms.Settings.security.export_import_encryption_keys.title')}</MenuHeader>
        <SettingTile
          title={t('Organisms.Settings.security.export_encryption_keys.title')}
          content={(
            <>
              <Text variant="b3">{t('Organisms.Settings.security.export_encryption_keys.description')}</Text>
              <ExportE2ERoomKeys />
            </>
          )}
        />
        <SettingTile
          title={t('Organisms.Settings.security.import_encryption_keys.title')}
          content={(
            <>
              <Text variant="b3">{t('Organisms.Settings.security.import_encryption_keys.description')}</Text>
              <ImportE2ERoomKeys />
            </>
          )}
        />
      </div>
    </div>
  );
}

function AboutSection() {
  const { t } = useTranslation();

  return (
    <div className="settings-about">
      <div className="settings-about__card">
        <MenuHeader>{t('Organisms.Settings.about.application')}</MenuHeader>
        <div className="settings-about__branding">
          <img width="60" height="60" src={CinnySVG} alt="Cinny logo" />
          <div>
            <Text variant="h2" weight="medium">
              {t('common.cinny')}
              <span className="text text-b3" style={{ margin: '0 var(--sp-extra-tight)' }}>{`v${cons.version}`}</span>
            </Text>
            <Text>{t('common.slogan')}</Text>

            <div className="settings-about__btns">
              <Button onClick={() => window.open('https://github.com/ajbura/cinny')}>{t('common.source_code')}</Button>
              <Button onClick={() => window.open('https://cinny.in/#sponsor')}>{t('common.sponsor')}</Button>
            </div>
          </div>
        </div>
      </div>
      <div className="settings-about__card">
        <MenuHeader>{t('Organisms.Settings.about.credits')}</MenuHeader>
        <div className="settings-about__credits">
          <ul>
            <li>
              {/* eslint-disable-next-line react/jsx-one-expression-per-line */ }
              <Text>The <a href="https://github.com/matrix-org/matrix-js-sdk" rel="noreferrer noopener" target="_blank">matrix-js-sdk</a> is © <a href="https://matrix.org/foundation" rel="noreferrer noopener" target="_blank">The Matrix.org Foundation C.I.C</a> used under the terms of <a href="http://www.apache.org/licenses/LICENSE-2.0" rel="noreferrer noopener" target="_blank">Apache 2.0</a>.</Text>
            </li>
            <li>
              {/* eslint-disable-next-line react/jsx-one-expression-per-line */ }
              <Text>The <a href="https://twemoji.twitter.com" target="_blank" rel="noreferrer noopener">Twemoji</a> emoji art is © <a href="https://twemoji.twitter.com" target="_blank" rel="noreferrer noopener">Twitter, Inc and other contributors</a> used under the terms of <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer noopener">CC-BY 4.0</a>.</Text>
            </li>
            <li>
              {/* eslint-disable-next-line react/jsx-one-expression-per-line */ }
              <Text>The <a href="https://material.io/design/sound/sound-resources.html" target="_blank" rel="noreferrer noopener">Material sound resources</a> are © <a href="https://google.com" target="_blank" rel="noreferrer noopener">Google</a> used under the terms of <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer noopener">CC-BY 4.0</a>.</Text>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export const tabText = {
  APPEARANCE: 'Appearance',
  NOTIFICATIONS: 'Notifications',
  EMOJI: 'Emoji',
  SECURITY: 'Security',
  ABOUT: 'About',
};
const tabItems = [{
  text: tabText.APPEARANCE,
  iconSrc: SunIC,
  disabled: false,
  render: () => <AppearanceSection />,
}, {
  text: tabText.NOTIFICATIONS,
  iconSrc: BellIC,
  disabled: false,
  render: () => <NotificationsSection />,
}, {
  text: tabText.EMOJI,
  iconSrc: EmojiIC,
  disabled: false,
  render: () => <EmojiSection />,
}, {
  text: tabText.SECURITY,
  iconSrc: LockIC,
  disabled: false,
  render: () => <SecuritySection />,
}, {
  text: tabText.ABOUT,
  iconSrc: InfoIC,
  disabled: false,
  render: () => <AboutSection />,
}];

function useWindowToggle(setSelectedTab) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const openSettings = (tab) => {
      const tabItem = tabItems.find((item) => item.text === tab);
      if (tabItem) setSelectedTab(tabItem);
      setIsOpen(true);
    };
    navigation.on(cons.events.navigation.SETTINGS_OPENED, openSettings);
    return () => {
      navigation.removeListener(cons.events.navigation.SETTINGS_OPENED, openSettings);
    };
  }, []);

  const requestClose = () => setIsOpen(false);

  return [isOpen, requestClose];
}

function Settings() {
  const [selectedTab, setSelectedTab] = useState(tabItems[0]);
  const [isOpen, requestClose] = useWindowToggle(setSelectedTab);

  const { t } = useTranslation();

  const handleTabChange = (tabItem) => setSelectedTab(tabItem);
  const handleLogout = async () => {
    if (await confirmDialog(t('Organisms.Settings.logout.dialog.title'), t('Organisms.Settings.logout.dialog.description'), t('Organisms.Settings.logout.dialog.confirm'), 'danger')) {
      logout();
    }
  };

  return (
    <PopupWindow
      isOpen={isOpen}
      className="settings-window"
      title={<Text variant="s1" weight="medium" primary>{t('Organisms.Settings.title')}</Text>}
      contentOptions={(
        <>
          <Button variant="danger" iconSrc={PowerIC} onClick={handleLogout}>
            {t('Organisms.Settings.logout.title')}
          </Button>
          <IconButton src={CrossIC} onClick={requestClose} tooltip={t('common.close')} />
        </>
      )}
      onRequestClose={requestClose}
    >
      {isOpen && (
        <div className="settings-window__content">
          <ProfileEditor userId={initMatrix.matrixClient.getUserId()} />
          <Tabs
            items={tabItems}
            defaultSelected={tabItems.findIndex((tab) => tab.text === selectedTab.text)}
            onSelect={handleTabChange}
          />
          <div className="settings-window__cards-wrapper">
            { selectedTab.render() }
          </div>
        </div>
      )}
    </PopupWindow>
  );
}

export default Settings;
