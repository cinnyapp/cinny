import React from 'react';
import PropTypes from 'prop-types';
import './DrawerHeader.scss';
import { useTranslation } from 'react-i18next';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import {
  openPublicRooms, openCreateRoom, openSpaceManage, openJoinAlias,
  openSpaceAddExisting, openInviteUser, openReusableContextMenu,
} from '../../../client/action/navigation';
import { getEventCords } from '../../../util/common';

import { blurOnBubbling } from '../../atoms/button/script';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import IconButton from '../../atoms/button/IconButton';
import { MenuItem, MenuHeader } from '../../atoms/context-menu/ContextMenu';
import SpaceOptions from '../../molecules/space-options/SpaceOptions';

import PlusIC from '../../../../public/res/ic/outlined/plus.svg';
import HashPlusIC from '../../../../public/res/ic/outlined/hash-plus.svg';
import HashGlobeIC from '../../../../public/res/ic/outlined/hash-globe.svg';
import HashSearchIC from '../../../../public/res/ic/outlined/hash-search.svg';
import SpacePlusIC from '../../../../public/res/ic/outlined/space-plus.svg';
import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';

export function HomeSpaceOptions({ spaceId, afterOptionSelect }) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(spaceId);
  const canManage = room
    ? room.currentState.maySendStateEvent('m.space.child', mx.getUserId())
    : true;

  const { t } = useTranslation();

  return (
    <>
      <MenuHeader>{t('Organisms.DrawerHeader.add_rooms_or_spaces')}</MenuHeader>
      <MenuItem
        iconSrc={SpacePlusIC}
        onClick={() => { afterOptionSelect(); openCreateRoom(true, spaceId); }}
        disabled={!canManage}
      >
        {t('Organisms.DrawerHeader.create_new_space')}
      </MenuItem>
      <MenuItem
        iconSrc={HashPlusIC}
        onClick={() => { afterOptionSelect(); openCreateRoom(false, spaceId); }}
        disabled={!canManage}
      >
        {t('Organisms.DrawerHeader.create_new_room')}
      </MenuItem>
      { !spaceId && (
        <MenuItem
          iconSrc={HashGlobeIC}
          onClick={() => { afterOptionSelect(); openPublicRooms(); }}
        >
          {t('Organisms.DrawerHeader.explore_public_room')}
        </MenuItem>
      )}
      { !spaceId && (
        <MenuItem
          iconSrc={PlusIC}
          onClick={() => { afterOptionSelect(); openJoinAlias(); }}
        >
          {t('Organisms.DrawerHeader.join_with_address')}
        </MenuItem>
      )}
      { spaceId && (
        <MenuItem
          iconSrc={PlusIC}
          onClick={() => { afterOptionSelect(); openSpaceAddExisting(spaceId); }}
          disabled={!canManage}
        >
          {t('Organisms.DrawerHeader.add_existing')}
        </MenuItem>
      )}
      { spaceId && (
        <MenuItem
          onClick={() => { afterOptionSelect(); openSpaceManage(spaceId); }}
          iconSrc={HashSearchIC}
        >
          {t('Organisms.DrawerHeader.manage_rooms')}
        </MenuItem>
      )}
    </>
  );
}
HomeSpaceOptions.defaultProps = {
  spaceId: null,
};
HomeSpaceOptions.propTypes = {
  spaceId: PropTypes.string,
  afterOptionSelect: PropTypes.func.isRequired,
};

function DrawerHeader({ selectedTab, spaceId }) {
  const mx = initMatrix.matrixClient;
  const { t } = useTranslation();
  const tabName = selectedTab !== cons.tabs.DIRECTS ? t('Organisms.DrawerHeader.home') : t('Organisms.DrawerHeader.direct_messages');

  const isDMTab = selectedTab === cons.tabs.DIRECTS;
  const room = mx.getRoom(spaceId);
  const spaceName = isDMTab ? null : (room?.name || null);

  const openSpaceOptions = (e) => {
    e.preventDefault();
    openReusableContextMenu(
      'bottom',
      getEventCords(e, '.header'),
      (closeMenu) => <SpaceOptions roomId={spaceId} afterOptionSelect={closeMenu} />,
    );
  };

  const openHomeSpaceOptions = (e) => {
    e.preventDefault();
    openReusableContextMenu(
      'right',
      getEventCords(e, '.ic-btn'),
      (closeMenu) => <HomeSpaceOptions spaceId={spaceId} afterOptionSelect={closeMenu} />,
    );
  };

  return (
    <Header>
      {spaceName ? (
        <button
          className="drawer-header__btn"
          onClick={openSpaceOptions}
          type="button"
          onMouseUp={(e) => blurOnBubbling(e, '.drawer-header__btn')}
        >
          <TitleWrapper>
            <Text variant="s1" weight="medium" primary>{twemojify(spaceName)}</Text>
          </TitleWrapper>
          <RawIcon size="small" src={ChevronBottomIC} />
        </button>
      ) : (
        <TitleWrapper>
          <Text variant="s1" weight="medium" primary>{tabName}</Text>
        </TitleWrapper>
      )}

      { isDMTab && <IconButton onClick={() => openInviteUser()} tooltip={t('Organisms.DrawerHeader.start_dm_tooltip')} src={PlusIC} size="small" /> }
      { !isDMTab && <IconButton onClick={openHomeSpaceOptions} tooltip={t('Organisms.DrawerHeader.add_rooms_spaces_tooltip')} src={PlusIC} size="small" /> }
    </Header>
  );
}

DrawerHeader.defaultProps = {
  spaceId: null,
};
DrawerHeader.propTypes = {
  selectedTab: PropTypes.string.isRequired,
  spaceId: PropTypes.string,
};

export default DrawerHeader;
