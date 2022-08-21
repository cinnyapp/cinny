import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomAliases.scss';

import { useTranslation } from 'react-i18next';
import initMatrix from '../../../client/initMatrix';
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

import '../../i18n';

function useValidate(hsString) {
  const [debounce] = useState(new Debounce());
  const [validate, setValidate] = useState({ alias: null, status: cons.status.PRE_FLIGHT });

  const { t } = useTranslation();

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
        msg: t('Molecules.RoomAliases.invalid_characters'),
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
        msg: t('Molecules.RoomAliases.validating_alias', { alias }),
      });

      const isValid = await isRoomAliasAvailable(alias);
      setValidate(() => {
        if (e.target.value !== value) {
          return { alias: null, status: cons.status.PRE_FLIGHT };
        }
        return {
          alias,
          status: isValid ? cons.status.SUCCESS : cons.status.ERROR,
          msg: t(isValid ? 'Molecules.RoomAliases.alias_available' : 'Molecules.RoomAliases.alias_unavailable', { alias }),
        };
      });
    }, 600)();
  };

  return [validate, setValidateToDefault, handleAliasChange];
}

function getAliases(roomId) {
  const mx = initMatrix.matrixClient;
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
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const userId = mx.getUserId();
  const hsString = userId.slice(userId.indexOf(':') + 1);

  const isMountedStore = useStore();
  const [isPublic, setIsPublic] = useState(false);
  const [isLocalVisible, setIsLocalVisible] = useState(false);
  const [aliases, setAliases] = useState(getAliases(roomId));
  const [selectedAlias, setSelectedAlias] = useState(null);
  const [deleteAlias, setDeleteAlias] = useState(null);
  const [validate, setValidateToDefault, handleAliasChange] = useValidate(hsString);

  const canPublishAlias = room.currentState.maySendStateEvent('m.room.canonical_alias', userId);

  const { t } = useTranslation();

  useEffect(() => isMountedStore.setItem(true), []);

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
  }, [roomId]);

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
      setDeleteAlias({ alias, status: cons.status.IN_FLIGHT, msg: t('Molecules.RoomAliases.deleting_alias') });
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
        {canPublishAlias && !isMain && <Button onClick={() => handleSetMainAlias(alias)} variant="primary">{t('Molecules.RoomAliases.set_main_alias')}</Button>}
        {!isPublished && canPublishAlias && <Button onClick={() => handlePublishAlias(alias)} variant="positive">{t('Molecules.RoomAliases.publish_alias')}</Button>}
        {isPublished && canPublishAlias && <Button onClick={() => handleUnPublishAlias(alias)} variant="caution">{t('Molecules.RoomAliases.unpublish_alias')}</Button>}
        <Button onClick={() => handleDeleteAlias(alias)} variant="danger">{t('Molecules.RoomAliases.delete_alias')}</Button>
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
            {isMain && <span>{t('Molecules.RoomAliases.main_alias')}</span>}
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
        title={t('Molecules.RoomAliases.publish_to_room_directory.title')}
        content={<Text variant="b3">{t(room.isSpaceRoom() ? 'Molecules.RoomAliases.publish_to_room_directory.publish_space_message' : 'Molecules.RoomAliases.publish_to_room_directory.publish_room_message', { homeserver: hsString })}</Text>}
        options={(
          <Toggle
            isActive={isPublic}
            onToggle={toggleDirectoryVisibility}
            disabled={!canPublishAlias}
          />
        )}
      />

      <div className="room-aliases__content">
        <MenuHeader>{t('Molecules.RoomAliases.published_addresses.title')}</MenuHeader>
        {(aliases.published.length === 0) && <Text className="room-aliases__message">{t('Molecules.RoomAliases.published_addresses.none')}</Text>}
        {(aliases.published.length > 0 && !aliases.main) && <Text className="room-aliases__message">{t('Molecules.RoomAliases.published_addresses.no_main_address')}</Text>}
        {aliases.published.map(renderAlias)}
        <Text className="room-aliases__message" variant="b3">
          {t(room.isSpaceRoom() ? 'Molecules.RoomAliases.published_addresses.message_space' : 'Molecules.RoomAliases.published_addresses.message_room')}
        </Text>
      </div>
      { isLocalVisible && (
        <div className="room-aliases__content">
          <MenuHeader>{t('Molecules.RoomAliases.local_addresses.title')}</MenuHeader>
          {(aliases.local.length === 0) && <Text className="room-aliases__message">{t('Molecules.RoomAliases.local_addresses.none')}</Text>}
          {aliases.local.map(renderAlias)}
          <Text className="room-aliases__message" variant="b3">
            {t(room.isSpaceRoom() ? 'Molecules.RoomAliases.local_addresses.message_space' : 'Molecules.RoomAliases.local_addresses.message_room')}
          </Text>

          <Text className="room-aliases__form-label" variant="b2">{t('Molecules.RoomAliases.local_addresses.add')}</Text>
          <form className="room-aliases__form" onSubmit={handleAliasSubmit}>
            <div className="room-aliases__input-wrapper">
              <Input
                name="alias-input"
                state={inputState}
                onChange={handleAliasChange}
                placeholder={t(room.isSpaceRoom() ? 'Molecules.RoomAliases.local_addresses.placeholder_space' : 'Molecules.RoomAliases.local_addresses.placeholder_room')}
                required
              />
            </div>
            <Button variant="primary" type="submit">{t('Molecules.RoomAliases.local_addresses.add_button')}</Button>
          </form>
          <div className="room-aliases__input-status">
            {validate.status === cons.status.SUCCESS && <Text className="room-aliases__valid" variant="b2">{validate.msg}</Text>}
            {validate.status === cons.status.ERROR && <Text className="room-aliases__invalid" variant="b2">{validate.msg}</Text>}
          </div>
        </div>
      )}
      <div className="room-aliases__content">
        <Button onClick={() => setIsLocalVisible(!isLocalVisible)}>
          {t(isLocalVisible ? 'Molecules.RoomAliases.local_addresses.hide' : 'Molecules.RoomAliases.local_addresses.view')}
        </Button>
      </div>
    </div>
  );
}

RoomAliases.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomAliases;
