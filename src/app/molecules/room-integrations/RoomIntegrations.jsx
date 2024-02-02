import React from 'react';
import PropTypes from 'prop-types';
import './RoomIntegrations.scss';

import { getHttpUriForMxc } from 'matrix-js-sdk';
import { blurOnBubbling } from '../../atoms/button/script';

import initMatrix from '../../../client/initMatrix';
import colorMXID from '../../../util/colorMXID';

import Avatar from '../../atoms/avatar/Avatar';
import Text from '../../atoms/text/Text';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import { useRoomStateUpdate } from '../../hooks/useRoomStateUpdate';

function Bridge({
  name, bot, avatarSrc, channel, url,
}) {
  return (
    <div className="bridge__container">
      <a
        className="bridge"
        href={url}
        onMouseUp={(e) => blurOnBubbling(e, '.bridge')}
        target="_blank"
        rel="noreferrer"
      >
        <Avatar imageSrc={avatarSrc} bgColor={colorMXID(bot)} text={name} size="small" />
        <div className="bridge__text">
          <Text variant="b1">{name}</Text>
          <Text variant="b3">{channel}</Text>
        </div>
      </a>
    </div>
  );
}

Bridge.defaultProps = {
  bot: null,
  avatarSrc: null,
  url: null,
};

Bridge.propTypes = {
  name: PropTypes.string.isRequired,
  bot: PropTypes.string,
  avatarSrc: PropTypes.string,
  channel: PropTypes.string.isRequired,
  url: PropTypes.string,
};

function RoomIntegrations({ roomId }) {
  useRoomStateUpdate(roomId);
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const bEvents = room.currentState.getStateEvents('uk.half-shot.bridge');

  return (
    <div className="room-integrations__bridges">
      <MenuHeader>Bridges</MenuHeader>
      {bEvents.map((event) => {
        const { protocol, channel, bridgebot } = event.getContent();
        return (
          <Bridge
            key={event.state_key}
            name={protocol?.displayname}
            bot={bridgebot}
            avatarSrc={getHttpUriForMxc(mx.baseUrl, protocol?.avatar_url, 36, 36, 'crop')}
            channel={channel?.displayname || channel?.id}
            url={channel?.external_url || protocol?.external_url}
          />
        );
      })}
    </div>
  );
}

RoomIntegrations.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomIntegrations;
