/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './EmojiBoard.scss';

import parse from 'html-react-parser';
import twemoji from 'twemoji';
import { emojiGroups, emojis } from './emoji';
import { getRelevantPacks } from './custom-emoji';
import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import AsyncSearch from '../../../util/AsyncSearch';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import IconButton from '../../atoms/button/IconButton';
import Input from '../../atoms/input/Input';
import ScrollView from '../../atoms/scroll/ScrollView';

import SearchIC from '../../../../public/res/ic/outlined/search.svg';
import EmojiIC from '../../../../public/res/ic/outlined/emoji.svg';
import DogIC from '../../../../public/res/ic/outlined/dog.svg';
import CupIC from '../../../../public/res/ic/outlined/cup.svg';
import BallIC from '../../../../public/res/ic/outlined/ball.svg';
import PhotoIC from '../../../../public/res/ic/outlined/photo.svg';
import BulbIC from '../../../../public/res/ic/outlined/bulb.svg';
import PeaceIC from '../../../../public/res/ic/outlined/peace.svg';
import FlagIC from '../../../../public/res/ic/outlined/flag.svg';

const EmojiGroup = React.memo(({ name, groupEmojis }) => {
  function getEmojiBoard() {
    const emojiBoard = [];
    const ROW_EMOJIS_COUNT = 7;
    const totalEmojis = groupEmojis.length;

    for (let r = 0; r < totalEmojis; r += ROW_EMOJIS_COUNT) {
      const emojiRow = [];
      for (let c = r; c < r + ROW_EMOJIS_COUNT; c += 1) {
        const emojiIndex = c;
        if (emojiIndex >= totalEmojis) break;
        const emoji = groupEmojis[emojiIndex];
        emojiRow.push(
          <span key={emojiIndex}>
            {
              emoji.hexcode
                // This is a unicode emoji, and should be rendered with twemoji
                ? parse(twemoji.parse(
                  emoji.unicode,
                  {
                    attributes: () => ({
                      unicode: emoji.unicode,
                      shortcodes: emoji.shortcodes?.toString(),
                      hexcode: emoji.hexcode,
                    }),
                  },
                ))
                // This is a custom emoji, and should be render as an mxc
                : (
                  <img
                    className="emoji"
                    draggable="false"
                    alt={emoji.shortcode}
                    unicode={`:${emoji.shortcode}:`}
                    shortcodes={emoji.shortcode}
                    src={initMatrix.matrixClient.mxcUrlToHttp(emoji.mxc)}
                    data-mx-emoticon
                  />
                )
            }
          </span>,
        );
      }
      emojiBoard.push(<div key={r} className="emoji-row">{emojiRow}</div>);
    }
    return emojiBoard;
  }

  return (
    <div className="emoji-group">
      <Text className="emoji-group__header" variant="b2" weight="bold">{name}</Text>
      {groupEmojis.length !== 0 && <div className="emoji-set">{getEmojiBoard()}</div>}
    </div>
  );
});

EmojiGroup.propTypes = {
  name: PropTypes.string.isRequired,
  groupEmojis: PropTypes.arrayOf(PropTypes.shape({
    length: PropTypes.number,
    unicode: PropTypes.string,
    hexcode: PropTypes.string,
    mxc: PropTypes.string,
    shortcode: PropTypes.string,
    shortcodes: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string),
    ]),
  })).isRequired,
};

const asyncSearch = new AsyncSearch();
asyncSearch.setup(emojis, { keys: ['shortcode'], isContain: true, limit: 40 });
function SearchedEmoji() {
  const [searchedEmojis, setSearchedEmojis] = useState(null);

  function handleSearchEmoji(resultEmojis, term) {
    if (term === '' || resultEmojis.length === 0) {
      if (term === '') setSearchedEmojis(null);
      else setSearchedEmojis({ emojis: [] });
      return;
    }
    setSearchedEmojis({ emojis: resultEmojis });
  }

  useEffect(() => {
    asyncSearch.on(asyncSearch.RESULT_SENT, handleSearchEmoji);
    return () => {
      asyncSearch.removeListener(asyncSearch.RESULT_SENT, handleSearchEmoji);
    };
  }, []);

  if (searchedEmojis === null) return false;

  return <EmojiGroup key="-1" name={searchedEmojis.emojis.length === 0 ? 'No search result found' : 'Search results'} groupEmojis={searchedEmojis.emojis} />;
}

function EmojiBoard({ onSelect }) {
  const searchRef = useRef(null);
  const scrollEmojisRef = useRef(null);
  const emojiInfo = useRef(null);

  function isTargetNotEmoji(target) {
    return target.classList.contains('emoji') === false;
  }
  function getEmojiDataFromTarget(target) {
    const unicode = target.getAttribute('unicode');
    const hexcode = target.getAttribute('hexcode');
    let shortcodes = target.getAttribute('shortcodes');
    if (typeof shortcodes === 'undefined') shortcodes = undefined;
    else shortcodes = shortcodes.split(',');
    return { unicode, hexcode, shortcodes };
  }

  function selectEmoji(e) {
    if (isTargetNotEmoji(e.target)) return;

    const emoji = e.target;
    onSelect(getEmojiDataFromTarget(emoji));
  }

  function setEmojiInfo(emoji) {
    const infoEmoji = emojiInfo.current.firstElementChild.firstElementChild;
    const infoShortcode = emojiInfo.current.lastElementChild;

    infoEmoji.src = emoji.src;
    infoEmoji.alt = emoji.unicode;
    infoShortcode.textContent = `:${emoji.shortcode}:`;
  }

  function hoverEmoji(e) {
    if (isTargetNotEmoji(e.target)) return;

    const emoji = e.target;
    const { shortcodes, unicode } = getEmojiDataFromTarget(emoji);
    const { src } = e.target;

    if (typeof shortcodes === 'undefined') {
      searchRef.current.placeholder = 'Search';
      setEmojiInfo({
        unicode: '🙂',
        shortcode: 'slight_smile',
        src: 'https://twemoji.maxcdn.com/v/13.1.0/72x72/1f642.png',
      });
      return;
    }
    if (searchRef.current.placeholder === shortcodes[0]) return;
    searchRef.current.setAttribute('placeholder', shortcodes[0]);
    setEmojiInfo({ shortcode: shortcodes[0], src, unicode });
  }

  function handleSearchChange(e) {
    const term = e.target.value;
    asyncSearch.search(term);
    scrollEmojisRef.current.scrollTop = 0;
  }

  const [availableEmojis, setAvailableEmojis] = useState([]);

  useEffect(() => {
    const updateAvailableEmoji = (selectedRoomId) => {
      if (!selectedRoomId) {
        setAvailableEmojis([]);
        return;
      }
      // Retrieve the packs for the new room
      // Remove packs that aren't marked as emoji packs
      // Remove packs without emojis
      const packs = getRelevantPacks(
        initMatrix.matrixClient.getRoom(selectedRoomId),
      )
        .filter((pack) => pack.usage.indexOf('emoticon') !== -1)
        .filter((pack) => pack.getEmojis().length !== 0);

      // Set an index for each pack so that we know where to jump when the user uses the nav
      for (let i = 0; i < packs.length; i += 1) {
        packs[i].packIndex = i;
      }

      setAvailableEmojis(packs);
    };

    navigation.on(cons.events.navigation.ROOM_SELECTED, updateAvailableEmoji);
    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, updateAvailableEmoji);
    };
  }, []);

  function openGroup(groupOrder) {
    let tabIndex = groupOrder;
    const $emojiContent = scrollEmojisRef.current.firstElementChild;
    const groupCount = $emojiContent.childElementCount;
    if (groupCount > emojiGroups.length) {
      tabIndex += groupCount - emojiGroups.length - availableEmojis.length;
    }
    $emojiContent.children[tabIndex].scrollIntoView();
  }

  return (
    <div id="emoji-board" className="emoji-board">
      <div className="emoji-board__content">
        <div className="emoji-board__content__search">
          <RawIcon size="small" src={SearchIC} />
          <Input onChange={handleSearchChange} forwardRef={searchRef} placeholder="Search" />
        </div>
        <div className="emoji-board__content__emojis">
          <ScrollView ref={scrollEmojisRef} autoHide>
            <div onMouseMove={hoverEmoji} onClick={selectEmoji}>
              <SearchedEmoji />
              {
                availableEmojis.map((pack) => (
                  <EmojiGroup
                    name={pack.displayName}
                    key={pack.packIndex}
                    groupEmojis={pack.getEmojis()}
                    className="custom-emoji-group"
                  />
                ))
              }
              {
                emojiGroups.map((group) => (
                  <EmojiGroup key={group.name} name={group.name} groupEmojis={group.emojis} />
                ))
              }
            </div>
          </ScrollView>
        </div>
        <div ref={emojiInfo} className="emoji-board__content__info">
          <div>{ parse(twemoji.parse('🙂')) }</div>
          <Text>:slight_smile:</Text>
        </div>
      </div>
      <ScrollView invisible>
        <div className="emoji-board__nav">
          <div className="emoji-board__nav-custom">
            {
              availableEmojis.map((pack) => {
                const src = initMatrix.matrixClient.mxcUrlToHttp(pack.avatar ?? pack.images[0].mxc);
                return (
                  <IconButton
                    onClick={() => openGroup(pack.packIndex)}
                    src={src}
                    key={pack.packIndex}
                    tooltip={pack.displayName}
                    tooltipPlacement="right"
                    isImage
                  />
                );
              })
            }
          </div>
          <div className="emoji-board__nav-twemoji">
            {
              [
                [0, EmojiIC, 'Smilies'],
                [1, DogIC, 'Animals'],
                [2, CupIC, 'Food'],
                [3, BallIC, 'Activities'],
                [4, PhotoIC, 'Travel'],
                [5, BulbIC, 'Objects'],
                [6, PeaceIC, 'Symbols'],
                [7, FlagIC, 'Flags'],
              ].map(([indx, ico, name]) => (
                <IconButton
                  onClick={() => openGroup(availableEmojis.length + indx)}
                  key={indx}
                  src={ico}
                  tooltip={name}
                  tooltipPlacement="right"
                />
              ))
            }
          </div>
        </div>
      </ScrollView>
    </div>
  );
}

EmojiBoard.propTypes = {
  onSelect: PropTypes.func.isRequired,
};

export default EmojiBoard;
