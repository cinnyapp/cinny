import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './ImagePack.scss';

import initMatrix from '../../../client/initMatrix';

import Button from '../../atoms/button/Button';
import Text from '../../atoms/text/Text';
import ImagePackProfile from './ImagePackProfile';
import ImagePackItem from './ImagePackItem';
import Checkbox from '../../atoms/button/Checkbox';
import { ImagePack as ImagePackBuilder, getUserImagePack } from '../../organisms/emoji-board/custom-emoji';

function getUsage(usage) {
  if (usage.includes('emoticon') && usage.includes('sticker')) return 'both';
  if (usage.includes('emoticon')) return 'emoticon';
  if (usage.includes('sticker')) return 'sticker';

  return 'both';
}

function isGlobalPack(roomId, stateKey) {
  const mx = initMatrix.matrixClient;
  const globalContent = mx.getAccountData('im.ponies.emote_rooms')?.getContent();
  if (typeof globalContent !== 'object') return false;

  const { rooms } = globalContent;
  if (typeof rooms !== 'object') return false;

  return rooms[roomId]?.[stateKey] !== undefined;
}

function ImagePack({ roomId, stateKey }) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const [viewMore, setViewMore] = useState(false);

  const packEvent = roomId
    ? room.currentState.getStateEvents('im.ponies.room_emotes', stateKey)
    : mx.getAccountData('im.ponies.user_emotes');
  const pack = roomId
    ? ImagePackBuilder.parsePack(packEvent.getId(), packEvent.getContent(), room)
    : getUserImagePack(mx);

  return (
    <div className="image-pack">
      <ImagePackProfile
        avatarUrl={mx.mxcUrlToHttp(pack.avatarUrl ?? pack.getEmojis()[0].mxc)}
        displayName={pack.displayName}
        attribution={pack.attribution}
        usage={getUsage(pack.usage)}
        onUsageChange={(newUsage) => console.log(newUsage)}
        onEdit={() => false}
      />
      <div>
        <div className="image-pack__header">
          <Text variant="b3">Image</Text>
          <Text variant="b3">Shortcode</Text>
          <Text variant="b3">Usage</Text>
        </div>
        {([...pack.images].slice(0, viewMore ? pack.images.size : 2)).map(([shortcode, image]) => (
          <ImagePackItem
            key={shortcode}
            url={mx.mxcUrlToHttp(image.mxc)}
            shortcode={shortcode}
            usage={getUsage(image.usage)}
            onUsageChange={() => false}
            onDelete={() => false}
            onRename={() => false}
          />
        ))}
      </div>
      {pack.images.size > 2 && (
        <div className="image-pack__footer">
          <Button onClick={() => setViewMore(!viewMore)}>
            {
              viewMore
                ? 'View less'
                : `View ${pack.images.size - 2} more`
            }
          </Button>
        </div>
      )}
      { roomId && (
        <div className="image-pack__global">
          <Checkbox variant="positive" isActive={isGlobalPack(roomId, stateKey)} />
          <div>
            <Text variant="b2">Use globally</Text>
            <Text variant="b3">Add this pack to your account to use in all rooms.</Text>
          </div>
        </div>
      )}
    </div>
  );
}

ImagePack.defaultProps = {
  roomId: null,
  stateKey: null,
};

ImagePack.propTypes = {
  roomId: PropTypes.string,
  stateKey: PropTypes.string,
};

export default ImagePack;
