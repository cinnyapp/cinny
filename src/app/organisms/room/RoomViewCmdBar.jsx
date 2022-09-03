/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomViewCmdBar.scss';
import parse from 'html-react-parser';
import twemoji from 'twemoji';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { getEmojiForCompletion } from '../emoji-board/custom-emoji';
import AsyncSearch from '../../../util/AsyncSearch';

import Text from '../../atoms/text/Text';
import ScrollView from '../../atoms/scroll/ScrollView';
import FollowingMembers from '../../molecules/following-members/FollowingMembers';
import { addRecentEmoji, getRecentEmojis } from '../emoji-board/recent';
import commands from './commands';

function CmdItem({ onClick, children }) {
  return (
    <button className="cmd-item" onClick={onClick} type="button">
      {children}
    </button>
  );
}
CmdItem.propTypes = {
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

function renderSuggestions({ prefix, option, suggestions }, fireCmd) {
  function renderCmdSuggestions(cmdPrefix, cmds) {
    const cmdOptString = (typeof option === 'string') ? `/${option}` : '/?';
    return cmds.map((cmd) => (
      <CmdItem
        key={cmd}
        onClick={() => {
          fireCmd({
            prefix: cmdPrefix,
            option,
            result: commands[cmd],
          });
        }}
      >
        <Text variant="b2">{`${cmd}${cmd.isOptions ? cmdOptString : ''}`}</Text>
      </CmdItem>
    ));
  }

  function renderEmojiSuggestion(emPrefix, emos) {
    const mx = initMatrix.matrixClient;

    // Renders a small Twemoji
    function renderTwemoji(emoji) {
      return parse(twemoji.parse(
        emoji.unicode,
        {
          attributes: () => ({
            unicode: emoji.unicode,
            shortcodes: emoji.shortcodes?.toString(),
          }),
        },
      ));
    }

    // Render a custom emoji
    function renderCustomEmoji(emoji) {
      return (
        <img
          className="emoji"
          src={mx.mxcUrlToHttp(emoji.mxc)}
          data-mx-emoticon=""
          alt={`:${emoji.shortcode}:`}
        />
      );
    }

    // Dynamically render either a custom emoji or twemoji based on what the input is
    function renderEmoji(emoji) {
      if (emoji.mxc) {
        return renderCustomEmoji(emoji);
      }
      return renderTwemoji(emoji);
    }

    return emos.map((emoji) => (
      <CmdItem
        key={emoji.shortcode}
        onClick={() => fireCmd({
          prefix: emPrefix,
          result: emoji,
        })}
      >
        <Text variant="b1">{renderEmoji(emoji)}</Text>
        <Text variant="b2">{`:${emoji.shortcode}:`}</Text>
      </CmdItem>
    ));
  }

  function renderNameSuggestion(namePrefix, members) {
    return members.map((member) => (
      <CmdItem
        key={member.userId}
        onClick={() => {
          fireCmd({
            prefix: namePrefix,
            result: member,
          });
        }}
      >
        <Text variant="b2">{twemojify(member.name)}</Text>
      </CmdItem>
    ));
  }

  const cmd = {
    '/': (cmds) => renderCmdSuggestions(prefix, cmds),
    ':': (emos) => renderEmojiSuggestion(prefix, emos),
    '@': (members) => renderNameSuggestion(prefix, members),
  };
  return cmd[prefix]?.(suggestions);
}

const asyncSearch = new AsyncSearch();
let cmdPrefix;
let cmdOption;
function RoomViewCmdBar({ roomId, roomTimeline, viewEvent }) {
  const [cmd, setCmd] = useState(null);

  function displaySuggestions(suggestions) {
    if (suggestions.length === 0) {
      setCmd({ prefix: cmd?.prefix || cmdPrefix, error: 'No suggestion found.' });
      viewEvent.emit('cmd_error');
      return;
    }
    setCmd({ prefix: cmd?.prefix || cmdPrefix, suggestions, option: cmdOption });
  }

  function processCmd(prefix, slug) {
    let searchTerm = slug;
    cmdOption = undefined;
    cmdPrefix = prefix;
    if (prefix === '/') {
      const cmdSlugParts = slug.split('/');
      [searchTerm, cmdOption] = cmdSlugParts;
    }
    if (prefix === ':') {
      if (searchTerm.length <= 3) {
        if (searchTerm.match(/^[-]?(\))$/)) searchTerm = 'smile';
        else if (searchTerm.match(/^[-]?(s|S)$/)) searchTerm = 'confused';
        else if (searchTerm.match(/^[-]?(o|O|0)$/)) searchTerm = 'astonished';
        else if (searchTerm.match(/^[-]?(\|)$/)) searchTerm = 'neutral_face';
        else if (searchTerm.match(/^[-]?(d|D)$/)) searchTerm = 'grin';
        else if (searchTerm.match(/^[-]?(\/)$/)) searchTerm = 'frown';
        else if (searchTerm.match(/^[-]?(p|P)$/)) searchTerm = 'stuck_out_tongue';
        else if (searchTerm.match(/^'[-]?(\()$/)) searchTerm = 'cry';
        else if (searchTerm.match(/^[-]?(x|X)$/)) searchTerm = 'dizzy_face';
        else if (searchTerm.match(/^[-]?(\()$/)) searchTerm = 'pleading_face';
        else if (searchTerm.match(/^[-]?(\$)$/)) searchTerm = 'money';
        else if (searchTerm.match(/^(<3)$/)) searchTerm = 'heart';
        else if (searchTerm.match(/^(c|ca|cat)$/)) searchTerm = '_cat';
      }
    }

    asyncSearch.search(searchTerm);
  }
  function activateCmd(prefix) {
    cmdPrefix = prefix;
    cmdPrefix = undefined;

    const mx = initMatrix.matrixClient;
    const setupSearch = {
      '/': () => {
        asyncSearch.setup(Object.keys(commands), { isContain: true });
        setCmd({ prefix, suggestions: Object.keys(commands) });
      },
      ':': () => {
        const parentIds = initMatrix.roomList.getAllParentSpaces(roomId);
        const parentRooms = [...parentIds].map((id) => mx.getRoom(id));
        const emojis = getEmojiForCompletion(mx, [mx.getRoom(roomId), ...parentRooms]);
        const recentEmoji = getRecentEmojis(20);
        asyncSearch.setup(emojis, { keys: ['shortcode'], isContain: true, limit: 20 });
        setCmd({
          prefix,
          suggestions: recentEmoji.length > 0 ? recentEmoji : emojis.slice(26, 46),
        });
      },
      '@': () => {
        const members = mx.getRoom(roomId).getJoinedMembers().map((member) => ({
          name: member.name,
          userId: member.userId.slice(1),
        }));
        asyncSearch.setup(members, { keys: ['name', 'userId'], limit: 20 });
        const endIndex = members.length > 20 ? 20 : members.length;
        setCmd({ prefix, suggestions: members.slice(0, endIndex) });
      },
    };
    setupSearch[prefix]?.();
  }
  function deactivateCmd() {
    setCmd(null);
    cmdOption = undefined;
    cmdPrefix = undefined;
  }
  function fireCmd(myCmd) {
    if (myCmd.prefix === '/') {
      viewEvent.emit('cmd_fired', {
        replace: `/${myCmd.result.name}`,
      });
    }
    if (myCmd.prefix === ':') {
      if (!myCmd.result.mxc) addRecentEmoji(myCmd.result.unicode);
      viewEvent.emit('cmd_fired', {
        replace: myCmd.result.mxc ? `:${myCmd.result.shortcode}: ` : myCmd.result.unicode,
      });
    }
    if (myCmd.prefix === '@') {
      viewEvent.emit('cmd_fired', {
        replace: `@${myCmd.result.userId}`,
      });
    }
    deactivateCmd();
  }

  function listenKeyboard(event) {
    const { activeElement } = document;
    const lastCmdItem = document.activeElement.parentNode.lastElementChild;
    if (event.key === 'Escape') {
      if (activeElement.className !== 'cmd-item') return;
      viewEvent.emit('focus_msg_input');
    }
    if (event.key === 'Tab') {
      if (lastCmdItem.className !== 'cmd-item') return;
      if (lastCmdItem !== activeElement) return;
      if (event.shiftKey) return;
      viewEvent.emit('focus_msg_input');
      event.preventDefault();
    }
  }

  useEffect(() => {
    viewEvent.on('cmd_activate', activateCmd);
    viewEvent.on('cmd_deactivate', deactivateCmd);
    return () => {
      deactivateCmd();
      viewEvent.removeListener('cmd_activate', activateCmd);
      viewEvent.removeListener('cmd_deactivate', deactivateCmd);
    };
  }, [roomId]);

  useEffect(() => {
    if (cmd !== null) document.body.addEventListener('keydown', listenKeyboard);
    viewEvent.on('cmd_process', processCmd);
    asyncSearch.on(asyncSearch.RESULT_SENT, displaySuggestions);
    return () => {
      if (cmd !== null) document.body.removeEventListener('keydown', listenKeyboard);

      viewEvent.removeListener('cmd_process', processCmd);
      asyncSearch.removeListener(asyncSearch.RESULT_SENT, displaySuggestions);
    };
  }, [cmd]);

  const isError = typeof cmd?.error === 'string';
  if (cmd === null || isError) {
    return (
      <div className="cmd-bar">
        <FollowingMembers roomTimeline={roomTimeline} />
      </div>
    );
  }

  return (
    <div className="cmd-bar">
      <div className="cmd-bar__info">
        <Text variant="b3">TAB</Text>
      </div>
      <div className="cmd-bar__content">
        <ScrollView horizontal vertical={false} invisible>
          <div className="cmd-bar__content-suggestions">
            { renderSuggestions(cmd, fireCmd) }
          </div>
        </ScrollView>
      </div>
    </div>
  );
}
RoomViewCmdBar.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

export default RoomViewCmdBar;
