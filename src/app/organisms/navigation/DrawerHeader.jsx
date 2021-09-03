import React from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import {
  selectSpace, openPublicRooms, openCreateRoom, openInviteUser,
} from '../../../client/action/navigation';
import navigation from '../../../client/state/navigation';

import Text from '../../atoms/text/Text';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import IconButton from '../../atoms/button/IconButton';
import ContextMenu, { MenuItem, MenuHeader } from '../../atoms/context-menu/ContextMenu';

import PlusIC from '../../../../public/res/ic/outlined/plus.svg';
import HashPlusIC from '../../../../public/res/ic/outlined/hash-plus.svg';
import HashSearchIC from '../../../../public/res/ic/outlined/hash-search.svg';
import ChevronLeftIC from '../../../../public/res/ic/outlined/chevron-left.svg';

function DrawerHeader({ selectedTab, spaceId }) {
  const mx = initMatrix.matrixClient;
  const tabName = selectedTab === 'home' ? 'Home' : 'Direct messages';

  const room = mx.getRoom(spaceId);
  const spaceName = selectedTab === 'dm' ? null : (room?.name || null);

  function handleBackClick() {
    const spacePath = navigation.selectedSpacePath;
    if (spacePath.length === 1) {
      selectSpace(null);
      return;
    }
    selectSpace(spacePath[spacePath.length - 2]);
  }

  return (
    <Header>
      <TitleWrapper>
        <Text variant="s1">{spaceName || tabName}</Text>
      </TitleWrapper>
      { spaceName && <IconButton onClick={handleBackClick} tooltip="Back" src={ChevronLeftIC} size="normal" /> }
      { selectedTab === 'dm' && <IconButton onClick={() => openInviteUser()} tooltip="Start DM" src={PlusIC} size="normal" /> }
      { selectSpace !== 'dm' && !spaceName && (
        <>
          <ContextMenu
            content={(hideMenu) => (
              <>
                <MenuHeader>Add room</MenuHeader>
                <MenuItem
                  iconSrc={HashPlusIC}
                  onClick={() => { hideMenu(); openCreateRoom(); }}
                >
                  Create new room
                </MenuItem>
                <MenuItem
                  iconSrc={HashSearchIC}
                  onClick={() => { hideMenu(); openPublicRooms(); }}
                >
                  Add public room
                </MenuItem>
              </>
            )}
            render={(toggleMenu) => (<IconButton onClick={toggleMenu} tooltip="Add room" src={PlusIC} size="normal" />)}
          />
        </>
      )}
      {/* <IconButton onClick={() => ''} tooltip="Menu" src={VerticalMenuIC} size="normal" /> */}
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
