import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomSearch.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { selectRoom } from '../../../client/action/navigation';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import { Message } from '../message/Message';

import SearchIC from '../../../../public/res/ic/outlined/search.svg';

import { useStore } from '../../hooks/useStore';

const roomIdToBackup = new Map();

function useRoomSearch(roomId) {
  const [searchData, setSearchData] = useState(roomIdToBackup.get(roomId) ?? null);
  const [status, setStatus] = useState({
    type: cons.status.PRE_FLIGHT,
    term: null,
  });
  const mountStore = useStore(roomId);
  const mx = initMatrix.matrixClient;

  useEffect(() => mountStore.setItem(true), [roomId]);

  useEffect(() => {
    if (searchData?.results?.length > 0) {
      roomIdToBackup.set(roomId, searchData);
    } else {
      roomIdToBackup.delete(roomId);
    }
  }, [searchData]);

  const search = async (term) => {
    setSearchData(null);
    if (term === '') {
      setStatus({ type: cons.status.PRE_FLIGHT, term: null });
      return;
    }
    setStatus({ type: cons.status.IN_FLIGHT, term });
    const body = {
      search_categories: {
        room_events: {
          search_term: term,
          filter: {
            limit: 10,
            rooms: [roomId],
          },
          order_by: 'recent',
          event_context: {
            before_limit: 0,
            after_limit: 0,
            include_profile: true,
          },
        },
      },
    };
    try {
      const res = await mx.search({ body });
      const data = mx.processRoomEventsSearch({
        _query: body,
        results: [],
        highlights: [],
      }, res);
      if (!mountStore.getItem()) return;
      setStatus({ type: cons.status.SUCCESS, term });
      setSearchData(data);
      if (!mountStore.getItem()) return;
    } catch (error) {
      setSearchData(null);
      setStatus({ type: cons.status.ERROR, term });
    }
  };

  const paginate = async () => {
    if (searchData === null) return;
    const term = searchData._query.search_categories.room_events.search_term;

    setStatus({ type: cons.status.IN_FLIGHT, term });
    try {
      const data = await mx.backPaginateRoomEventsSearch(searchData);
      if (!mountStore.getItem()) return;
      setStatus({ type: cons.status.SUCCESS, term });
      setSearchData(data);
    } catch (error) {
      if (!mountStore.getItem()) return;
      setSearchData(null);
      setStatus({ type: cons.status.ERROR, term });
    }
  };

  return [searchData, search, paginate, status];
}

function RoomSearch({ roomId }) {
  const [searchData, search, paginate, status] = useRoomSearch(roomId);
  const mx = initMatrix.matrixClient;
  const isRoomEncrypted = mx.isRoomEncrypted(roomId);
  const searchTerm = searchData?._query.search_categories.room_events.search_term ?? '';

  const handleSearch = (e) => {
    e.preventDefault();
    if (isRoomEncrypted) return;
    const searchTermInput = e.target.elements['room-search-input'];
    const term = searchTermInput.value.trim();

    search(term);
  };

  const renderTimeline = (timeline) => (
    <div className="room-search__result-item" key={timeline[0].getId()}>
      { timeline.map((mEvent) => {
        const id = mEvent.getId();
        return (
          <React.Fragment key={id}>
            <Message
              mEvent={mEvent}
              isBodyOnly={false}
              fullTime
            />
            <Button onClick={() => selectRoom(roomId, id)}>View</Button>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="room-search">
      <form className="room-search__form" onSubmit={handleSearch}>
        <MenuHeader>Room search</MenuHeader>
        <div>
          <Input
            placeholder="Search for keywords"
            name="room-search-input"
            disabled={isRoomEncrypted}
            autoFocus
          />
          <Button iconSrc={SearchIC} variant="primary" type="submit">Search</Button>
        </div>
        {searchData?.results.length > 0 && (
          <Text>{`${searchData.count} results for "${searchTerm}"`}</Text>
        )}
        {!isRoomEncrypted && searchData === null && (
          <div className="room-search__help">
            {status.type === cons.status.IN_FLIGHT && <Spinner />}
            {status.type === cons.status.IN_FLIGHT && <Text>Searching room messages...</Text>}
            {status.type === cons.status.PRE_FLIGHT && <RawIcon src={SearchIC} size="large" />}
            {status.type === cons.status.PRE_FLIGHT && <Text>Search room messages</Text>}
            {status.type === cons.status.ERROR && <Text>Failed to search messages</Text>}
          </div>
        )}

        {!isRoomEncrypted && searchData?.results.length === 0 && (
          <div className="room-search__help">
            <Text>No results found</Text>
          </div>
        )}
        {isRoomEncrypted && (
          <div className="room-search__help">
            <Text>Search does not work in encrypted room</Text>
          </div>
        )}
      </form>
      {searchData?.results.length > 0 && (
        <>
          <div className="room-search__content">
            {searchData.results.map((searchResult) => {
              const { timeline } = searchResult.context;
              return renderTimeline(timeline);
            })}
          </div>
          {searchData?.next_batch && (
            <div className="room-search__more">
              {status.type !== cons.status.IN_FLIGHT && (
                <Button onClick={paginate}>Load more</Button>
              )}
              {status.type === cons.status.IN_FLIGHT && <Spinner />}
            </div>
          )}
        </>
      )}
    </div>
  );
}

RoomSearch.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomSearch;
