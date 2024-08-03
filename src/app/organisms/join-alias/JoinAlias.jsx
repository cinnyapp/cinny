import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './JoinAlias.scss';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { join } from '../../../client/action/room';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';
import Dialog from '../../molecules/dialog/Dialog';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import { useStore } from '../../hooks/useStore';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useMatrixClient } from '../../hooks/useMatrixClient';

const ALIAS_OR_ID_REG = /^[#|!].+:.+\..+$/;

function JoinAliasContent({ term, requestClose }) {
  const [process, setProcess] = useState(false);
  const [error, setError] = useState(undefined);

  const mx = useMatrixClient();
  const mountStore = useStore();

  const { navigateRoom } = useRoomNavigate();

  const openRoom = (roomId) => {
    navigateRoom(roomId);
    requestClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    mountStore.setItem(true);
    const alias = e.target.alias.value;
    if (alias?.trim() === '') return;
    if (alias.match(ALIAS_OR_ID_REG) === null) {
      setError('Invalid address.');
      return;
    }
    setProcess('Looking for address...');
    setError(undefined);
    let via;
    if (alias.startsWith('#')) {
      try {
        const aliasData = await mx.getRoomIdForAlias(alias);
        via = aliasData?.servers.slice(0, 3) || [];
        if (mountStore.getItem()) {
          setProcess(`Joining ${alias}...`);
        }
      } catch (err) {
        if (!mountStore.getItem()) return;
        setProcess(false);
        setError(
          `Unable to find room/space with ${alias}. Either room/space is private or doesn't exist.`
        );
      }
    }
    try {
      const roomId = await join(mx, alias, false, via);
      if (!mountStore.getItem()) return;
      openRoom(roomId);
    } catch {
      if (!mountStore.getItem()) return;
      setProcess(false);
      setError(`Unable to join ${alias}. Either room/space is private or doesn't exist.`);
    }
  };

  return (
    <form className="join-alias" onSubmit={handleSubmit}>
      <Input label="Address" value={term} name="alias" required />
      {error && (
        <Text className="join-alias__error" variant="b3">
          {error}
        </Text>
      )}
      <div className="join-alias__btn">
        {process ? (
          <>
            <Spinner size="small" />
            <Text>{process}</Text>
          </>
        ) : (
          <Button variant="primary" type="submit">
            Join
          </Button>
        )}
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

  return (
    <Dialog
      isOpen={data !== null}
      title={
        <Text variant="s1" weight="medium" primary>
          Join with address
        </Text>
      }
      contentOptions={<IconButton src={CrossIC} onClick={requestClose} tooltip="Close" />}
      onRequestClose={requestClose}
    >
      {data ? <JoinAliasContent term={data.term} requestClose={requestClose} /> : <div />}
    </Dialog>
  );
}

export default JoinAlias;
