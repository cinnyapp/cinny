import React from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import { togglePeopleDrawer, openInviteUser } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import Avatar from '../../atoms/avatar/Avatar';
import ContextMenu, { MenuItem, MenuHeader } from '../../atoms/context-menu/ContextMenu';

import UserIC from '../../../../public/res/ic/outlined/user.svg';
import VerticalMenuIC from '../../../../public/res/ic/outlined/vertical-menu.svg';
import LeaveArrowIC from '../../../../public/res/ic/outlined/leave-arrow.svg';
import AddUserIC from '../../../../public/res/ic/outlined/add-user.svg';

function ChannelViewHeader({ roomId }) {
  const mx = initMatrix.matrixClient;
  const avatarSrc = mx.getRoom(roomId).getAvatarUrl(mx.baseUrl, 36, 36, 'crop');
  const roomName = mx.getRoom(roomId).name;
  const roomTopic = mx.getRoom(roomId).currentState.getStateEvents('m.room.topic')[0]?.getContent().topic;

  return (
    <Header>
      <Avatar imageSrc={avatarSrc} text={roomName.slice(0, 1)} bgColor={colorMXID(roomName)} size="small" />
      <TitleWrapper>
        <Text variant="h2">{roomName}</Text>
        { typeof roomTopic !== 'undefined' && <p title={roomTopic} className="text text-b3">{roomTopic}</p>}
      </TitleWrapper>
      <IconButton onClick={togglePeopleDrawer} tooltip="People" src={UserIC} />
      <ContextMenu
        placement="bottom"
        content={(toogleMenu) => (
          <>
            <MenuHeader>Options</MenuHeader>
            {/* <MenuBorder /> */}
            <MenuItem
              iconSrc={AddUserIC}
              onClick={() => {
                openInviteUser(roomId); toogleMenu();
              }}
            >
              Invite
            </MenuItem>
            <MenuItem iconSrc={LeaveArrowIC} variant="danger" onClick={() => roomActions.leave(roomId)}>Leave</MenuItem>
          </>
        )}
        render={(toggleMenu) => <IconButton onClick={toggleMenu} tooltip="Options" src={VerticalMenuIC} />}
      />
    </Header>
  );
}
ChannelViewHeader.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default ChannelViewHeader;
