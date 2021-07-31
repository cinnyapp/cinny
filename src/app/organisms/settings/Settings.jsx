import React from 'react';
import PropTypes from 'prop-types';
import './Settings.scss';

import initMatrix from '../../../client/initMatrix';
import settings from '../../../client/state/settings';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import SegmentedControls from '../../atoms/segmented-controls/SegmentedControls';

import PopupWindow from '../../molecules/popup-window/PopupWindow';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

function Settings({ isOpen, onRequestClose }) {
  return (
    <PopupWindow
      className="settings-window"
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title="Settings"
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip="Close" />}
    >
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
        <div style={{ flex: '1' }} />
        <Text className="settings__about" variant="b1">
          <a href="https://cinny.in/#about" target="_blank" rel="noreferrer">About</a>
        </Text>
        <Text className="settings__about">Version: 1.0.0</Text>
        <Text className="settings__about">{`Device ID: ${initMatrix.matrixClient.getDeviceId()}`}</Text>
      </div>
    </PopupWindow>
  );
}

Settings.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onRequestClose: PropTypes.func.isRequired,
};

export default Settings;
