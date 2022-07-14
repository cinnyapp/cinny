import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './CreateRoom.scss';

import { useTranslation } from 'react-i18next';
import { twemojify } from '../../../util/twemojify';
import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { selectRoom, openReusableContextMenu } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';
import { isRoomAliasAvailable, getIdServer } from '../../../util/matrixUtil';
import { getEventCords } from '../../../util/common';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Toggle from '../../atoms/button/Toggle';
import IconButton from '../../atoms/button/IconButton';
import { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';
import SegmentControl from '../../atoms/segmented-controls/SegmentedControls';
import Dialog from '../../molecules/dialog/Dialog';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import HashPlusIC from '../../../../public/res/ic/outlined/hash-plus.svg';
import SpacePlusIC from '../../../../public/res/ic/outlined/space-plus.svg';
import HashIC from '../../../../public/res/ic/outlined/hash.svg';
import HashLockIC from '../../../../public/res/ic/outlined/hash-lock.svg';
import HashGlobeIC from '../../../../public/res/ic/outlined/hash-globe.svg';
import SpaceIC from '../../../../public/res/ic/outlined/space.svg';
import SpaceLockIC from '../../../../public/res/ic/outlined/space-lock.svg';
import SpaceGlobeIC from '../../../../public/res/ic/outlined/space-globe.svg';
import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import '../../i18n';

function CreateRoomContent({ isSpace, parentId, onRequestClose }) {
  const { t } = useTranslation();

  const [joinRule, setJoinRule] = useState(parentId ? 'restricted' : 'invite');
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [creatingError, setCreatingError] = useState(null);

  const [isValidAddress, setIsValidAddress] = useState(null);
  const [addressValue, setAddressValue] = useState(undefined);
  const [roleIndex, setRoleIndex] = useState(0);

  const addressRef = useRef(null);

  const mx = initMatrix.matrixClient;
  const userHs = getIdServer(mx.getUserId());

  useEffect(() => {
    const { roomList } = initMatrix;
    const onCreated = (roomId) => {
      setIsCreatingRoom(false);
      setCreatingError(null);
      setIsValidAddress(null);
      setAddressValue(undefined);

      if (!mx.getRoom(roomId)?.isSpaceRoom()) {
        selectRoom(roomId);
      }
      onRequestClose();
    };
    roomList.on(cons.events.roomList.ROOM_CREATED, onCreated);
    return () => {
      roomList.removeListener(cons.events.roomList.ROOM_CREATED, onCreated);
    };
  }, []);

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    const { target } = evt;

    if (isCreatingRoom) return;
    setIsCreatingRoom(true);
    setCreatingError(null);

    const name = target.name.value;
    let topic = target.topic.value;
    if (topic.trim() === '') topic = undefined;
    let roomAlias;
    if (joinRule === 'public') {
      roomAlias = addressRef?.current?.value;
      if (roomAlias.trim() === '') roomAlias = undefined;
    }

    const powerLevel = roleIndex === 1 ? 101 : undefined;

    try {
      await roomActions.createRoom({
        name,
        topic,
        joinRule,
        alias: roomAlias,
        isEncrypted: (isSpace || joinRule === 'public') ? false : isEncrypted,
        powerLevel,
        isSpace,
        parentId,
      });
    } catch (e) {
      if (e.message === 'M_UNKNOWN: Invalid characters in room alias') {
        setCreatingError('ERROR: Invalid characters in address');
        setIsValidAddress(false);
      } else if (e.message === 'M_ROOM_IN_USE: Room alias already taken') {
        setCreatingError('ERROR: This address is already in use');
        setIsValidAddress(false);
      } else setCreatingError(e.message);
      setIsCreatingRoom(false);
    }
  };

  const validateAddress = (e) => {
    const myAddress = e.target.value;
    setIsValidAddress(null);
    setAddressValue(e.target.value);
    setCreatingError(null);

    setTimeout(async () => {
      if (myAddress !== addressRef.current.value) return;
      const roomAlias = addressRef.current.value;
      if (roomAlias === '') return;
      const roomAddress = `#${roomAlias}:${userHs}`;

      if (await isRoomAliasAvailable(roomAddress)) {
        setIsValidAddress(true);
      } else {
        setIsValidAddress(false);
      }
    }, 1000);
  };

  const joinRules = ['invite', 'restricted', 'public'];
  const joinRuleShortText = [t('Organisms.CreateRoom.private_room_short'), t('Organisms.CreateRoom.restricted_room_short'), t('Organisms.CreateRoom.public_room_short')];
  const joinRuleText = [t('Organisms.CreateRoom.private_room_long'), t('Organisms.CreateRoom.restricted_room_long'), t('Organisms.CreateRoom.public_room_long')];
  const jrRoomIC = [HashLockIC, HashIC, HashGlobeIC];
  const jrSpaceIC = [SpaceLockIC, SpaceIC, SpaceGlobeIC];
  const handleJoinRule = (evt) => {
    openReusableContextMenu(
      'bottom',
      getEventCords(evt, '.btn-surface'),
      (closeMenu) => (
        <>
          <MenuHeader>{t('Organisms.CreateRoom.visibility_message')}</MenuHeader>
          {
            joinRules.map((rule) => (
              <MenuItem
                key={rule}
                variant={rule === joinRule ? 'positive' : 'surface'}
                iconSrc={
                  isSpace
                    ? jrSpaceIC[joinRules.indexOf(rule)]
                    : jrRoomIC[joinRules.indexOf(rule)]
                }
                onClick={() => { closeMenu(); setJoinRule(rule); }}
                disabled={!parentId && rule === 'restricted'}
              >
                { joinRuleText[joinRules.indexOf(rule)] }
              </MenuItem>
            ))
          }
        </>
      ),
    );
  };

  return (
    <div className="create-room">
      <form className="create-room__form" onSubmit={handleSubmit}>
        <SettingTile
          title={t('Organisms.CreateRoom.visibility_title')}
          options={(
            <Button onClick={handleJoinRule} iconSrc={ChevronBottomIC}>
              {joinRuleShortText[joinRules.indexOf(joinRule)]}
            </Button>
          )}
          content={<Text variant="b3">{isSpace ? t('Organisms.CreateRoom.select_who_can_join_space') : t('Organisms.CreateRoom.select_who_can_join_room')}</Text>}
        />
        {joinRule === 'public' && (
          <div>
            <Text className="create-room__address__label" variant="b2">{isSpace ? t('Organisms.CreateRoom.space_address') : t('Organisms.CreateRoom.room_address')}</Text>
            <div className="create-room__address">
              <Text variant="b1">#</Text>
              <Input
                value={addressValue}
                onChange={validateAddress}
                state={(isValidAddress === false) ? 'error' : 'normal'}
                forwardRef={addressRef}
                placeholder="my_address"
                required
              />
              <Text variant="b1">{`:${userHs}`}</Text>
            </div>
            {isValidAddress === false && <Text className="create-room__address__tip" variant="b3"><span style={{ color: 'var(--bg-danger)' }}>{ t('Organisms.CreateRoom.room_address_already_in_use', { room_address: `#${addressValue}:${userHs}` })}</span></Text>}
          </div>
        )}
        {!isSpace && joinRule !== 'public' && (
          <SettingTile
            title={t('Organisms.CreateRoom.e2e_title')}
            options={<Toggle isActive={isEncrypted} onToggle={setIsEncrypted} />}
            content={(
              <Text variant="b3">
                {' '}
                {t('Organisms.CreateRoom.e2e_message')}
              </Text>
)}
          />
        )}
        <SettingTile
          title={t('Organisms.CreateRoom.role_title')}
          options={(
            <SegmentControl
              selected={roleIndex}
              segments={[{ text: t('Organisms.CreateRoom.role_admin') }, { text: t('Organisms.CreateRoom.role_founder') }]}
              onSelect={setRoleIndex}
            />
          )}
          content={(
            <Text variant="b3">
              {' '}
              {t('Organisms.CreateRoom.role_message')}
            </Text>
          )}
        />
        <Input name="topic" minHeight={174} resizable label={t('Organisms.CreateRoom.topic_label')} />
        <div className="create-room__name-wrapper">
          <Input name="name" label={isSpace ? t('Organisms.CreateRoom.space_name') : t('Organisms.CreateRoom.room_name')} required />
          <Button
            disabled={isValidAddress === false || isCreatingRoom}
            iconSrc={isSpace ? SpacePlusIC : HashPlusIC}
            type="submit"
            variant="primary"
          >
            Create
          </Button>
        </div>
        {isCreatingRoom && (
          <div className="create-room__loading">
            <Spinner size="small" />
            <Text>{ isSpace ? t('Organisms.CreateRoom.creating_space') : t('Organisms.CreateRoom.creating_room')}</Text>
          </div>
        )}
        {typeof creatingError === 'string' && <Text className="create-room__error" variant="b3">{creatingError}</Text>}
      </form>
    </div>
  );
}
CreateRoomContent.defaultProps = {
  parentId: null,
};
CreateRoomContent.propTypes = {
  isSpace: PropTypes.bool.isRequired,
  parentId: PropTypes.string,
  onRequestClose: PropTypes.func.isRequired,
};

function useWindowToggle() {
  const [create, setCreate] = useState(null);

  useEffect(() => {
    const handleOpen = (isSpace, parentId) => {
      setCreate({
        isSpace,
        parentId,
      });
    };
    navigation.on(cons.events.navigation.CREATE_ROOM_OPENED, handleOpen);
    return () => {
      navigation.removeListener(cons.events.navigation.CREATE_ROOM_OPENED, handleOpen);
    };
  }, []);

  const onRequestClose = () => setCreate(null);

  return [create, onRequestClose];
}

function CreateRoom() {
  const [create, onRequestClose] = useWindowToggle();
  const { isSpace, parentId } = create ?? {};
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(parentId);

  const { t } = useTranslation();

  return (
    <Dialog
      isOpen={create !== null}
      title={(
        <Text variant="s1" weight="medium" primary>
          {parentId ? twemojify(room.name) : t('Organisms.CreateRoom.home')}
          <span style={{ color: 'var(--tc-surface-low)' }}>
            {` — ${isSpace ? t('Organisms.CreateRoom.create_space') : t('Organisms.CreateRoom.create_room')}`}
          </span>
        </Text>
      )}
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip={t('common.close')} />}
      onRequestClose={onRequestClose}
    >
      {
        create
          ? (
            <CreateRoomContent
              isSpace={isSpace}
              parentId={parentId}
              onRequestClose={onRequestClose}
            />
          ) : <div />
      }
    </Dialog>
  );
}

export default CreateRoom;
