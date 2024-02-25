import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import './RoomsCategory.scss';

import initMatrix from '../../../client/initMatrix';
import {
  selectSpace,
  selectRoom,
  openReusableContextMenu,
} from '../../../client/action/navigation';
import { getEventCords } from '../../../util/common';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import IconButton from '../../atoms/button/IconButton';
import Selector from './Selector';
import SpaceOptions from '../../molecules/space-options/SpaceOptions';
import { HomeSpaceOptions } from './DrawerHeader';

import PlusIC from '../../../../public/res/ic/outlined/plus.svg';
import HorizontalMenuIC from '../../../../public/res/ic/outlined/horizontal-menu.svg';
import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';
import ChevronRightIC from '../../../../public/res/ic/outlined/chevron-right.svg';

const RoomsCategory = forwardRef(({ spaceId, name, hideHeader, roomIds, drawerPostie }, ref) => {
  const { spaces, directs } = initMatrix.roomList;
  const [isOpen, setIsOpen] = useState(true);

  const selectorsRefs = useRef([]);
  useImperativeHandle(
    ref,
    () => ({
      hasSelected() {
        return selectorsRefs.current.some((s) => s && s.hasSelected());
      },
      navigate(amount) {
        const refs = selectorsRefs.current.filter((c) => c);
        let current = refs.findIndex((s) => s.hasSelected());
        const len = refs.length;
        if (current == -1) {
          if (amount < 0) {
            // start navigation coming from below
            current = len;
          } else if (amount > 0) {
            // start navigation coming from above
            current = -1;
          } else {
            // invalid call
            return 0;
          }
        }
        if (current + amount < 0) return current + amount;
        else if (current + amount >= len) return current + amount - len + 1;
        refs[current + amount].select();
        return 0;
      },
    }),
    [selectorsRefs]
  );

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

  const renderSelector = (roomId, i) => {
    const isSpace = spaces.has(roomId);
    const isDM = directs.has(roomId);

    return (
      <Selector
        key={roomId}
        ref={(e) => (selectorsRefs.current[i] = e)}
        roomId={roomId}
        isDM={isDM}
        drawerPostie={drawerPostie}
        onClick={() => (isSpace ? selectSpace(roomId) : selectRoom(roomId))}
      />
    );
  };

  return (
    <div className="room-category">
      {!hideHeader && (
        <div className="room-category__header">
          <button className="room-category__toggle" onClick={() => setIsOpen(!isOpen)} type="button">
            <RawIcon src={isOpen ? ChevronBottomIC : ChevronRightIC} size="extra-small" />
            <Text className="cat-header" variant="b3" weight="medium">{name}</Text>
          </button>
          {spaceId && <IconButton onClick={openSpaceOptions} tooltip="Space options" src={HorizontalMenuIC} size="extra-small" />}
          {spaceId && <IconButton onClick={openHomeSpaceOptions} tooltip="Add rooms/spaces" src={PlusIC} size="extra-small" />}
        </div>
      )}
      {(isOpen || hideHeader) && (
        <div className="room-category__content">{roomIds.map(renderSelector)}</div>
      )}
    </div>
  );
});
RoomsCategory.defaultProps = {
  spaceId: null,
  hideHeader: false,
};
RoomsCategory.propTypes = {
  spaceId: PropTypes.string,
  name: PropTypes.string.isRequired,
  hideHeader: PropTypes.bool,
  roomIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  drawerPostie: PropTypes.shape({}).isRequired,
};

export default RoomsCategory;
