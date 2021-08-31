import React from 'react';
import PropTypes from 'prop-types';

import {
  openPublicRooms, openCreateRoom, openInviteUser,
} from '../../../client/action/navigation';

import Text from '../../atoms/text/Text';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import IconButton from '../../atoms/button/IconButton';
import ContextMenu, { MenuItem, MenuHeader } from '../../atoms/context-menu/ContextMenu';

import PlusIC from '../../../../public/res/ic/outlined/plus.svg';
import HashPlusIC from '../../../../public/res/ic/outlined/hash-plus.svg';
import HashSearchIC from '../../../../public/res/ic/outlined/hash-search.svg';

function DrawerHeader({ activeTab }) {
  return (
    <Header>
      <TitleWrapper>
        <Text variant="s1">{(activeTab === 'home' ? 'Home' : 'Direct messages')}</Text>
      </TitleWrapper>
      {(activeTab === 'dm')
        ? <IconButton onClick={() => openInviteUser()} tooltip="Start DM" src={PlusIC} size="normal" />
        : (
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
        )}
      {/* <IconButton onClick={() => ''} tooltip="Menu" src={VerticalMenuIC} size="normal" /> */}
    </Header>
  );
}
DrawerHeader.propTypes = {
  activeTab: PropTypes.string.isRequired,
};

export default DrawerHeader;
