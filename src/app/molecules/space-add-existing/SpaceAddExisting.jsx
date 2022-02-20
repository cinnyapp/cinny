import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './SpaceAddExisting.scss';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { joinRuleToIconSrc } from '../../../util/matrixUtil';
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

function SpaceAddExistingContent({ roomId }) {
  const [debounce] = useState(new Debounce());
  const [process, setProcess] = useState(null);
  const [selected, setSelected] = useState([]);
  const [searchIds, setSearchIds] = useState(null);
  const mx = initMatrix.matrixClient;
  const {
    spaces, rooms, directs, roomIdToParents,
  } = initMatrix.roomList;

  let allRoomIds = [...spaces, ...rooms, ...directs];
  allRoomIds = allRoomIds.filter((rId) => (
    rId !== roomId
    && !roomIdToParents.get(rId)?.has(roomId)
  ));

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

  const handleSearch = (ev) => {
    const term = ev.target.value.toLocaleLowerCase().replaceAll(' ', '');
    if (term === '') {
      setSearchIds(null);
      return;
    }

    debounce._(() => {
      const searchedIds = allRoomIds.filter((rId) => {
        let name = mx.getRoom(rId)?.name;
        if (!name) return false;
        name = name.normalize('NFKC')
          .toLocaleLowerCase()
          .replaceAll(' ', '');
        return name.includes(term);
      });
      setSearchIds(searchedIds);
    }, 400)();
  };

  const handleAdd = async () => {
    setProcess(`Adding ${selected.length} items...`);
  };

  return (
    <>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          const { target } = ev;
          target.searchInput.value = '';
          setSearchIds(null);
        }}
      >
        <RawIcon size="small" src={SearchIC} />
        <Input
          name="searchInput"
          onChange={handleSearch}
          placeholder="Search room"
          autoFocus
        />
        <IconButton size="small" type="submit" src={CrossIC} />
      </form>
      {searchIds?.length === 0 && <Text>No result found</Text>}
      {
        (searchIds || allRoomIds).map((rId) => {
          const room = mx.getRoom(rId);
          let imageSrc = room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;
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
              imageSrc={directs.has(rId) ? imageSrc : null}
              iconSrc={
                directs.has(rId)
                  ? null
                  : joinRuleToIconSrc(room.getJoinRule(), room.isSpaceRoom())
              }
              isUnread={false}
              notificationCount={0}
              isAlert={false}
              onClick={handleSelect}
              options={(
                <Checkbox
                  isActive={selected.includes(rId)}
                  variant="positive"
                  onToggle={handleSelect}
                  tabIndex={-1}
                  disabled={process !== null}
                />
              )}
            />
          );
        })
      }
      {selected.length !== 0 && (
        <div className="space-add-existing__footer">
          {process && <Spinner size="small" />}
          <Text weight="medium">{process || `${selected.length} item selected`}</Text>
          { !process && (
            <Button onClick={handleAdd} variant="primary">Add</Button>
          )}
        </div>
      )}
    </>
  );
}
SpaceAddExistingContent.propTypes = {
  roomId: PropTypes.string.isRequired,
};

function useVisibilityToggle() {
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    const handleOpen = (rId) => setRoomId(rId);
    navigation.on(cons.events.navigation.SPACE_ADDEXISTING_OPENED, handleOpen);
    return () => {
      navigation.removeListener(cons.events.navigation.SPACE_ADDEXISTING_OPENED, handleOpen);
    };
  }, []);

  const requestClose = () => setRoomId(null);

  return [roomId, requestClose];
}

function SpaceAddExisting() {
  const [roomId, requestClose] = useVisibilityToggle();
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);

  return (
    <Dialog
      isOpen={roomId !== null}
      className="space-add-existing"
      title={(
        <Text variant="s1" weight="medium" primary>
          {roomId && twemojify(room.name)}
          <span style={{ color: 'var(--tc-surface-low)' }}> — add existing rooms</span>
        </Text>
      )}
      contentOptions={<IconButton src={CrossIC} onClick={requestClose} tooltip="Close" />}
      onRequestClose={requestClose}
    >
      {
        roomId
          ? <SpaceAddExistingContent roomId={roomId} />
          : <div />
      }
    </Dialog>
  );
}

export default SpaceAddExisting;
