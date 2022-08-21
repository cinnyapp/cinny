import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './JoinAlias.scss';

import { useTranslation } from 'react-i18next';
import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { join } from '../../../client/action/room';
import { selectRoom, selectTab } from '../../../client/action/navigation';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';
import Dialog from '../../molecules/dialog/Dialog';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import { useStore } from '../../hooks/useStore';

import '../../i18n';

const ALIAS_OR_ID_REG = /^[#|!].+:.+\..+$/;

function JoinAliasContent({ term, requestClose }) {
  const [process, setProcess] = useState(false);
  const [error, setError] = useState(undefined);
  const [lastJoinId, setLastJoinId] = useState(undefined);

  const mx = initMatrix.matrixClient;
  const mountStore = useStore();

  const { t } = useTranslation();

  const openRoom = (roomId) => {
    const room = mx.getRoom(roomId);
    if (!room) return;
    if (room.isSpaceRoom()) selectTab(roomId);
    else selectRoom(roomId);
    requestClose();
  };

  useEffect(() => {
    const handleJoin = (roomId) => {
      if (lastJoinId !== roomId) return;
      openRoom(roomId);
    };
    initMatrix.roomList.on(cons.events.roomList.ROOM_JOINED, handleJoin);
    return () => {
      initMatrix.roomList.removeListener(cons.events.roomList.ROOM_JOINED, handleJoin);
    };
  }, [lastJoinId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    mountStore.setItem(true);
    const alias = e.target.alias.value;
    if (alias?.trim() === '') return;
    if (alias.match(ALIAS_OR_ID_REG) === null) {
      setError(t('Organisms.JoinAlias.invalid_address'));
      return;
    }
    setProcess(t('Organisms.JoinAlias.looking_for_address'));
    setError(undefined);
    let via;
    if (alias.startsWith('#')) {
      try {
        const aliasData = await mx.resolveRoomAlias(alias);
        via = aliasData?.servers.slice(0, 3) || [];
        if (mountStore.getItem()) {
          setProcess(t('Organisms.JoinAlias.joining_alias', { alias_name: alias }));
        }
      } catch (err) {
        if (!mountStore.getItem()) return;
        setProcess(false);
        setError(t('Organisms.JoinAlias.couldnt_find_room_or_space_alias', { alias_name: alias }));
      }
    }
    try {
      const roomId = await join(alias, false, via);
      if (!mountStore.getItem()) return;
      setLastJoinId(roomId);
      openRoom(roomId);
    } catch {
      if (!mountStore.getItem()) return;
      setProcess(false);
      setError(t('Organisms.JoinAlias.couldnt_find_room_or_space', { alias_name: alias }));
    }
  };

  return (
    <form className="join-alias" onSubmit={handleSubmit}>
      <Input
        label={t('Organisms.JoinAlias.address_label')}
        value={term}
        name="alias"
        required
      />
      {error && <Text className="join-alias__error" variant="b3">{error}</Text>}
      <div className="join-alias__btn">
        {
          process
            ? (
              <>
                <Spinner size="small" />
                <Text>{process}</Text>
              </>
            )
            : <Button variant="primary" type="submit">{t('common.join')}</Button>
        }
      </div>
    </form>
  );
}
JoinAliasContent.defaultProps = {
  term: undefined,
};
JoinAliasContent.propTypes = {
  term: PropTypes.string,
  requestClose: PropTypes.func.isRequired,
};

function useWindowToggle() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const handleOpen = (term) => {
      setData({ term });
    };
    navigation.on(cons.events.navigation.JOIN_ALIAS_OPENED, handleOpen);
    return () => {
      navigation.removeListener(cons.events.navigation.JOIN_ALIAS_OPENED, handleOpen);
    };
  }, []);

  const onRequestClose = () => setData(null);

  return [data, onRequestClose];
}

function JoinAlias() {
  const [data, requestClose] = useWindowToggle();

  const { t } = useTranslation();

  return (
    <Dialog
      isOpen={data !== null}
      title={(
        <Text variant="s1" weight="medium" primary>{t('Organisms.JoinAlias.title')}</Text>
      )}
      contentOptions={<IconButton src={CrossIC} onClick={requestClose} tooltip="common.close" />}
      onRequestClose={requestClose}
    >
      { data ? <JoinAliasContent term={data.term} requestClose={requestClose} /> : <div /> }
    </Dialog>
  );
}

export default JoinAlias;
