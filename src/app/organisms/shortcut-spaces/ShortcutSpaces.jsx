import React, { useState, useEffect } from 'react';
import './ShortcutSpaces.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { createSpaceShortcut, deleteSpaceShortcut } from '../../../client/action/accountData';
import { joinRuleToIconSrc } from '../../../util/matrixUtil';
import { roomIdByAtoZ } from '../../../util/sort';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Checkbox from '../../atoms/button/Checkbox';
import Spinner from '../../atoms/spinner/Spinner';
import RoomSelector from '../../molecules/room-selector/RoomSelector';
import Dialog from '../../molecules/dialog/Dialog';

import PinIC from '../../../../public/res/ic/outlined/pin.svg';
import PinFilledIC from '../../../../public/res/ic/filled/pin.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import { useSpaceShortcut } from '../../hooks/useSpaceShortcut';

function ShortcutSpacesContent() {
  const mx = initMatrix.matrixClient;
  const { spaces, roomIdToParents } = initMatrix.roomList;

  const [spaceShortcut] = useSpaceShortcut();
  const spaceWithoutShortcut = [...spaces].filter(
    (spaceId) => !spaceShortcut.includes(spaceId),
  ).sort(roomIdByAtoZ);

  const [process, setProcess] = useState(null);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (process !== null) {
      setProcess(null);
      setSelected([]);
    }
  }, [spaceShortcut]);

  const toggleSelection = (sId) => {
    if (process !== null) return;
    const newSelected = [...selected];
    const selectedIndex = newSelected.indexOf(sId);

    if (selectedIndex > -1) {
      newSelected.splice(selectedIndex, 1);
      setSelected(newSelected);
      return;
    }
    newSelected.push(sId);
    setSelected(newSelected);
  };

  const handleAdd = () => {
    setProcess(`Pinning ${selected.length} spaces...`);
    createSpaceShortcut(selected);
  };

  const renderSpace = (spaceId, isShortcut) => {
    const room = mx.getRoom(spaceId);
    if (!room) return null;

    const parentSet = roomIdToParents.get(spaceId);
    const parentNames = parentSet
      ? [...parentSet].map((parentId) => mx.getRoom(parentId).name)
      : undefined;
    const parents = parentNames ? parentNames.join(', ') : null;

    const toggleSelected = () => toggleSelection(spaceId);
    const deleteShortcut = () => deleteSpaceShortcut(spaceId);

    return (
      <RoomSelector
        key={spaceId}
        name={room.name}
        parentName={parents}
        roomId={spaceId}
        imageSrc={null}
        iconSrc={joinRuleToIconSrc(room.getJoinRule(), true)}
        isUnread={false}
        notificationCount={0}
        isAlert={false}
        onClick={isShortcut ? deleteShortcut : toggleSelected}
        options={isShortcut ? (
          <IconButton
            src={isShortcut ? PinFilledIC : PinIC}
            size="small"
            onClick={deleteShortcut}
            disabled={process !== null}
          />
        ) : (
          <Checkbox
            isActive={selected.includes(spaceId)}
            variant="positive"
            onToggle={toggleSelected}
            tabIndex={-1}
            disabled={process !== null}
          />
        )}
      />
    );
  };

  return (
    <>
      <Text className="shortcut-spaces__header" variant="b3" weight="bold">Pinned spaces</Text>
      {spaceShortcut.length === 0 && <Text>No pinned spaces</Text>}
      {spaceShortcut.map((spaceId) => renderSpace(spaceId, true))}
      <Text className="shortcut-spaces__header" variant="b3" weight="bold">Unpinned spaces</Text>
      {spaceWithoutShortcut.length === 0 && <Text>No unpinned spaces</Text>}
      {spaceWithoutShortcut.map((spaceId) => renderSpace(spaceId, false))}
      {selected.length !== 0 && (
        <div className="shortcut-spaces__footer">
          {process && <Spinner size="small" />}
          <Text weight="medium">{process || `${selected.length} spaces selected`}</Text>
          { !process && (
            <Button onClick={handleAdd} variant="primary">Pin</Button>
          )}
        </div>
      )}
    </>
  );
}

function useVisibilityToggle() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    navigation.on(cons.events.navigation.SHORTCUT_SPACES_OPENED, handleOpen);
    return () => {
      navigation.removeListener(cons.events.navigation.SHORTCUT_SPACES_OPENED, handleOpen);
    };
  }, []);

  const requestClose = () => setIsOpen(false);

  return [isOpen, requestClose];
}

function ShortcutSpaces() {
  const [isOpen, requestClose] = useVisibilityToggle();

  return (
    <Dialog
      isOpen={isOpen}
      className="shortcut-spaces"
      title={(
        <Text variant="s1" weight="medium" primary>
          Pin spaces
        </Text>
      )}
      contentOptions={<IconButton src={CrossIC} onClick={requestClose} tooltip="Close" />}
      onRequestClose={requestClose}
    >
      {
        isOpen
          ? <ShortcutSpacesContent />
          : <div />
      }
    </Dialog>
  );
}

export default ShortcutSpaces;
