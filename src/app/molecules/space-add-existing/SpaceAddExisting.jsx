import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAtomValue } from 'jotai';
import './SpaceAddExisting.scss';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { joinRuleToIconSrc, getIdServer } from '../../../util/matrixUtil';
import { Debounce } from '../../../util/common';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Checkbox from '../../atoms/button/Checkbox';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';
import RoomSelector from '../room-selector/RoomSelector';
import Dialog from '../dialog/Dialog';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import SearchIC from '../../../../public/res/ic/outlined/search.svg';

import { useStore } from '../../hooks/useStore';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { useDirects, useRooms, useSpaces } from '../../state/hooks/roomList';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { mDirectAtom } from '../../state/mDirectList';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getViaServers } from '../../plugins/via-servers';

function SpaceAddExistingContent({ roomId, spaces: onlySpaces }) {
  const mountStore = useStore(roomId);
  const [debounce] = useState(new Debounce());
  const [process, setProcess] = useState(null);
  const [allRoomIds, setAllRoomIds] = useState([]);
  const [selected, setSelected] = useState([]);
  const [searchIds, setSearchIds] = useState(null);
  const mx = useMatrixClient();
  const roomIdToParents = useAtomValue(roomToParentsAtom);
  const mDirects = useAtomValue(mDirectAtom);
  const spaces = useSpaces(mx, allRoomsAtom);
  const rooms = useRooms(mx, allRoomsAtom, mDirects);
  const directs = useDirects(mx, allRoomsAtom, mDirects);

  useEffect(() => {
    const roomIds = onlySpaces ? [...spaces] : [...rooms, ...directs];
    const allIds = roomIds.filter(
      (rId) => rId !== roomId && !roomIdToParents.get(rId)?.has(roomId)
    );
    setAllRoomIds(allIds);
  }, [spaces, rooms, directs, roomIdToParents, roomId, onlySpaces]);

  const toggleSelection = (rId) => {
    if (process !== null) return;
    const newSelected = [...selected];
    const selectedIndex = newSelected.indexOf(rId);

    if (selectedIndex > -1) {
      newSelected.splice(selectedIndex, 1);
      setSelected(newSelected);
      return;
    }
    newSelected.push(rId);
    setSelected(newSelected);
  };

  const handleAdd = async () => {
    setProcess(`Adding ${selected.length} items...`);

    const promises = selected.map((rId) => {
      const room = mx.getRoom(rId);
      const via = getViaServers(room);
      if (via.length === 0) {
        via.push(getIdServer(rId));
      }

      return mx.sendStateEvent(
        roomId,
        'm.space.child',
        {
          auto_join: false,
          suggested: false,
          via,
        },
        rId
      );
    });

    mountStore.setItem(true);
    await Promise.allSettled(promises);
    if (mountStore.getItem() !== true) return;

    const roomIds = onlySpaces ? [...spaces] : [...rooms, ...directs];
    const allIds = roomIds.filter(
      (rId) => rId !== roomId && !roomIdToParents.get(rId)?.has(roomId) && !selected.includes(rId)
    );
    setAllRoomIds(allIds);
    setProcess(null);
    setSelected([]);
  };

  const handleSearch = (ev) => {
    const term = ev.target.value.toLocaleLowerCase().replace(/\s/g, '');
    if (term === '') {
      setSearchIds(null);
      return;
    }

    debounce._(() => {
      const searchedIds = allRoomIds.filter((rId) => {
        let name = mx.getRoom(rId)?.name;
        if (!name) return false;
        name = name.normalize('NFKC').toLocaleLowerCase().replace(/\s/g, '');
        return name.includes(term);
      });
      setSearchIds(searchedIds);
    }, 200)();
  };
  const handleSearchClear = (ev) => {
    const btn = ev.currentTarget;
    btn.parentElement.searchInput.value = '';
    setSearchIds(null);
  };

  return (
    <>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
        }}
      >
        <RawIcon size="small" src={SearchIC} />
        <Input name="searchInput" onChange={handleSearch} placeholder="Search room" autoFocus />
        <IconButton size="small" type="button" onClick={handleSearchClear} src={CrossIC} />
      </form>
      {searchIds?.length === 0 && <Text>No results found</Text>}
      {(searchIds || allRoomIds).map((rId) => {
        const room = mx.getRoom(rId);
        let imageSrc =
          room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;
        if (imageSrc === null) imageSrc = room.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;

        const parentSet = roomIdToParents.get(rId);
        const parentNames = parentSet
          ? [...parentSet].map((parentId) => mx.getRoom(parentId).name)
          : undefined;
        const parents = parentNames ? parentNames.join(', ') : null;

        const handleSelect = () => toggleSelection(rId);

        return (
          <RoomSelector
            key={rId}
            name={room.name}
            parentName={parents}
            roomId={rId}
            imageSrc={mDirects.has(rId) ? imageSrc : null}
            iconSrc={
              mDirects.has(rId) ? null : joinRuleToIconSrc(room.getJoinRule(), room.isSpaceRoom())
            }
            isUnread={false}
            notificationCount={0}
            isAlert={false}
            onClick={handleSelect}
            options={
              <Checkbox
                isActive={selected.includes(rId)}
                variant="positive"
                onToggle={handleSelect}
                tabIndex={-1}
                disabled={process !== null}
              />
            }
          />
        );
      })}
      {selected.length !== 0 && (
        <div className="space-add-existing__footer">
          {process && <Spinner size="small" />}
          <Text weight="medium">{process || `${selected.length} item selected`}</Text>
          {!process && (
            <Button onClick={handleAdd} variant="primary">
              Add
            </Button>
          )}
        </div>
      )}
    </>
  );
}
SpaceAddExistingContent.propTypes = {
  roomId: PropTypes.string.isRequired,
  spaces: PropTypes.bool.isRequired,
};

function useVisibilityToggle() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const handleOpen = (roomId, spaces) =>
      setData({
        roomId,
        spaces,
      });
    navigation.on(cons.events.navigation.SPACE_ADDEXISTING_OPENED, handleOpen);
    return () => {
      navigation.removeListener(cons.events.navigation.SPACE_ADDEXISTING_OPENED, handleOpen);
    };
  }, []);

  const requestClose = () => setData(null);

  return [data, requestClose];
}

function SpaceAddExisting() {
  const [data, requestClose] = useVisibilityToggle();
  const mx = useMatrixClient();
  const room = mx.getRoom(data?.roomId);

  return (
    <Dialog
      isOpen={!!room}
      className="space-add-existing"
      title={
        <Text variant="s1" weight="medium" primary>
          {room && room.name}
          <span style={{ color: 'var(--tc-surface-low)' }}>
            {' '}
            — add existing {data?.spaces ? 'spaces' : 'rooms'}
          </span>
        </Text>
      }
      contentOptions={<IconButton src={CrossIC} onClick={requestClose} tooltip="Close" />}
      onRequestClose={requestClose}
    >
      {room ? <SpaceAddExistingContent roomId={room.roomId} spaces={data.spaces} /> : <div />}
    </Dialog>
  );
}

export default SpaceAddExisting;
