import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './ImagePack.scss';

import initMatrix from '../../../client/initMatrix';

import Button from '../../atoms/button/Button';
import Text from '../../atoms/text/Text';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import ImagePackProfile from './ImagePackProfile';
import ImagePackItem from './ImagePackItem';
import { ImagePack as ImagePackBuilder, getUserImagePack } from '../../organisms/emoji-board/custom-emoji';

function getUsage(usage) {
  if (usage.includes('emoticon') && usage.includes('sticker')) return 'both';
  if (usage.includes('emoticon')) return 'emoticon';
  if (usage.includes('sticker')) return 'sticker';

  return 'both';
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
      <MenuHeader>{pack.displayName}</MenuHeader>
      <ImagePackProfile
        avatarUrl={mx.mxcUrlToHttp(pack.avatarUrl ?? pack.getEmojis()[0].mxc)}
        displayName={pack.displayName}
        attribution={pack.attribution}
        usage={getUsage(pack.usage)}
        onUsage={() => false}
        onEdit={() => false}
      />
      <div className="image-pack__header">
        <Text variant="b3">Image</Text>
        <Text variant="b3">Shortcode</Text>
        <Text variant="b3">Usage</Text>
      </div>
      <div>
        {([...pack.images].slice(0, viewMore ? pack.images.size : 2)).map(([shortcode, image]) => (
          <ImagePackItem
            key={shortcode}
            url={mx.mxcUrlToHttp(image.mxc)}
            shortcode={shortcode}
            usage={getUsage(image.usage)}
          />
        ))}
      </div>
      <div className="image-pack__footer">
        {pack.images.size > 2 && (
          <Button onClick={() => setViewMore(!viewMore)}>
            {
              viewMore
                ? 'View less'
                : `View ${pack.images.size - 2} more`
            }
          </Button>
        )}
      </div>
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
