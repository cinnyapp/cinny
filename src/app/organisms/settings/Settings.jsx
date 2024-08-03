import React, { useState, useEffect } from 'react';
import { Input, toRem } from 'folds';
import { isKeyHotkey } from 'is-hotkey';
import './Settings.scss';

import { clearCacheAndReload, logoutClient } from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import settings from '../../../client/state/settings';
import navigation from '../../../client/state/navigation';
import { toggleSystemTheme } from '../../../client/action/settings';
import { usePermissionState } from '../../hooks/usePermission';

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
import GlobalNotification from '../../molecules/global-notification/GlobalNotification';
import KeywordNotification from '../../molecules/global-notification/KeywordNotification';
import IgnoreUserList from '../../molecules/global-notification/IgnoreUserList';

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
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { isMacOS } from '../../utils/user-agent';
import { KeySymbol } from '../../utils/key-symbol';
import { useMatrixClient } from '../../hooks/useMatrixClient';

function AppearanceSection() {
  const [, updateState] = useState({});

  const [enterForNewline, setEnterForNewline] = useSetting(settingsAtom, 'enterForNewline');
  const [messageLayout, setMessageLayout] = useSetting(settingsAtom, 'messageLayout');
  const [messageSpacing, setMessageSpacing] = useSetting(settingsAtom, 'messageSpacing');
  const [twitterEmoji, setTwitterEmoji] = useSetting(settingsAtom, 'twitterEmoji');
  const [pageZoom, setPageZoom] = useSetting(settingsAtom, 'pageZoom');
  const [isMarkdown, setIsMarkdown] = useSetting(settingsAtom, 'isMarkdown');
  const [hideMembershipEvents, setHideMembershipEvents] = useSetting(
    settingsAtom,
    'hideMembershipEvents'
  );
  const [hideNickAvatarEvents, setHideNickAvatarEvents] = useSetting(
    settingsAtom,
    'hideNickAvatarEvents'
  );
  const [mediaAutoLoad, setMediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
  const [urlPreview, setUrlPreview] = useSetting(settingsAtom, 'urlPreview');
  const [encUrlPreview, setEncUrlPreview] = useSetting(settingsAtom, 'encUrlPreview');
  const [showHiddenEvents, setShowHiddenEvents] = useSetting(settingsAtom, 'showHiddenEvents');
  const spacings = ['0', '100', '200', '300', '400', '500'];

  const [currentZoom, setCurrentZoom] = useState(`${pageZoom}`);

  const handleZoomChange = (evt) => {
    setCurrentZoom(evt.target.value);
  };

  const handleZoomEnter = (evt) => {
    if (isKeyHotkey('escape', evt)) {
      evt.stopPropagation();
      setCurrentZoom(pageZoom);
    }
    if (isKeyHotkey('enter', evt)) {
      const newZoom = parseInt(evt.target.value, 10);
      if (Number.isNaN(newZoom)) return;
      const safeZoom = Math.max(Math.min(newZoom, 150), 75);
      setPageZoom(safeZoom);
      setCurrentZoom(safeZoom);
    }
  };

  return (
    <div className="settings-appearance">
      <div className="settings-appearance__card">
        <MenuHeader>Theme</MenuHeader>
        <SettingTile
          title="Follow system theme"
          options={
            <Toggle
              isActive={settings.useSystemTheme}
              onToggle={() => {
                toggleSystemTheme();
                updateState({});
              }}
            />
          }
          content={<Text variant="b3">Use light or dark mode based on the system settings.</Text>}
        />
        <SettingTile
          title="Theme"
          content={
            <SegmentedControls
              selected={settings.useSystemTheme ? -1 : settings.getThemeIndex()}
              segments={[
                { text: 'Light' },
                { text: 'Silver' },
                { text: 'Dark' },
                { text: 'Butter' },
              ]}
              onSelect={(index) => {
                if (settings.useSystemTheme) toggleSystemTheme();
                settings.setTheme(index);
                updateState({});
              }}
            />
          }
        />
        <SettingTile
          title="Use Twitter Emoji"
          options={
            <Toggle isActive={twitterEmoji} onToggle={() => setTwitterEmoji(!twitterEmoji)} />
          }
          content={<Text variant="b3">Use Twitter emoji instead of system emoji.</Text>}
        />
        <SettingTile
          title="Page Zoom"
          options={
            <Input
              style={{ width: toRem(150) }}
              variant={pageZoom === parseInt(currentZoom, 10) ? 'Background' : 'Primary'}
              size="400"
              type="number"
              min="75"
              max="150"
              value={currentZoom}
              onChange={handleZoomChange}
              onKeyDown={handleZoomEnter}
              outlined
              after={<Text variant="b2">%</Text>}
            />
          }
          content={
            <Text variant="b3">
              Change page zoom to scale user interface between 75% to 150%. Default: 100%
            </Text>
          }
        />
      </div>
      <div className="settings-appearance__card">
        <MenuHeader>Room messages</MenuHeader>
        <SettingTile
          title="Message Layout"
          content={
            <SegmentedControls
              selected={messageLayout}
              segments={[{ text: 'Modern' }, { text: 'Compact' }, { text: 'Bubble' }]}
              onSelect={(index) => setMessageLayout(index)}
            />
          }
        />
        <SettingTile
          title="Message Spacing"
          content={
            <SegmentedControls
              selected={spacings.findIndex((s) => s === messageSpacing)}
              segments={[
                { text: 'No' },
                { text: 'XXS' },
                { text: 'XS' },
                { text: 'S' },
                { text: 'M' },
                { text: 'L' },
              ]}
              onSelect={(index) => {
                setMessageSpacing(spacings[index]);
              }}
            />
          }
        />
        <SettingTile
          title="Use ENTER for Newline"
          options={
            <Toggle
              isActive={enterForNewline}
              onToggle={() => setEnterForNewline(!enterForNewline)}
            />
          }
          content={
            <Text variant="b3">{`Use ${
              isMacOS() ? KeySymbol.Command : 'Ctrl'
            } + ENTER to send message and ENTER for newline.`}</Text>
          }
        />
        <SettingTile
          title="Markdown formatting"
          options={<Toggle isActive={isMarkdown} onToggle={() => setIsMarkdown(!isMarkdown)} />}
          content={<Text variant="b3">Format messages with markdown syntax before sending.</Text>}
        />
        <SettingTile
          title="Hide membership events"
          options={
            <Toggle
              isActive={hideMembershipEvents}
              onToggle={() => setHideMembershipEvents(!hideMembershipEvents)}
            />
          }
          content={
            <Text variant="b3">
              Hide membership change messages from room timeline. (Join, Leave, Invite, Kick and
              Ban)
            </Text>
          }
        />
        <SettingTile
          title="Hide nick/avatar events"
          options={
            <Toggle
              isActive={hideNickAvatarEvents}
              onToggle={() => setHideNickAvatarEvents(!hideNickAvatarEvents)}
            />
          }
          content={
            <Text variant="b3">Hide nick and avatar change messages from room timeline.</Text>
          }
        />
        <SettingTile
          title="Disable media auto load"
          options={
            <Toggle isActive={!mediaAutoLoad} onToggle={() => setMediaAutoLoad(!mediaAutoLoad)} />
          }
          content={
            <Text variant="b3">Prevent images and videos from auto loading to save bandwidth.</Text>
          }
        />
        <SettingTile
          title="Url Preview"
          options={<Toggle isActive={urlPreview} onToggle={() => setUrlPreview(!urlPreview)} />}
          content={<Text variant="b3">Show url preview for link in messages.</Text>}
        />
        <SettingTile
          title="Url Preview in Encrypted Room"
          options={
            <Toggle isActive={encUrlPreview} onToggle={() => setEncUrlPreview(!encUrlPreview)} />
          }
          content={<Text variant="b3">Show url preview for link in encrypted messages.</Text>}
        />
        <SettingTile
          title="Show hidden events"
          options={
            <Toggle
              isActive={showHiddenEvents}
              onToggle={() => setShowHiddenEvents(!showHiddenEvents)}
            />
          }
          content={<Text variant="b3">Show hidden state and message events.</Text>}
        />
      </div>
    </div>
  );
}

function NotificationsSection() {
  const notifPermission = usePermissionState(
    'notifications',
    window.Notification?.permission ?? 'denied'
  );
  const [showNotifications, setShowNotifications] = useSetting(settingsAtom, 'showNotifications');
  const [isNotificationSounds, setIsNotificationSounds] = useSetting(
    settingsAtom,
    'isNotificationSounds'
  );

  const renderOptions = () => {
    if (window.Notification === undefined) {
      return (
        <Text className="settings-notifications__not-supported">
          Not supported in this browser.
        </Text>
      );
    }

    if (notifPermission === 'denied') {
      return <Text>Permission Denied</Text>;
    }

    if (notifPermission === 'granted') {
      return (
        <Toggle
          isActive={showNotifications}
          onToggle={() => {
            setShowNotifications(!showNotifications);
          }}
        />
      );
    }

    return (
      <Button
        variant="primary"
        onClick={() =>
          window.Notification.requestPermission().then(() => {
            setShowNotifications(window.Notification?.permission === 'granted');
          })
        }
      >
        Request permission
      </Button>
    );
  };

  return (
    <>
      <div className="settings-notifications">
        <MenuHeader>Notification & Sound</MenuHeader>
        <SettingTile
          title="Desktop notification"
          options={renderOptions()}
          content={<Text variant="b3">Show desktop notification when new messages arrive.</Text>}
        />
        <SettingTile
          title="Notification Sound"
          options={
            <Toggle
              isActive={isNotificationSounds}
              onToggle={() => setIsNotificationSounds(!isNotificationSounds)}
            />
          }
          content={<Text variant="b3">Play sound when new messages arrive.</Text>}
        />
      </div>
      <GlobalNotification />
      <KeywordNotification />
      <IgnoreUserList />
    </>
  );
}

function EmojiSection() {
  return (
    <>
      <div className="settings-emoji__card">
        <ImagePackUser />
      </div>
      <div className="settings-emoji__card">
        <ImagePackGlobal />
      </div>
    </>
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
          content={
            <>
              <Text variant="b3">
                Export end-to-end encryption room keys to decrypt old messages in other session. In
                order to encrypt keys you need to set a password, which will be used while
                importing.
              </Text>
              <ExportE2ERoomKeys />
            </>
          }
        />
        <SettingTile
          title="Import E2E room keys"
          content={
            <>
              <Text variant="b3">
                {
                  "To decrypt older messages, Export E2EE room keys from Element (Settings > Security & Privacy > Encryption > Cryptography) and import them here. Imported keys are encrypted so you'll have to enter the password you set in order to decrypt it."
                }
              </Text>
              <ImportE2ERoomKeys />
            </>
          }
        />
      </div>
    </div>
  );
}

function AboutSection() {
  const mx = useMatrixClient();

  return (
    <div className="settings-about">
      <div className="settings-about__card">
        <MenuHeader>Application</MenuHeader>
        <div className="settings-about__branding">
          <img width="60" height="60" src={CinnySVG} alt="Cinny logo" />
          <div>
            <Text variant="h2" weight="medium">
              Cinny
              <span
                className="text text-b3"
                style={{ margin: '0 var(--sp-extra-tight)' }}
              >{`v${cons.version}`}</span>
            </Text>
            <Text>Yet another matrix client</Text>

            <div className="settings-about__btns">
              <Button onClick={() => window.open('https://github.com/ajbura/cinny')}>
                Source code
              </Button>
              <Button onClick={() => window.open('https://cinny.in/#sponsor')}>Support</Button>
              <Button onClick={() => clearCacheAndReload(mx)} variant="danger">
                Clear cache & reload
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="settings-about__card">
        <MenuHeader>Credits</MenuHeader>
        <div className="settings-about__credits">
          <ul>
            <li>
              {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
              <Text>
                The{' '}
                <a
                  href="https://github.com/matrix-org/matrix-js-sdk"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  matrix-js-sdk
                </a>{' '}
                is ©{' '}
                <a href="https://matrix.org/foundation" rel="noreferrer noopener" target="_blank">
                  The Matrix.org Foundation C.I.C
                </a>{' '}
                used under the terms of{' '}
                <a
                  href="http://www.apache.org/licenses/LICENSE-2.0"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  Apache 2.0
                </a>
                .
              </Text>
            </li>
            <li>
              {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
              <Text>
                The{' '}
                <a
                  href="https://github.com/mozilla/twemoji-colr"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  twemoji-colr
                </a>{' '}
                font is ©{' '}
                <a href="https://mozilla.org/" target="_blank" rel="noreferrer noopener">
                  Mozilla Foundation
                </a>{' '}
                used under the terms of{' '}
                <a
                  href="http://www.apache.org/licenses/LICENSE-2.0"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Apache 2.0
                </a>
                .
              </Text>
            </li>
            <li>
              {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
              <Text>
                The{' '}
                <a href="https://twemoji.twitter.com" target="_blank" rel="noreferrer noopener">
                  Twemoji
                </a>{' '}
                emoji art is ©{' '}
                <a href="https://twemoji.twitter.com" target="_blank" rel="noreferrer noopener">
                  Twitter, Inc and other contributors
                </a>{' '}
                used under the terms of{' '}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  CC-BY 4.0
                </a>
                .
              </Text>
            </li>
            <li>
              {/* eslint-disable-next-line react/jsx-one-expression-per-line */}
              <Text>
                The{' '}
                <a
                  href="https://material.io/design/sound/sound-resources.html"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Material sound resources
                </a>{' '}
                are ©{' '}
                <a href="https://google.com" target="_blank" rel="noreferrer noopener">
                  Google
                </a>{' '}
                used under the terms of{' '}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  CC-BY 4.0
                </a>
                .
              </Text>
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
const tabItems = [
  {
    text: tabText.APPEARANCE,
    iconSrc: SunIC,
    disabled: false,
    render: () => <AppearanceSection />,
  },
  {
    text: tabText.NOTIFICATIONS,
    iconSrc: BellIC,
    disabled: false,
    render: () => <NotificationsSection />,
  },
  {
    text: tabText.EMOJI,
    iconSrc: EmojiIC,
    disabled: false,
    render: () => <EmojiSection />,
  },
  {
    text: tabText.SECURITY,
    iconSrc: LockIC,
    disabled: false,
    render: () => <SecuritySection />,
  },
  {
    text: tabText.ABOUT,
    iconSrc: InfoIC,
    disabled: false,
    render: () => <AboutSection />,
  },
];

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
  const mx = useMatrixClient();

  const handleTabChange = (tabItem) => setSelectedTab(tabItem);
  const handleLogout = async () => {
    if (
      await confirmDialog(
        'Logout',
        'Are you sure that you want to logout your session?',
        'Logout',
        'danger'
      )
    ) {
      logoutClient(mx);
    }
  };

  return (
    <PopupWindow
      isOpen={isOpen}
      className="settings-window"
      title={
        <Text variant="s1" weight="medium" primary>
          Settings
        </Text>
      }
      contentOptions={
        <>
          <Button variant="danger" iconSrc={PowerIC} onClick={handleLogout}>
            Logout
          </Button>
          <IconButton src={CrossIC} onClick={requestClose} tooltip="Close" />
        </>
      }
      onRequestClose={requestClose}
    >
      {isOpen && (
        <div className="settings-window__content">
          <ProfileEditor userId={mx.getUserId()} />
          <Tabs
            items={tabItems}
            defaultSelected={tabItems.findIndex((tab) => tab.text === selectedTab.text)}
            onSelect={handleTabChange}
          />
          <div className="settings-window__cards-wrapper">{selectedTab.render()}</div>
        </div>
      )}
    </PopupWindow>
  );
}

export default Settings;
