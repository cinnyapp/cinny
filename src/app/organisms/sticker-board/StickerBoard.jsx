/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React from 'react';
import PropTypes from 'prop-types';
import './StickerBoard.scss';

import initMatrix from '../../../client/initMatrix';
import { getRelevantPacks } from '../emoji-board/custom-emoji';

import Text from '../../atoms/text/Text';
import ScrollView from '../../atoms/scroll/ScrollView';

function StickerBoard({ roomId, onSelect }) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);

  const parentIds = initMatrix.roomList.getAllParentSpaces(room.roomId);
  const parentRooms = [...parentIds].map((id) => mx.getRoom(id));

  const packs = getRelevantPacks(
    mx,
    [room, ...parentRooms],
  ).filter((pack) => pack.getStickers().length !== 0);

  function isTargetNotSticker(target) {
    return target.classList.contains('sticker-board__sticker') === false;
  }
  function getStickerData(target) {
    const mxc = target.getAttribute('data-mx-sticker');
    const body = target.getAttribute('title');
    const httpUrl = target.getAttribute('src');
    return { mxc, body, httpUrl };
  }
  const handleOnSelect = (e) => {
    if (isTargetNotSticker(e.target)) return;

    const stickerData = getStickerData(e.target);
    onSelect(stickerData);
  };

  const renderPack = (pack) => (
    <div className="sticker-board__pack" key={pack.id}>
      <Text className="sticker-board__pack-header" variant="b2" weight="bold">{pack.displayName ?? 'Unknown'}</Text>
      <div className="sticker-board__pack-items">
        {pack.getStickers().map((sticker) => (
          <img
            key={sticker.shortcode}
            className="sticker-board__sticker"
            src={mx.mxcUrlToHttp(sticker.mxc)}
            alt={sticker.shortcode}
            title={sticker.body ?? sticker.shortcode}
            data-mx-sticker={sticker.mxc}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="sticker-board">
      <div className="sticker-board__container">
        <ScrollView autoHide>
          <div
            onClick={handleOnSelect}
            className="sticker-board__content"
          >
            {
              packs.length > 0
                ? packs.map(renderPack)
                : (
                  <div className="sticker-board__empty">
                    <Text>There is no sticker pack.</Text>
                  </div>
                )
            }
          </div>
        </ScrollView>
      </div>
      <div />
    </div>
  );
}
StickerBoard.propTypes = {
  roomId: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default StickerBoard;
