import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './PublicChannels.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { selectRoom } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Spinner from '../../atoms/spinner/Spinner';
import Input from '../../atoms/input/Input';
import PopupWindow from '../../molecules/popup-window/PopupWindow';
import ChannelTile from '../../molecules/channel-tile/ChannelTile';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import HashSearchIC from '../../../../public/res/ic/outlined/hash-search.svg';

const SEARCH_LIMIT = 20;

function TryJoinWithAlias({ alias, onRequestClose }) {
  const [status, setStatus] = useState({
    isJoining: false,
    error: null,
    roomId: null,
    tempRoomId: null,
  });
  function handleOnRoomAdded(roomId) {
    if (status.tempRoomId !== null && status.tempRoomId !== roomId) return;
    setStatus({
      isJoining: false, error: null, roomId, tempRoomId: null,
    });
  }

  useEffect(() => {
    initMatrix.roomList.on(cons.events.roomList.ROOM_JOINED, handleOnRoomAdded);
    return () => {
      initMatrix.roomList.removeListener(cons.events.roomList.ROOM_JOINED, handleOnRoomAdded);
    };
  }, [status]);

  async function joinWithAlias() {
    setStatus({
      isJoining: true, error: null, roomId: null, tempRoomId: null,
    });
    try {
      const roomId = await roomActions.join(alias, false);
      setStatus({
        isJoining: true, error: null, roomId: null, tempRoomId: roomId,
      });
    } catch (e) {
      setStatus({
        isJoining: false,
        error: `Unable to join ${alias}. Either room is private or doesn't exist.`,
        roomId: null,
        tempRoomId: null,
      });
    }
  }

  return (
    <div className="try-join-with-alias">
      {status.roomId === null && !status.isJoining && status.error === null && (
        <Button onClick={() => joinWithAlias()}>{`Try joining ${alias}`}</Button>
      )}
      {status.isJoining && (
        <>
          <Spinner size="small" />
          <Text>{`Joining ${alias}...`}</Text>
        </>
      )}
      {status.roomId !== null && (
        <Button onClick={() => { onRequestClose(); selectRoom(status.roomId); }}>Open</Button>
      )}
      {status.error !== null && <Text variant="b2"><span style={{ color: 'var(--bg-danger)' }}>{status.error}</span></Text>}
    </div>
  );
}

TryJoinWithAlias.propTypes = {
  alias: PropTypes.string.isRequired,
  onRequestClose: PropTypes.func.isRequired,
};

function PublicChannels({ isOpen, searchTerm, onRequestClose }) {
  const [isSearching, updateIsSearching] = useState(false);
  const [isViewMore, updateIsViewMore] = useState(false);
  const [publicChannels, updatePublicChannels] = useState([]);
  const [nextBatch, updateNextBatch] = useState(undefined);
  const [searchQuery, updateSearchQuery] = useState({});
  const [joiningChannels, updateJoiningChannels] = useState(new Set());

  const channelNameRef = useRef(null);
  const hsRef = useRef(null);
  const userId = initMatrix.matrixClient.getUserId();

  async function searchChannels(viewMore) {
    let inputChannelName = channelNameRef?.current?.value || searchTerm;
    let isInputAlias = false;
    if (typeof inputChannelName === 'string') {
      isInputAlias = inputChannelName[0] === '#' && inputChannelName.indexOf(':') > 1;
    }
    const hsFromAlias = (isInputAlias) ? inputChannelName.slice(inputChannelName.indexOf(':') + 1) : null;
    let inputHs = hsFromAlias || hsRef?.current?.value;

    if (typeof inputHs !== 'string') inputHs = userId.slice(userId.indexOf(':') + 1);
    if (typeof inputChannelName !== 'string') inputChannelName = '';

    if (isSearching) return;
    if (viewMore !== true
      && inputChannelName === searchQuery.name
      && inputHs === searchQuery.homeserver
    ) return;

    updateSearchQuery({
      name: inputChannelName,
      homeserver: inputHs,
    });
    if (isViewMore !== viewMore) updateIsViewMore(viewMore);
    updateIsSearching(true);

    try {
      const result = await initMatrix.matrixClient.publicRooms({
        server: inputHs,
        limit: SEARCH_LIMIT,
        since: viewMore ? nextBatch : undefined,
        include_all_networks: true,
        filter: {
          generic_search_term: inputChannelName,
        },
      });

      const totalChannels = viewMore ? publicChannels.concat(result.chunk) : result.chunk;
      updatePublicChannels(totalChannels);
      updateNextBatch(result.next_batch);
      updateIsSearching(false);
      updateIsViewMore(false);
      if (totalChannels.length === 0) {
        updateSearchQuery({
          error: `No result found for "${inputChannelName}" on ${inputHs}`,
          alias: isInputAlias ? inputChannelName : null,
        });
      }
    } catch (e) {
      updatePublicChannels([]);
      updateSearchQuery({ error: 'Something went wrong!' });
      updateIsSearching(false);
      updateNextBatch(undefined);
      updateIsViewMore(false);
    }
  }

  useEffect(() => {
    if (isOpen) searchChannels();
  }, [isOpen]);

  function handleOnRoomAdded(roomId) {
    if (joiningChannels.has(roomId)) {
      joiningChannels.delete(roomId);
      updateJoiningChannels(new Set(Array.from(joiningChannels)));
    }
  }
  useEffect(() => {
    initMatrix.roomList.on(cons.events.roomList.ROOM_JOINED, handleOnRoomAdded);
    return () => {
      initMatrix.roomList.removeListener(cons.events.roomList.ROOM_JOINED, handleOnRoomAdded);
    };
  }, [joiningChannels]);

  function handleViewChannel(roomId) {
    selectRoom(roomId);
    onRequestClose();
  }

  function joinChannel(roomId) {
    joiningChannels.add(roomId);
    updateJoiningChannels(new Set(Array.from(joiningChannels)));
    roomActions.join(roomId, false);
  }

  function renderChannelList(channels) {
    return channels.map((channel) => {
      const alias = typeof channel.canonical_alias === 'string' ? channel.canonical_alias : channel.room_id;
      const name = typeof channel.name === 'string' ? channel.name : alias;
      const isJoined = initMatrix.roomList.rooms.has(channel.room_id);
      return (
        <ChannelTile
          key={channel.room_id}
          avatarSrc={typeof channel.avatar_url === 'string' ? initMatrix.matrixClient.mxcUrlToHttp(channel.avatar_url, 42, 42, 'crop') : null}
          name={name}
          id={alias}
          memberCount={channel.num_joined_members}
          desc={typeof channel.topic === 'string' ? channel.topic : null}
          options={(
            <>
              {isJoined && <Button onClick={() => handleViewChannel(channel.room_id)}>Open</Button>}
              {!isJoined && (joiningChannels.has(channel.room_id) ? <Spinner size="small" /> : <Button onClick={() => joinChannel(channel.room_id)} variant="primary">Join</Button>)}
            </>
          )}
        />
      );
    });
  }

  return (
    <PopupWindow
      isOpen={isOpen}
      title="Public channels"
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip="Close" />}
      onRequestClose={onRequestClose}
    >
      <div className="public-channels">
        <form className="public-channels__form" onSubmit={(e) => { e.preventDefault(); searchChannels(); }}>
          <div className="public-channels__input-wrapper">
            <Input value={searchTerm} forwardRef={channelNameRef} label="Channel name or alias" />
            <Input forwardRef={hsRef} value={userId.slice(userId.indexOf(':') + 1)} label="Homeserver" required />
          </div>
          <Button disabled={isSearching} iconSrc={HashSearchIC} variant="primary" type="submit">Search</Button>
        </form>
        <div className="public-channels__search-status">
          {
            typeof searchQuery.name !== 'undefined' && isSearching && (
              searchQuery.name === ''
                ? (
                  <div className="flex--center">
                    <Spinner size="small" />
                    <Text variant="b2">{`Loading public channels from ${searchQuery.homeserver}...`}</Text>
                  </div>
                )
                : (
                  <div className="flex--center">
                    <Spinner size="small" />
                    <Text variant="b2">{`Searching for "${searchQuery.name}" on ${searchQuery.homeserver}...`}</Text>
                  </div>
                )
            )
          }
          {
            typeof searchQuery.name !== 'undefined' && !isSearching && (
              searchQuery.name === ''
                ? <Text variant="b2">{`Public channels on ${searchQuery.homeserver}.`}</Text>
                : <Text variant="b2">{`Search result for "${searchQuery.name}" on ${searchQuery.homeserver}.`}</Text>
            )
          }
          { searchQuery.error && (
            <>
              <Text className="public-channels__search-error" variant="b2">{searchQuery.error}</Text>
              {searchQuery.alias !== null && (
                <TryJoinWithAlias onRequestClose={onRequestClose} alias={searchQuery.alias} />
              )}
            </>
          )}
        </div>
        { publicChannels.length !== 0 && (
          <div className="public-channels__content">
            { renderChannelList(publicChannels) }
          </div>
        )}
        { publicChannels.length !== 0 && publicChannels.length % SEARCH_LIMIT === 0 && (
          <div className="public-channels__view-more">
            { isViewMore !== true && (
              <Button onClick={() => searchChannels(true)}>View more</Button>
            )}
            { isViewMore && <Spinner /> }
          </div>
        )}
      </div>
    </PopupWindow>
  );
}

PublicChannels.defaultProps = {
  searchTerm: undefined,
};

PublicChannels.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  searchTerm: PropTypes.string,
  onRequestClose: PropTypes.func.isRequired,
};

export default PublicChannels;
