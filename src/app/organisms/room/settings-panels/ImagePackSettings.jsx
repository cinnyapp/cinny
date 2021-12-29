import React from 'react';
import PropTypes from 'prop-types';

import { twemojify } from '../../../../util/twemojify';
import initMatrix from '../../../../client/initMatrix';
import { getPacksInRoom } from '../../emoji-board/custom-emoji';
import colorMXID from '../../../../util/colorMXID';

import Avatar from '../../../atoms/avatar/Avatar';
import Text from '../../../atoms/text/Text';
import ScrollView from '../../../atoms/scroll/ScrollView';
import SegmentedControls from '../../../atoms/segmented-controls/SegmentedControls';

import './ImagePackSettings.scss';

function ImagePackSettings({ roomId }) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const packs = getPacksInRoom(room);

  function getUsageIndex(usage) {
    if (usage.length === 1) {
      return usage[0] === 'emoticon' ? 0 : 1;
    }
    return 2;
  }

  return (
    <ScrollView horizontal vertical={false} invisible>
      <div className="pack-settings">
        {
          packs.map((pack) => (
            <div className="room-settings__card pack-settings__pack" key={pack.event.event_id}>
              <div className="pack-settings__pack-header">
                <Avatar
                  imageSrc={pack.avatar ? mx.mxcUrlToHttp(pack.avatar, 80, 80, 'crop') : null}
                  text={pack.displayName}
                  bgColor={colorMXID(roomId)}
                  size="large"
                />
                <Text variant="h2" weight="medium" primary>{twemojify(pack.displayName)}</Text>
                {pack.attribution && (<Text variant="b3">{twemojify(pack.attribution)}</Text>)}
              </div>
              <ScrollView autohide>
                <div className="pack-settings__image-list">
                  {
                    pack.images.map((image) => (
                      <div className="pack-settings__image-row" key={image.shortcode}>
                        <img
                          src={mx.mxcUrlToHttp(image.mxc, 32, 32, 'scale')}
                          alt={image.body}
                        />
                        <Text variant="b1">
                          :
                          {image.shortcode}
                          :
                        </Text>
                        <SegmentedControls
                          selected={getUsageIndex(image.usage)}
                          disabled
                          onSelect={() => {}}
                          segments={[
                            { text: 'Emoji' },
                            { text: 'Sticker' },
                            { text: 'Both' },
                          ]}
                        />
                      </div>
                    ))
                  }
                </div>
              </ScrollView>
            </div>
          ))
        }
      </div>
    </ScrollView>
  );
}

ImagePackSettings.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default ImagePackSettings;
