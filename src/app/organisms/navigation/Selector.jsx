/* eslint-disable react/prop-types */
import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { openReusableContextMenu } from '../../../client/action/navigation';
import { getEventCords, abbreviateNumber } from '../../../util/common';
import { joinRuleToIconSrc } from '../../../util/matrixUtil';

import IconButton from '../../atoms/button/IconButton';
import RoomSelector from '../../molecules/room-selector/RoomSelector';
import RoomOptions from '../../molecules/room-options/RoomOptions';
import SpaceOptions from '../../molecules/space-options/SpaceOptions';

import VerticalMenuIC from '../../../../public/res/ic/outlined/vertical-menu.svg';

import { useForceUpdate } from '../../hooks/useForceUpdate';

function Selector({
  roomId, isDM, drawerPostie, onClick,
}) {
  const mx = initMatrix.matrixClient;
  const noti = initMatrix.notifications;
  const room = mx.getRoom(roomId);

  let imageSrc = room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;
  if (imageSrc === null) imageSrc = room.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;

  const isMuted = noti.getNotiType(roomId) === cons.notifs.MUTE;

  const [, forceUpdate] = useForceUpdate();

  useEffect(() => {
    const unSub1 = drawerPostie.subscribe('selector-change', roomId, forceUpdate);
    const unSub2 = drawerPostie.subscribe('unread-change', roomId, forceUpdate);
    return () => {
      unSub1();
      unSub2();
    };
  }, []);

  const openOptions = (e) => {
    e.preventDefault();
    openReusableContextMenu(
      'right',
      getEventCords(e, '.room-selector'),
      room.isSpaceRoom()
        ? (closeMenu) => <SpaceOptions roomId={roomId} afterOptionSelect={closeMenu} />
        : (closeMenu) => <RoomOptions roomId={roomId} afterOptionSelect={closeMenu} />,
    );
  };

  return (
    <RoomSelector
      key={roomId}
      name={room.name}
      roomId={roomId}
      imageSrc={isDM ? imageSrc : null}
      iconSrc={isDM ? null : joinRuleToIconSrc(room.getJoinRule(), room.isSpaceRoom())}
      isSelected={navigation.selectedRoomId === roomId}
      isMuted={isMuted}
      isUnread={!isMuted && noti.hasNoti(roomId)}
      notificationCount={abbreviateNumber(noti.getTotalNoti(roomId))}
      isAlert={noti.getHighlightNoti(roomId) !== 0}
      onClick={onClick}
      onContextMenu={openOptions}
      options={(
        <IconButton
          size="extra-small"
          tooltip="Options"
          tooltipPlacement="right"
          src={VerticalMenuIC}
          onClick={openOptions}
        />
      )}
    />
  );
}

Selector.defaultProps = {
  isDM: true,
};

Selector.propTypes = {
  roomId: PropTypes.string.isRequired,
  isDM: PropTypes.bool,
  drawerPostie: PropTypes.shape({}).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default Selector;
