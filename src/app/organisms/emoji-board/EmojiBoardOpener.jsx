import React, { useEffect, useRef } from 'react';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import ContextMenu from '../../atoms/context-menu/ContextMenu';
import EmojiBoard from './EmojiBoard';

let requestCallback = null;
let isEmojiBoardVisible = false;
function EmojiBoardOpener() {
  const openerRef = useRef(null);

  function openEmojiBoard(cords, requestEmojiCallback) {
    if (requestCallback !== null || isEmojiBoardVisible) {
      requestCallback = null;
      if (cords.detail === 0) openerRef.current.click();
      return;
    }

    const x = typeof cords.x === 'string' ? cords.x : `${cords.x}px`;
    const y = typeof cords.y === 'string' ? cords.y : `${cords.y}px`;

    openerRef.current.style.left = cords.isReverse ? 'unset' : x;
    openerRef.current.style.top = cords.isReverse ? 'unset' : y;
    openerRef.current.style.right = cords.isReverse ? x : 'unset';
    openerRef.current.style.bottom = cords.isReverse ? y : 'unset';
    requestCallback = requestEmojiCallback;
    openerRef.current.click();
  }

  function afterEmojiBoardToggle(isVisible) {
    isEmojiBoardVisible = isVisible;
    if (!isVisible) {
      setTimeout(() => {
        if (!isEmojiBoardVisible) requestCallback = null;
      }, 500);
    }
  }

  function addEmoji(emoji) {
    requestCallback(emoji);
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.EMOJIBOARD_OPENED, openEmojiBoard);
    return () => {
      navigation.removeListener(cons.events.navigation.EMOJIBOARD_OPENED, openEmojiBoard);
    };
  }, []);

  return (
    <ContextMenu
      content={(
        <EmojiBoard onSelect={addEmoji} />
      )}
      afterToggle={afterEmojiBoardToggle}
      render={(toggleMenu) => (
        <input
          ref={openerRef}
          onClick={toggleMenu}
          type="button"
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: 'transparent',
            position: 'absolute',
            top: 0,
            left: 0,
            padding: 0,
            border: 'none',
            visibility: 'hidden',
          }}
        />
      )}
    />
  );
}

export default EmojiBoardOpener;
