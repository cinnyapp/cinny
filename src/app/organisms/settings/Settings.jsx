import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './Settings.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import settings from '../../../client/state/settings';
import { toggleSystemTheme, toggleMarkdown, toggleMembershipEvents, toggleNickAvatarEvents } from '../../../client/action/settings';
import logout from '../../../client/action/logout';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import Toggle from '../../atoms/button/Toggle';
import SegmentedControls from '../../atoms/segmented-controls/SegmentedControls';

import PopupWindow, { PWContentSelector } from '../../molecules/popup-window/PopupWindow';
import SettingTile from '../../molecules/setting-tile/SettingTile';
import ImportE2ERoomKeys from '../../molecules/import-export-e2e-room-keys/ImportE2ERoomKeys';
import ExportE2ERoomKeys from '../../molecules/import-export-e2e-room-keys/ExportE2ERoomKeys';

import ProfileEditor from '../profile-editor/ProfileEditor';

import SettingsIC from '../../../../public/res/ic/outlined/settings.svg';
import SunIC from '../../../../public/res/ic/outlined/sun.svg';
import LockIC from '../../../../public/res/ic/outlined/lock.svg';
import InfoIC from '../../../../public/res/ic/outlined/info.svg';
import PowerIC from '../../../../public/res/ic/outlined/power.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import CinnySVG from '../../../../public/res/svg/cinny.svg';

function GeneralSection() {
  return (
    <div className="settings-content">
      <SettingTile
        title=""
        content={(
          <ProfileEditor userId={initMatrix.matrixClient.getUserId()} />
        )}
      />
    </div>
  );
}

function AppearanceSection() {
  const [, updateState] = useState({});

  return (
    <div className="settings-content">
      <SettingTile
        title="Follow system theme"
        options={(
          <Toggle
            isActive={settings.useSystemTheme}
            onToggle={() => { toggleSystemTheme(); updateState({}); }}
          />
        )}
        content={<Text variant="b3">Use light or dark mode based on the system's settings.</Text>}
      />
      {(() => {
        if (!settings.useSystemTheme) {
          return <SettingTile
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
        }
      })()}
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
  );
}

function SecuritySection() {
  return (
    <div className="set-security settings-content">
      <SettingTile
        title={`Device ID: ${initMatrix.matrixClient.getDeviceId()}`}
      />
      <SettingTile
        title={`Device key: ${initMatrix.matrixClient.getDeviceEd25519Key().match(/.{1,4}/g).join(' ')}`}
        content={<Text variant="b3">Use this device ID-key combo to verify or manage this session from Element client.</Text>}
      />
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
  );
}

function AboutSection() {
  return (
    <div className="settings-content settings__about">
      <div className="set-about__branding">
        <img width="60" height="60" src={CinnySVG} alt="Cinny logo" />
        <div>
          <Text variant="h2">
            Cinny
            <span className="text text-b3" style={{ margin: '0 var(--sp-extra-tight)' }}>{`v${cons.version}`}</span>
          </Text>
          <Text>Yet another matrix client</Text>

          <div className="set-about__btns">
            <Button onClick={() => window.open('https://github.com/ajbura/cinny')}>Source code</Button>
            <Button onClick={() => window.open('https://cinny.in/#sponsor')}>Support</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Settings({ isOpen, onRequestClose }) {
  const settingSections = [{
    name: 'General',
    iconSrc: SettingsIC,
    render() {
      return <GeneralSection />;
    },
  }, {
    name: 'Appearance',
    iconSrc: SunIC,
    render() {
      return <AppearanceSection />;
    },
  }, {
    name: 'Security & Privacy',
    iconSrc: LockIC,
    render() {
      return <SecuritySection />;
    },
  }, {
    name: 'Help & About',
    iconSrc: InfoIC,
    render() {
      return <AboutSection />;
    },
  }];
  const [selectedSection, setSelectedSection] = useState(settingSections[0]);

  const handleLogout = () => {
    if (confirm('Confirm logout')) logout();
  };

  return (
    <PopupWindow
      className="settings-window"
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title="Settings"
      contentTitle={selectedSection.name}
      drawer={(
        <>
          {
            settingSections.map((section) => (
              <PWContentSelector
                key={section.name}
                selected={selectedSection.name === section.name}
                onClick={() => setSelectedSection(section)}
                iconSrc={section.iconSrc}
              >
                {section.name}
              </PWContentSelector>
            ))
          }
          <PWContentSelector
            variant="danger"
            onClick={handleLogout}
            iconSrc={PowerIC}
          >
            Logout
          </PWContentSelector>
        </>
      )}
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip="Close" />}
    >
      {selectedSection.render()}
    </PopupWindow>
  );
}

Settings.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onRequestClose: PropTypes.func.isRequired,
};

export default Settings;
