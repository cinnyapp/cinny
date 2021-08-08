/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './EmojiBoard.scss';

import EventEmitter from 'events';

import parse from 'html-react-parser';
import twemoji from 'twemoji';
import { emojiGroups, searchEmoji } from './emoji';

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

const viewEvent = new EventEmitter();

function EmojiGroup({ name, emojis }) {
  function getEmojiBoard() {
    const ROW_EMOJIS_COUNT = 7;
    const emojiRows = [];
    const totalEmojis = emojis.length;

    for (let r = 0; r < totalEmojis; r += ROW_EMOJIS_COUNT) {
      const emojiRow = [];
      for (let c = r; c < r + ROW_EMOJIS_COUNT; c += 1) {
        const emojiIndex = r + c;
        if (emojiIndex >= totalEmojis) break;
        const emoji = emojis[emojiIndex];
        emojiRow.push(
          <span key={emojiIndex}>
            {
              parse(twemoji.parse(
                emoji.unicode,
                {
                  attributes: () => ({
                    unicode: emoji.unicode,
                    shortcodes: emoji.shortcodes?.toString(),
                  }),
                },
              ))
            }
          </span>,
        );
      }
      emojiRows.push(<div key={r} className="emoji-row">{emojiRow}</div>);
    }
    return emojiRows;
  }

  return (
    <div className="emoji-group">
      <Text className="emoji-group__header" variant="b2">{name}</Text>
      <div className="emoji-set">{getEmojiBoard()}</div>
    </div>
  );
}
EmojiGroup.propTypes = {
  name: PropTypes.string.isRequired,
  emojis: PropTypes.arrayOf(PropTypes.shape({
    length: PropTypes.number,
    unicode: PropTypes.string,
    shortcodes: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string),
    ]),
  })).isRequired,
};

function SearchedEmoji() {
  const [searchedEmojis, setSearchedEmojis] = useState([]);

  function handleSearchEmoji(term) {
    if (term.trim() === '') {
      setSearchedEmojis([]);
      return;
    }
    setSearchedEmojis(searchEmoji(term).map((finding) => finding.item));
  }

  useEffect(() => {
    viewEvent.on('search-emoji', handleSearchEmoji);
    return () => {
      viewEvent.removeListener('search-emoji', handleSearchEmoji);
    };
  }, []);

  return searchedEmojis.length !== 0 && <EmojiGroup key="-1" name="Search results" emojis={searchedEmojis} />;
}

function EmojiBoard({ onSelect }) {
  const searchRef = useRef(null);
  const scrollEmojisRef = useRef(null);

  function isTargetNotEmoji(target) {
    return target.classList.contains('emoji') === false;
  }
  function getEmojiDataFromTarget(target) {
    const unicode = target.getAttribute('unicode');
    let shortcodes = target.getAttribute('shortcodes');
    if (typeof shortcodes === 'undefined') shortcodes = undefined;
    else shortcodes = shortcodes.split(',');
    return { unicode, shortcodes };
  }

  function selectEmoji(e) {
    if (isTargetNotEmoji(e.target)) return;

    const emoji = e.target;
    onSelect(getEmojiDataFromTarget(emoji));
  }

  function hoverEmoji(e) {
    if (isTargetNotEmoji(e.target)) return;

    const emoji = e.target;
    const { shortcodes } = getEmojiDataFromTarget(emoji);

    if (typeof shortcodes === 'undefined') {
      searchRef.current.placeholder = 'Search';
      return;
    }
    if (searchRef.current.placeholder === shortcodes[0]) return;
    searchRef.current.setAttribute('placeholder', `:${shortcodes[0]}:`);
  }

  function handleSearchChange(e) {
    const term = e.target.value;
    setTimeout(() => {
      if (e.target.value !== term) return;
      viewEvent.emit('search-emoji', term);
      scrollEmojisRef.current.scrollTop = 0;
    }, 500);
  }

  function openGroup(groupOrder) {
    let tabIndex = groupOrder;
    const $emojiContent = scrollEmojisRef.current.firstElementChild;
    const groupCount = $emojiContent.childElementCount;
    if (groupCount > emojiGroups.length) tabIndex += groupCount - emojiGroups.length;
    $emojiContent.children[tabIndex].scrollIntoView();
  }

  return (
    <div id="emoji-board" className="emoji-board">
      <div className="emoji-board__content">
        <div className="emoji-board__emojis">
          <ScrollView ref={scrollEmojisRef} autoHide>
            <div onMouseMove={hoverEmoji} onClick={selectEmoji}>
              <SearchedEmoji />
              {
                emojiGroups.map((group) => (
                  <EmojiGroup key={group.name} name={group.name} emojis={group.emojis} />
                ))
              }
            </div>
          </ScrollView>
        </div>
        <div className="emoji-board__search">
          <RawIcon size="small" src={SearchIC} />
          <Input onChange={handleSearchChange} forwardRef={searchRef} placeholder="Search" />
        </div>
      </div>
      <div className="emoji-board__nav">
        <IconButton onClick={() => openGroup(0)} src={EmojiIC} tooltip="Smileys" tooltipPlacement="right" />
        <IconButton onClick={() => openGroup(1)} src={DogIC} tooltip="Animals" tooltipPlacement="right" />
        <IconButton onClick={() => openGroup(2)} src={CupIC} tooltip="Food" tooltipPlacement="right" />
        <IconButton onClick={() => openGroup(3)} src={BallIC} tooltip="Activity" tooltipPlacement="right" />
        <IconButton onClick={() => openGroup(4)} src={PhotoIC} tooltip="Travel" tooltipPlacement="right" />
        <IconButton onClick={() => openGroup(5)} src={BulbIC} tooltip="Objects" tooltipPlacement="right" />
        <IconButton onClick={() => openGroup(6)} src={PeaceIC} tooltip="Symbols" tooltipPlacement="right" />
        <IconButton onClick={() => openGroup(7)} src={FlagIC} tooltip="Flags" tooltipPlacement="right" />
      </div>
    </div>
  );
}

EmojiBoard.propTypes = {
  onSelect: PropTypes.func.isRequired,
};

export default EmojiBoard;
