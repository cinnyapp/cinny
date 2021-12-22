import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomSettings.scss';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import Text from '../../atoms/text/Text';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import ScrollView from '../../atoms/scroll/ScrollView';
import Tabs from '../../atoms/tabs/Tabs';
import RoomProfile from '../../molecules/room-profile/RoomProfile';

import SettingsIC from '../../../../public/res/ic/outlined/settings.svg';
import SearchIC from '../../../../public/res/ic/outlined/search.svg';
import ShieldUserIC from '../../../../public/res/ic/outlined/shield-user.svg';
import LockIC from '../../../../public/res/ic/outlined/lock.svg';
import InfoIC from '../../../../public/res/ic/outlined/info.svg';

import { useForceUpdate } from '../../hooks/useForceUpdate';

const tabItems = [{
  iconSrc: SettingsIC,
  text: 'General',
  disabled: false,
}, {
  iconSrc: SearchIC,
  text: 'Search',
  disabled: false,
}, {
  iconSrc: ShieldUserIC,
  text: 'Permissions',
  disabled: false,
}, {
  iconSrc: LockIC,
  text: 'Security',
  disabled: false,
}, {
  iconSrc: InfoIC,
  text: 'Advanced',
  disabled: false,
}];

function RoomSettings({ roomId }) {
  const [, forceUpdate] = useForceUpdate();

  useEffect(() => {
    const settingsToggle = (isVisible) => {
      if (isVisible) forceUpdate();
      else setTimeout(() => forceUpdate(), 200);
    };
    navigation.on(cons.events.navigation.ROOM_SETTINGS_TOGGLED, settingsToggle);
    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SETTINGS_TOGGLED, settingsToggle);
    };
  }, []);

  if (!navigation.isRoomSettings) return null;

  return (
    <div className="room-settings">
      <ScrollView autoHide>
        <div className="room-settings__content">
          <Header>
            <TitleWrapper>
              <Text variant="s1" weight="medium" primary>Room settings</Text>
            </TitleWrapper>
          </Header>
          <RoomProfile roomId={roomId} />
          <Tabs items={tabItems} onSelect={() => false} />
          <div className="room-settings__cards-wrapper">
            {/* <div className="room-settings__card">
            </div> */}
          </div>
        </div>
      </ScrollView>
    </div>
  );
}

RoomSettings.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomSettings;
