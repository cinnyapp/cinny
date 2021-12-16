import React from 'react';
import PropTypes from 'prop-types';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { openRoomOptions } from '../../../client/action/navigation';
import { togglePeopleDrawer } from '../../../client/action/settings';
import colorMXID from '../../../util/colorMXID';
import { getEventCords } from '../../../util/common';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import Avatar from '../../atoms/avatar/Avatar';

import UserIC from '../../../../public/res/ic/outlined/user.svg';
import VerticalMenuIC from '../../../../public/res/ic/outlined/vertical-menu.svg';

function RoomViewHeader({ roomId }) {
  const mx = initMatrix.matrixClient;
  const isDM = initMatrix.roomList.directs.has(roomId);
  let avatarSrc = mx.getRoom(roomId).getAvatarUrl(mx.baseUrl, 36, 36, 'crop');
  avatarSrc = isDM ? mx.getRoom(roomId).getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 36, 36, 'crop') : avatarSrc;
  const roomName = mx.getRoom(roomId).name;
  const roomTopic = mx.getRoom(roomId).currentState.getStateEvents('m.room.topic')[0]?.getContent().topic;

  return (
    <Header>
      <Avatar imageSrc={avatarSrc} text={roomName} bgColor={colorMXID(roomId)} size="small" />
      <TitleWrapper>
        <Text variant="h2" weight="medium" primary>{twemojify(roomName)}</Text>
        { typeof roomTopic !== 'undefined' && <p title={roomTopic} className="text text-b3">{twemojify(roomTopic)}</p>}
      </TitleWrapper>
      <IconButton onClick={togglePeopleDrawer} tooltip="People" src={UserIC} />
      <IconButton
        onClick={(e) => openRoomOptions(getEventCords(e), roomId)}
        tooltip="Options"
        src={VerticalMenuIC}
      />
    </Header>
  );
}
RoomViewHeader.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomViewHeader;
