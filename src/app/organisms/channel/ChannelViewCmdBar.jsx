/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ChannelViewCmdBar.scss';
import Fuse from 'fuse.js';
import parse from 'html-react-parser';
import twemoji from 'twemoji';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { toggleMarkdown } from '../../../client/action/settings';
import * as roomActions from '../../../client/action/room';
import {
  selectRoom,
  openCreateChannel,
  openPublicChannels,
  openInviteUser,
} from '../../../client/action/navigation';
import { searchEmoji } from '../emoji-board/emoji';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import ContextMenu, { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import ScrollView from '../../atoms/scroll/ScrollView';
import SettingTile from '../../molecules/setting-tile/SettingTile';
import TimelineChange from '../../molecules/message/TimelineChange';

import CmdIC from '../../../../public/res/ic/outlined/cmd.svg';

import { getUsersActionJsx } from './common';

const commands = [{
  name: 'markdown',
  description: 'Toggle markdown for messages.',
  exe: () => toggleMarkdown(),
}, {
  name: 'startDM',
  isOptions: true,
  description: 'Start direct message with user. Example: /startDM/@johndoe.matrix.org',
  exe: (roomId, searchTerm) => openInviteUser(undefined, searchTerm),
}, {
  name: 'createChannel',
  description: 'Create new channel',
  exe: () => openCreateChannel(),
}, {
  name: 'join',
  isOptions: true,
  description: 'Join channel with alias. Example: /join/#cinny:matrix.org',
  exe: (roomId, searchTerm) => openPublicChannels(searchTerm),
}, {
  name: 'leave',
  description: 'Leave current channel',
  exe: (roomId) => roomActions.leave(roomId),
}, {
  name: 'invite',
  isOptions: true,
  description: 'Invite user to room. Example: /invite/@johndoe:matrix.org',
  exe: (roomId, searchTerm) => openInviteUser(roomId, searchTerm),
}];

function CmdHelp() {
  return (
    <ContextMenu
      placement="top"
      content={(
        <>
          <MenuHeader>General command</MenuHeader>
          <Text variant="b2">/command_name</Text>
          <MenuHeader>Go-to commands</MenuHeader>
          <Text variant="b2">{'>*space_name'}</Text>
          <Text variant="b2">{'>#channel_name'}</Text>
          <Text variant="b2">{'>@people_name'}</Text>
          <MenuHeader>Autofill command</MenuHeader>
          <Text variant="b2">:emoji_name:</Text>
        </>
      )}
      render={(toggleMenu) => (
        <IconButton
          src={CmdIC}
          size="extra-small"
          onClick={toggleMenu}
          tooltip="Commands"
        />
      )}
    />
  );
}

function ViewCmd() {
  function renderAllCmds() {
    return commands.map((command) => (
      <SettingTile
        key={command.name}
        title={command.name}
        content={(<Text variant="b3">{command.description}</Text>)}
      />
    ));
  }
  return (
    <ContextMenu
      maxWidth={250}
      placement="top"
      content={(
        <>
          <MenuHeader>General commands</MenuHeader>
          {renderAllCmds()}
        </>
      )}
      render={(toggleMenu) => (
        <span>
          <Button onClick={toggleMenu}><span className="text text-b3">View all</span></Button>
        </span>
      )}
    />
  );
}

function FollowingMembers({ roomId, roomTimeline, viewEvent }) {
  const [followingMembers, setFollowingMembers] = useState([]);
  const mx = initMatrix.matrixClient;

  function handleOnMessageSent() {
    setFollowingMembers([]);
  }

  function updateFollowingMembers() {
    const room = mx.getRoom(roomId);
    const { timeline } = room;
    const userIds = room.getUsersReadUpTo(timeline[timeline.length - 1]);
    const myUserId = mx.getUserId();
    setFollowingMembers(userIds.filter((userId) => userId !== myUserId));
  }

  useEffect(() => updateFollowingMembers(), [roomId]);

  useEffect(() => {
    roomTimeline.on(cons.events.roomTimeline.READ_RECEIPT, updateFollowingMembers);
    viewEvent.on('message_sent', handleOnMessageSent);
    return () => {
      roomTimeline.removeListener(cons.events.roomTimeline.READ_RECEIPT, updateFollowingMembers);
      viewEvent.removeListener('message_sent', handleOnMessageSent);
    };
  }, [roomTimeline]);

  return followingMembers.length !== 0 && (
    <TimelineChange
      variant="follow"
      content={getUsersActionJsx(followingMembers, 'following the conversation.')}
      time=""
    />
  );
}

FollowingMembers.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

function getCmdActivationMessage(prefix) {
  function genMessage(prime, secondary) {
    return (
      <>
        <span>{prime}</span>
        <span>{secondary}</span>
      </>
    );
  }
  const cmd = {
    '/': () => genMessage('General command mode activated. ', 'Type command name for suggestions.'),
    '>*': () => genMessage('Go-to command mode activated. ', 'Type space name for suggestions.'),
    '>#': () => genMessage('Go-to command mode activated. ', 'Type channel name for suggestions.'),
    '>@': () => genMessage('Go-to command mode activated. ', 'Type people name for suggestions.'),
    ':': () => genMessage('Emoji autofill command mode activated. ', 'Type emoji shortcut for suggestions.'),
  };
  return cmd[prefix]?.();
}

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

function searchInRoomIds(roomIds, term) {
  const rooms = roomIds.map((rId) => {
    const room = initMatrix.matrixClient.getRoom(rId);
    return {
      name: room.name,
      roomId: room.roomId,
    };
  });
  const fuse = new Fuse(rooms, {
    includeScore: true,
    keys: ['name'],
    threshold: '0.3',
  });
  return fuse.search(term);
}

function searchCommands(term) {
  const fuse = new Fuse(commands, {
    includeScore: true,
    keys: ['name'],
    threshold: '0.3',
  });
  return fuse.search(term);
}

let perfectMatchCmd = null;
function getCmdSuggestions({ prefix, slug }, fireCmd, viewEvent) {
  function getRoomsSuggestion(cmdPrefix, rooms, roomSlug) {
    const result = searchInRoomIds(rooms, roomSlug);
    if (result.length === 0) viewEvent.emit('cmd_error');
    perfectMatchCmd = {
      prefix: cmdPrefix,
      slug: roomSlug,
      result: result[0]?.item || null,
    };
    return result.map((finding) => (
      <CmdItem
        key={finding.item.roomId}
        onClick={() => {
          fireCmd({
            prefix: cmdPrefix,
            slug: roomSlug,
            result: finding.item,
          });
        }}
      >
        <Text variant="b2">{finding.item.name}</Text>
      </CmdItem>
    ));
  }

  function getGenCmdSuggestions(cmdPrefix, cmdSlug) {
    const cmdSlugParts = cmdSlug.split('/');
    const cmdSlugOption = cmdSlugParts[1];
    const result = searchCommands(cmdSlugParts[0]);
    if (result.length === 0) viewEvent.emit('cmd_error');
    perfectMatchCmd = {
      prefix: cmdPrefix,
      slug: cmdSlug,
      option: cmdSlugOption,
      result: result[0]?.item || null,
    };
    return result.map((finding) => {
      let option = '';
      if (finding.item.isOptions) {
        if (typeof cmdSlugOption === 'string') option = `/${cmdSlugOption}`;
        else option = '/?';
      }
      return (
        <CmdItem
          key={finding.item.name}
          onClick={() => {
            fireCmd({
              prefix: cmdPrefix,
              slug: cmdSlug,
              option: cmdSlugOption,
              result: finding.item,
            });
          }}
        >
          <Text variant="b2">{`${finding.item.name}${option}`}</Text>
        </CmdItem>
      );
    });
  }

  function getEmojiSuggestion(emPrefix, shortcutSlug) {
    const result = searchEmoji(shortcutSlug);
    if (result.length === 0) viewEvent.emit('cmd_error');
    perfectMatchCmd = {
      prefix: emPrefix,
      slug: shortcutSlug,
      result: result[0]?.item || null,
    };
    return result.map((finding) => (
      <CmdItem
        key={finding.item.hexcode}
        onClick={() => fireCmd({
          prefix: emPrefix,
          slug: shortcutSlug,
          result: finding.item,
        })}
      >
        {
          parse(twemoji.parse(
            finding.item.unicode,
            {
              attributes: () => ({
                unicode: finding.item.unicode,
                shortcodes: finding.item.shortcodes?.toString(),
              }),
            },
          ))
        }
      </CmdItem>
    ));
  }

  const { roomList } = initMatrix;
  const cmd = {
    '/': (command) => getGenCmdSuggestions(prefix, command),
    '>*': (space) => getRoomsSuggestion(prefix, [...roomList.spaces], space),
    '>#': (channel) => getRoomsSuggestion(prefix, [...roomList.rooms], channel),
    '>@': (people) => getRoomsSuggestion(prefix, [...roomList.directs], people),
    ':': (emojiShortcut) => getEmojiSuggestion(prefix, emojiShortcut),
  };
  return cmd[prefix]?.(slug);
}

function ChannelViewCmdBar({ roomId, roomTimeline, viewEvent }) {
  const [cmd, setCmd] = useState(null);

  function processCmd(prefix, slug) {
    setCmd({ prefix, slug });
  }
  function activateCmd(prefix) {
    setCmd({ prefix });
    perfectMatchCmd = null;
  }
  function deactivateCmd() {
    setCmd(null);
    perfectMatchCmd = null;
  }
  function fireCmd(myCmd) {
    if (myCmd.prefix.match(/^>[*#@]$/)) {
      selectRoom(myCmd.result.roomId);
      viewEvent.emit('cmd_fired');
    }
    if (myCmd.prefix === '/') {
      myCmd.result.exe(roomId, myCmd.option);
      viewEvent.emit('cmd_fired');
    }
    if (myCmd.prefix === ':') {
      viewEvent.emit('cmd_fired', {
        replace: myCmd.result.unicode,
      });
    }
    deactivateCmd();
  }
  function executeCmd() {
    if (perfectMatchCmd === null) return;
    if (perfectMatchCmd.result === null) return;
    fireCmd(perfectMatchCmd);
  }
  function errorCmd() {
    setCmd({ error: 'No suggestion found.' });
  }

  useEffect(() => {
    viewEvent.on('cmd_activate', activateCmd);
    viewEvent.on('cmd_process', processCmd);
    viewEvent.on('cmd_deactivate', deactivateCmd);
    viewEvent.on('cmd_exe', executeCmd);
    viewEvent.on('cmd_error', errorCmd);
    return () => {
      deactivateCmd();
      viewEvent.removeListener('cmd_activate', activateCmd);
      viewEvent.removeListener('cmd_process', processCmd);
      viewEvent.removeListener('cmd_deactivate', deactivateCmd);
      viewEvent.removeListener('cmd_exe', executeCmd);
      viewEvent.removeListener('cmd_error', errorCmd);
    };
  }, [roomId]);

  if (cmd !== null && typeof cmd.error !== 'undefined') {
    return (
      <div className="cmd-bar">
        <div className="cmd-bar__info">
          <div className="cmd-bar__info-indicator--error" />
        </div>
        <div className="cmd-bar__content">
          <Text className="cmd-bar__content-error" variant="b2">{cmd.error}</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="cmd-bar">
      <div className="cmd-bar__info">
        {cmd === null && <CmdHelp />}
        {cmd !== null && typeof cmd.slug === 'undefined' && <div className="cmd-bar__info-indicator" /> }
        {cmd !== null && typeof cmd.slug === 'string' && <Text variant="b3">TAB</Text>}
      </div>
      <div className="cmd-bar__content">
        {cmd === null && (
          <FollowingMembers
            roomId={roomId}
            roomTimeline={roomTimeline}
            viewEvent={viewEvent}
          />
        )}
        {cmd !== null && typeof cmd.slug === 'undefined' && <Text className="cmd-bar__content-help" variant="b2">{getCmdActivationMessage(cmd.prefix)}</Text>}
        {cmd !== null && typeof cmd.slug === 'string' && (
          <ScrollView horizontal vertical={false} invisible>
            <div className="cmd-bar__content__suggestions">{getCmdSuggestions(cmd, fireCmd, viewEvent)}</div>
          </ScrollView>
        )}
      </div>
      <div className="cmd-bar__more">
        {cmd !== null && cmd.prefix === '/' && <ViewCmd />}
      </div>
    </div>
  );
}
ChannelViewCmdBar.propTypes = {
  roomId: PropTypes.string.isRequired,
  roomTimeline: PropTypes.shape({}).isRequired,
  viewEvent: PropTypes.shape({}).isRequired,
};

export default ChannelViewCmdBar;
