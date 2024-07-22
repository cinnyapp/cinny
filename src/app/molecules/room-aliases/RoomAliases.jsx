import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomAliases.scss';

import cons from '../../../client/state/cons';
import { Debounce } from '../../../util/common';
import { isRoomAliasAvailable } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Checkbox from '../../atoms/button/Checkbox';
import Toggle from '../../atoms/button/Toggle';
import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import SettingTile from '../setting-tile/SettingTile';

import { useStore } from '../../hooks/useStore';
import { useMatrixClient } from '../../hooks/useMatrixClient';

function useValidate(hsString) {
  const mx = useMatrixClient();
  const [debounce] = useState(new Debounce());
  const [validate, setValidate] = useState({ alias: null, status: cons.status.PRE_FLIGHT });

  const setValidateToDefault = () => {
    setValidate({
      alias: null,
      status: cons.status.PRE_FLIGHT,
    });
  };

  const checkValueOK = (value) => {
    if (value.trim() === '') {
      setValidateToDefault();
      return false;
    }
    if (!value.match(/^[a-zA-Z0-9_-]+$/)) {
      setValidate({
        alias: null,
        status: cons.status.ERROR,
        msg: 'Invalid character: only letter, numbers and _- are allowed.',
      });
      return false;
    }
    return true;
  };

  const handleAliasChange = (e) => {
    const input = e.target;
    if (validate.status !== cons.status.PRE_FLIGHT) {
      setValidateToDefault();
    }
    if (checkValueOK(input.value) === false) return;

    debounce._(async () => {
      const { value } = input;
      const alias = `#${value}:${hsString}`;
      if (checkValueOK(value) === false) return;

      setValidate({
        alias,
        status: cons.status.IN_FLIGHT,
        msg: `validating ${alias}...`,
      });

      const isValid = await isRoomAliasAvailable(mx, alias);
      setValidate(() => {
        if (e.target.value !== value) {
          return { alias: null, status: cons.status.PRE_FLIGHT };
        }
        return {
          alias,
          status: isValid ? cons.status.SUCCESS : cons.status.ERROR,
          msg: isValid ? `${alias} is available.` : `${alias} is already in use.`,
        };
      });
    }, 600)();
  };

  return [validate, setValidateToDefault, handleAliasChange];
}

function getAliases(mx, roomId) {
  const room = mx.getRoom(roomId);

  const main = room.getCanonicalAlias();
  const published = room.getAltAliases();
  if (main && !published.includes(main)) published.splice(0, 0, main);

  return {
    main,
    published: [...new Set(published)],
    local: [],
  };
}

function RoomAliases({ roomId }) {
  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);
  const userId = mx.getUserId();
  const hsString = userId.slice(userId.indexOf(':') + 1);

  const isMountedStore = useStore();
  const [isPublic, setIsPublic] = useState(false);
  const [isLocalVisible, setIsLocalVisible] = useState(false);
  const [aliases, setAliases] = useState(getAliases(mx, roomId));
  const [selectedAlias, setSelectedAlias] = useState(null);
  const [deleteAlias, setDeleteAlias] = useState(null);
  const [validate, setValidateToDefault, handleAliasChange] = useValidate(hsString);

  const canPublishAlias = room.currentState.maySendStateEvent('m.room.canonical_alias', userId);

  useEffect(() => {
    isMountedStore.setItem(true)
  }, []);

  useEffect(() => {
    let isUnmounted = false;

    const loadLocalAliases = async () => {
      let local = [];
      try {
        const result = await mx.getLocalAliases(roomId);
        local = result.aliases.filter((alias) => !aliases.published.includes(alias));
      } catch {
        local = [];
      }
      aliases.local = [...new Set(local.reverse())];

      if (isUnmounted) return;
      setAliases({ ...aliases });
    };
    const loadVisibility = async () => {
      const result = await mx.getRoomDirectoryVisibility(roomId);
      if (isUnmounted) return;
      setIsPublic(result.visibility === 'public');
    };
    loadLocalAliases();
    loadVisibility();
    return () => {
      isUnmounted = true;
    };
  }, [mx, roomId]);

  const toggleDirectoryVisibility = () => {
    mx.setRoomDirectoryVisibility(roomId, isPublic ? 'private' : 'public');
    setIsPublic(!isPublic);
  };

  const handleAliasSubmit = async (e) => {
    e.preventDefault();
    if (validate.status === cons.status.ERROR) return;
    if (!validate.alias) return;

    const { alias } = validate;
    const aliasInput = e.target.elements['alias-input'];
    aliasInput.value = '';
    setValidateToDefault();

    try {
      aliases.local.push(alias);
      setAliases({ ...aliases });
      await mx.createAlias(alias, roomId);
    } catch {
      if (isMountedStore.getItem()) {
        const lIndex = alias.local.indexOf(alias);
        if (lIndex === -1) return;
        aliases.local.splice(lIndex, 1);
        setAliases({ ...aliases });
      }
    }
  };

  const handleAliasSelect = (alias) => {
    setSelectedAlias(alias === selectedAlias ? null : alias);
  };

  const handlePublishAlias = (alias) => {
    const { main, published } = aliases;
    let { local } = aliases;

    if (!published.includes(aliases)) {
      published.push(alias);
      local = local.filter((al) => al !== alias);
      mx.sendStateEvent(roomId, 'm.room.canonical_alias', {
        alias: main,
        alt_aliases: published.filter((al) => al !== main),
      });
      setAliases({ main, published, local });
      setSelectedAlias(null);
    }
  };

  const handleUnPublishAlias = (alias) => {
    let { main, published } = aliases;
    const { local } = aliases;

    if (published.includes(alias) || main === alias) {
      if (main === alias) main = null;
      published = published.filter((al) => al !== alias);
      local.push(alias);
      mx.sendStateEvent(roomId, 'm.room.canonical_alias', {
        alias: main,
        alt_aliases: published.filter((al) => al !== main),
      });
      setAliases({ main, published, local });
      setSelectedAlias(null);
    }
  };

  const handleSetMainAlias = (alias) => {
    let { main, local } = aliases;
    const { published } = aliases;

    if (main !== alias) {
      main = alias;
      if (!published.includes(alias)) published.splice(0, 0, alias);
      local = local.filter((al) => al !== alias);
      mx.sendStateEvent(roomId, 'm.room.canonical_alias', {
        alias: main,
        alt_aliases: published.filter((al) => al !== main),
      });
      setAliases({ main, published, local });
      setSelectedAlias(null);
    }
  };

  const handleDeleteAlias = async (alias) => {
    try {
      setDeleteAlias({ alias, status: cons.status.IN_FLIGHT, msg: 'deleting...' });
      await mx.deleteAlias(alias);
      let { main, published, local } = aliases;
      if (published.includes(alias)) {
        handleUnPublishAlias(alias);
        if (main === alias) main = null;
        published = published.filter((al) => al !== alias);
      }

      local = local.filter((al) => al !== alias);
      setAliases({ main, published, local });
      setDeleteAlias(null);
      setSelectedAlias(null);
    } catch (err) {
      setDeleteAlias({ alias, status: cons.status.ERROR, msg: err.message });
    }
  };

  const renderAliasBtns = (alias) => {
    const isPublished = aliases.published.includes(alias);
    const isMain = aliases.main === alias;
    if (deleteAlias?.alias === alias) {
      const isError = deleteAlias.status === cons.status.ERROR;
      return (
        <div className="room-aliases__item-btns">
          <Text variant="b2">
            <span style={{ color: isError ? 'var(--tc-danger-high' : 'inherit' }}>{deleteAlias.msg}</span>
          </Text>
        </div>
      );
    }

    return (
      <div className="room-aliases__item-btns">
        {canPublishAlias && !isMain && <Button onClick={() => handleSetMainAlias(alias)} variant="primary">Set as Main</Button>}
        {!isPublished && canPublishAlias && <Button onClick={() => handlePublishAlias(alias)} variant="positive">Publish</Button>}
        {isPublished && canPublishAlias && <Button onClick={() => handleUnPublishAlias(alias)} variant="caution">Un-Publish</Button>}
        <Button onClick={() => handleDeleteAlias(alias)} variant="danger">Delete</Button>
      </div>
    );
  };

  const renderAlias = (alias) => {
    const isActive = selectedAlias === alias;
    const disabled = !canPublishAlias && aliases.published.includes(alias);
    const isMain = aliases.main === alias;

    return (
      <React.Fragment key={`${alias}-wrapper`}>
        <div className="room-aliases__alias-item" key={alias}>
          <Checkbox variant="positive" disabled={disabled} isActive={isActive} onToggle={() => handleAliasSelect(alias)} />
          <Text>
            {alias}
            {isMain && <span>Main</span>}
          </Text>
        </div>
        {isActive && renderAliasBtns(alias)}
      </React.Fragment>
    );
  };

  let inputState = 'normal';
  if (validate.status === cons.status.ERROR) inputState = 'error';
  if (validate.status === cons.status.SUCCESS) inputState = 'success';
  return (
    <div className="room-aliases">
      <SettingTile
        title="Publish to room directory"
        content={<Text variant="b3">{`Publish this ${room.isSpaceRoom() ? 'space' : 'room'} to the ${hsString}'s public room directory?`}</Text>}
        options={(
          <Toggle
            isActive={isPublic}
            onToggle={toggleDirectoryVisibility}
            disabled={!canPublishAlias}
          />
        )}
      />

      <div className="room-aliases__content">
        <MenuHeader>Published addresses</MenuHeader>
        {(aliases.published.length === 0) && <Text className="room-aliases__message">No published addresses</Text>}
        {(aliases.published.length > 0 && !aliases.main) && <Text className="room-aliases__message">No Main address (select one from below)</Text>}
        {aliases.published.map(renderAlias)}
        <Text className="room-aliases__message" variant="b3">
          {`Published addresses can be used by anyone on any server to join your ${room.isSpaceRoom() ? 'space' : 'room'}. To publish an address, it needs to be set as a local address first.`}
        </Text>
      </div>
      { isLocalVisible && (
        <div className="room-aliases__content">
          <MenuHeader>Local addresses</MenuHeader>
          {(aliases.local.length === 0) && <Text className="room-aliases__message">No local addresses</Text>}
          {aliases.local.map(renderAlias)}
          <Text className="room-aliases__message" variant="b3">
            {`Set local addresses for this ${room.isSpaceRoom() ? 'space' : 'room'} so users can find this ${room.isSpaceRoom() ? 'space' : 'room'} through your homeserver.`}
          </Text>

          <Text className="room-aliases__form-label" variant="b2">Add local address</Text>
          <form className="room-aliases__form" onSubmit={handleAliasSubmit}>
            <div className="room-aliases__input-wrapper">
              <Input
                name="alias-input"
                state={inputState}
                onChange={handleAliasChange}
                placeholder={`my_${room.isSpaceRoom() ? 'space' : 'room'}_address`}
                required
              />
            </div>
            <Button variant="primary" type="submit">Add</Button>
          </form>
          <div className="room-aliases__input-status">
            {validate.status === cons.status.SUCCESS && <Text className="room-aliases__valid" variant="b2">{validate.msg}</Text>}
            {validate.status === cons.status.ERROR && <Text className="room-aliases__invalid" variant="b2">{validate.msg}</Text>}
          </div>
        </div>
      )}
      <div className="room-aliases__content">
        <Button onClick={() => setIsLocalVisible(!isLocalVisible)}>
          {`${isLocalVisible ? 'Hide' : 'Add / View'} local address`}
        </Button>
      </div>
    </div>
  );
}

RoomAliases.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomAliases;
