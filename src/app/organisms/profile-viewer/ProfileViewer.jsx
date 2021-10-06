import React from 'react';
import PropTypes from 'prop-types';
import './ProfileViewer.scss';

import initMatrix from '../../../client/initMatrix';
import * as roomActions from '../../../client/action/room';

import IconButton from '../../atoms/button/IconButton';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import RingIC from '../../../../public/res/ic/outlined/ring.svg';
import Avatar from '../../atoms/avatar/Avatar';
import Text from '../../atoms/text/Text';
import colorMXID from '../../../util/colorMXID';
import Button from '../../atoms/button/Button';
import { getPowerLabel } from '../../../util/matrixUtil';
import { selectRoom } from '../../../client/action/navigation';
import Dialog from '../../molecules/dialog/Dialog';
import RawIcon from '../../atoms/system-icons/RawIcon';
import Divider from '../../atoms/divider/Divider';

function SessionChip({
  deviceInfo,
}) {
  return (
    <div className="session-chip">
      <RawIcon src={RingIC} color={deviceInfo.verified ? 'red' : 'green'} size="extra-small" />
      <Text>
        {deviceInfo.unsigned.device_display_name}
      </Text>
    </div>
  );
}

SessionChip.propTypes = {
  deviceInfo: PropTypes.shape.isRequired,
};

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
  const isUserBlocked = blockedUsers.includes(userId);

  return (
    <Dialog
      isOpen={isOpen}
      title={`${username} in ${room?.name ?? ''}`}
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip="Close" />}
      onRequestClose={onRequestClose}
      className="profile-viewer"
    >
      <div className="profile-viewer__content">
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          <Avatar imageSrc={profilePicture} text={username.slice(0, 1)} bgColor={userColor} size="large" />
          <div className="profile-viewer__content-usernames">
            <Text variant="h2">
              {username}
            </Text>
            {username !== userId && (
            <Text>
              {userId}
            </Text>
            )}
          </div>
        </div>
        <Divider text={false} />
        <Text>Sessions</Text>
        {/* {roomMember && roomMember.powerLevel >= 50 && (
        <Text>
          {getPowerLabel(roomMember.powerLevel)}
          {' '}
          in
            {' '}
          {room.name}
        </Text>
        )} */}
        <div className="profile-viewer__content-sessions">
          {
          mx.getStoredDevicesForUser(userId).map((device) => (
            <SessionChip deviceInfo={device} />
          ))
        }
        </div>
        <Divider text={false} />
        <div className="profile-viewer__buttons">
          <div>
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
              Message
            </Button>
            <Button>Mention</Button>
          </div>
          <Button
            variant="danger"
            onClick={isUserBlocked ? unblockUser : blockUser}
          >
            {isUserBlocked ? 'Unblock' : 'Block'}
          </Button>
        </div>
      </div>
    </Dialog>
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
