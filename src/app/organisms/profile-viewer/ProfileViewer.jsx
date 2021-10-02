import React from 'react';
import PropTypes from 'prop-types';
import './ProfileViewer.scss';

import initMatrix from '../../../client/initMatrix';
import * as roomActions from '../../../client/action/room';

import IconButton from '../../atoms/button/IconButton';
import PopupWindow from '../../molecules/popup-window/PopupWindow';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import Avatar from '../../atoms/avatar/Avatar';
import Text from '../../atoms/text/Text';
import colorMXID from '../../../util/colorMXID';
import Button from '../../atoms/button/Button';
import { getPowerLabel } from '../../../util/matrixUtil';
import { selectRoom } from '../../../client/action/navigation';

function ProfileViewer({
  isOpen, userId, roomId, onRequestClose,
}) {
  const mx = initMatrix.matrixClient;

  const user = mx.getUser(userId);
  const username = user?.displayName ?? '';
  const profilePicture = mx.mxcUrlToHttp(user?.avatarUrl) ?? '';
  const userColor = userId ? colorMXID(userId) : 'white';

  const room = roomId ? mx.getRoom(roomId) : null;
  const roomMember = room ? room.getMember(userId) : null;

  const [blockedUsers, setBlockedUsers] = React.useState(mx.getIgnoredUsers());

  const blockUser = () => {
    const newBlocks = [...blockedUsers, userId];
    setBlockedUsers(newBlocks);
    mx.setIgnoredUsers(newBlocks);
  };
  const unblockUser = () => {
    const newIgnoredUsers = blockedUsers.filter((blockedUser) => blockedUser !== userId);
    setBlockedUsers(newIgnoredUsers);
    mx.setIgnoredUsers(newIgnoredUsers);
  };
  const isUserBlocked = React.useCallback(() => blockedUsers.includes(userId), [blockedUsers]);

  return (
    <PopupWindow
      isOpen={isOpen}
      title={userId}
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip="Close" />}
      onRequestClose={onRequestClose}
    >
      <div className="profile-viewer">
        <Avatar imageSrc={profilePicture} text={username.slice(0, 1)} bgColor={userColor} size="large" />
        <Text variant="h2">
          {username}
        </Text>
        {roomMember && roomMember.powerLevel >= 50 && (
        <Text>
          {getPowerLabel(roomMember.powerLevel)}
          {' '}
          in
            {' '}
          {room.name}
        </Text>
        )}
        <div className="profile-viewer__buttons">
          <Button
            variant="primary"
            onClick={async () => {
              const result = await roomActions.create({
                isPublic: false,
                isEncrypted: true,
                isDirect: true,
                invite: [userId],
              });
              selectRoom(result.room_id);
              onRequestClose();
            }}
          >
            Direct Message
          </Button>
          <Button variant="primary">Mention</Button>
          <Button
            variant="danger"
            onClick={isUserBlocked ? unblockUser : blockUser}
          >
            {isUserBlocked ? 'Unblock' : 'Block'}
          </Button>
        </div>
      </div>
    </PopupWindow>
  );
}

ProfileViewer.defaultProps = {
  roomId: null,
};

ProfileViewer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  userId: PropTypes.string.isRequired,
  onRequestClose: PropTypes.func.isRequired,
  roomId: PropTypes.string,
};

export default ProfileViewer;
