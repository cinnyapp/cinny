import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Settings.scss';

import initMatrix from '../../../client/initMatrix';
import settings from '../../../client/state/settings';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import SegmentedControls from '../../atoms/segmented-controls/SegmentedControls';

import PopupWindow, { PWContentSelector } from '../../molecules/popup-window/PopupWindow';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import SunIC from '../../../../public/res/ic/outlined/sun.svg';
import LockIC from '../../../../public/res/ic/outlined/lock.svg';
import InfoIC from '../../../../public/res/ic/outlined/info.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import CinnySVG from '../../../../public/res/svg/cinny.svg';

function AppearanceSection() {
  return (
    <div className="settings-content">
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
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="settings-content">
      <Text>{`Device ID: ${initMatrix.matrixClient.getDeviceId()}`}</Text>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="settings-content settings__about">
      <div className="settings__about__branding">
        <img width="60" height="60" src={CinnySVG} alt="Cinny logo" />
        <div>
          <Text variant="h2">
            Cinny
            <span className="text text-b3" style={{ margin: '0 var(--sp-extra-tight)' }}>v1.0.0</span>
          </Text>
          <Text>Yet another matrix client</Text>

          <div className="settings__about__btns">
            <Button onClick={() => window.open('https://github.com/ajbura/cinny')}>Source code</Button>
            <Button onClick={() => window.open('https://liberapay.com/ajbura/donate')}>Support</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Settings({ isOpen, onRequestClose }) {
  const settingSections = [{
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

  return (
    <PopupWindow
      className="settings-window"
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title="Settings"
      contentTitle={selectedSection.name}
      drawer={
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
