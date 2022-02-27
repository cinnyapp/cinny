/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
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

  const [, forceUpdate] = useForceUpdate();

  useEffect(() => {
    drawerPostie.subscribe('selector-change', roomId, forceUpdate);
    drawerPostie.subscribe('unread-change', roomId, forceUpdate);
    return () => {
      drawerPostie.unsubscribe('selector-change', roomId);
      drawerPostie.unsubscribe('unread-change', roomId);
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
      isUnread={noti.hasNoti(roomId)}
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
