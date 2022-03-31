import React, { useState, useEffect } from 'react';
import './Settings.scss';

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

import ProfileEditor from '../profile-editor/ProfileEditor';
import CrossSigning from './CrossSigning';
import KeyBackup from './KeyBackup';
import DeviceManage from './DeviceManage';

import SunIC from '../../../../public/res/ic/outlined/sun.svg';
import LockIC from '../../../../public/res/ic/outlined/lock.svg';
import BellIC from '../../../../public/res/ic/outlined/bell.svg';
import InfoIC from '../../../../public/res/ic/outlined/info.svg';
import PowerIC from '../../../../public/res/ic/outlined/power.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import CinnySVG from '../../../../public/res/svg/cinny.svg';

function AppearanceSection() {
  const [, updateState] = useState({});

  return (
    <div className="settings-appearance">
      <div className="settings-appearance__card">
        <MenuHeader>Theme</MenuHeader>
        <SettingTile
          title="Follow system theme"
          options={(
            <Toggle
              isActive={settings.useSystemTheme}
              onToggle={() => { toggleSystemTheme(); updateState({}); }}
            />
          )}
          content={<Text variant="b3">Use light or dark mode based on the system settings.</Text>}
        />
        {!settings.useSystemTheme && (
          <SettingTile
            title="Theme"
            content={(
              <SegmentedControls
                selected={settings.getThemeIndex()}
                segments={[
                  { text: 'Light' },
                  { text: 'Silver' },
                  { text: 'Dark' },
                  { text: 'Butter' },
                ]}
                onSelect={(index) => settings.setTheme(index)}
              />
          )}
          />
        )}
      </div>
      <div className="settings-appearance__card">
        <MenuHeader>Room messages</MenuHeader>
        <SettingTile
          title="Markdown formatting"
          options={(
            <Toggle
              isActive={settings.isMarkdown}
              onToggle={() => { toggleMarkdown(); updateState({}); }}
            />
          )}
          content={<Text variant="b3">Format messages with markdown syntax before sending.</Text>}
        />
        <SettingTile
          title="Hide membership events"
          options={(
            <Toggle
              isActive={settings.hideMembershipEvents}
              onToggle={() => { toggleMembershipEvents(); updateState({}); }}
            />
          )}
          content={<Text variant="b3">Hide membership change messages from room timeline. (Join, Leave, Invite, Kick and Ban)</Text>}
        />
        <SettingTile
          title="Hide nick/avatar events"
          options={(
            <Toggle
              isActive={settings.hideNickAvatarEvents}
              onToggle={() => { toggleNickAvatarEvents(); updateState({}); }}
            />
          )}
          content={<Text variant="b3">Hide nick and avatar change messages from room timeline.</Text>}
        />
      </div>
    </div>
  );
}

function NotificationsSection() {
  const [permission, setPermission] = usePermission('notifications', window.Notification?.permission);

  const [, updateState] = useState({});

  const renderOptions = () => {
    if (window.Notification === undefined) {
      return <Text className="settings-notifications__not-supported">Not supported in this browser.</Text>;
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
      <MenuHeader>Notification & Sound</MenuHeader>
      <SettingTile
        title="Desktop notification"
        options={renderOptions()}
        content={<Text variant="b3">Show desktop notification when new messages arrive.</Text>}
      />
      <SettingTile
        title="Notification Sound"
        options={(
          <Toggle
            isActive={settings.isNotificationSounds}
            onToggle={() => { toggleNotificationSounds(); updateState({}); }}
          />
          )}
        content={<Text variant="b3">Play sound when new messages arrive.</Text>}
      />
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="settings-security">
      <div className="settings-security__card">
        <MenuHeader>Cross signing and backup</MenuHeader>
        <CrossSigning />
        <KeyBackup />
      </div>
      <DeviceManage />
      <div className="settings-security__card">
        <MenuHeader>Export/Import encryption keys</MenuHeader>
        <SettingTile
          title="Export E2E room keys"
          content={(
            <>
              <Text variant="b3">Export end-to-end encryption room keys to decrypt old messages in other session. In order to encrypt keys you need to set a password, which will be used while importing.</Text>
              <ExportE2ERoomKeys />
            </>
          )}
        />
        <SettingTile
          title="Import E2E room keys"
          content={(
            <>
              <Text variant="b3">{'To decrypt older messages, Export E2EE room keys from Element (Settings > Security & Privacy > Encryption > Cryptography) and import them here. Imported keys are encrypted so you\'ll have to enter the password you set in order to decrypt it.'}</Text>
              <ImportE2ERoomKeys />
            </>
          )}
        />
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="settings-about">
      <div className="settings-about__card">
        <MenuHeader>Application</MenuHeader>
        <div className="settings-about__branding">
          <img width="60" height="60" src={CinnySVG} alt="Cinny logo" />
          <div>
            <Text variant="h2" weight="medium">
              Cinny
              <span className="text text-b3" style={{ margin: '0 var(--sp-extra-tight)' }}>{`v${cons.version}`}</span>
            </Text>
            <Text>Yet another matrix client</Text>

            <div className="settings-about__btns">
              <Button onClick={() => window.open('https://github.com/ajbura/cinny')}>Source code</Button>
              <Button onClick={() => window.open('https://cinny.in/#sponsor')}>Support</Button>
            </div>
          </div>
        </div>
      </div>
      <div className="settings-about__card">
        <MenuHeader>Credits</MenuHeader>
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

  const handleTabChange = (tabItem) => setSelectedTab(tabItem);
  const handleLogout = () => {
    if (confirm('Confirm logout')) logout();
  };

  return (
    <PopupWindow
      isOpen={isOpen}
      className="settings-window"
      title={<Text variant="s1" weight="medium" primary>Settings</Text>}
      contentOptions={(
        <>
          <Button variant="danger" iconSrc={PowerIC} onClick={handleLogout}>
            Logout
          </Button>
          <IconButton src={CrossIC} onClick={requestClose} tooltip="Close" />
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
