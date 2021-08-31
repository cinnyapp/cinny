import React from 'react';
import PropTypes from 'prop-types';
import './RoomSelector.scss';

import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import NotificationBadge from '../../atoms/badge/NotificationBadge';
import { blurOnBubbling } from '../../atoms/button/script';

function RoomSelectorWrapper({
  isSelected, onClick, content, options,
}) {
  return (
    <div className={`room-selector${isSelected ? ' room-selector--selected' : ''}`}>
      <button
        className="room-selector__content"
        type="button"
        onClick={onClick}
        onMouseUp={(e) => blurOnBubbling(e, '.room-selector')}
      >
        {content}
      </button>
      <div className="room-selector__options">{options}</div>
    </div>
  );
}
RoomSelectorWrapper.defaultProps = {
  options: null,
};
RoomSelectorWrapper.propTypes = {
  isSelected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  content: PropTypes.node.isRequired,
  options: PropTypes.node,
};

function RoomSelector({
  name, roomId, imageSrc, iconSrc,
  isSelected, isUnread, notificationCount, isAlert,
  options, onClick,
}) {
  return (
    <RoomSelectorWrapper
      isSelected={isSelected}
      content={(
        <>
          <Avatar
            text={name.slice(0, 1)}
            bgColor={colorMXID(roomId)}
            imageSrc={imageSrc}
            iconSrc={iconSrc}
            size="extra-small"
          />
          <Text variant="b1">{name}</Text>
          { isUnread && (
            <NotificationBadge
              alert={isAlert}
              content={notificationCount !== 0 ? notificationCount : null}
            />
          )}
        </>
      )}
      options={options}
      onClick={onClick}
    />
  );
}
RoomSelector.defaultProps = {
  imageSrc: null,
  iconSrc: null,
  options: null,
};
RoomSelector.propTypes = {
  name: PropTypes.string.isRequired,
  roomId: PropTypes.string.isRequired,
  imageSrc: PropTypes.string,
  iconSrc: PropTypes.string,
  isSelected: PropTypes.bool.isRequired,
  isUnread: PropTypes.bool.isRequired,
  notificationCount: PropTypes.number.isRequired,
  isAlert: PropTypes.bool.isRequired,
  options: PropTypes.node,
  onClick: PropTypes.func.isRequired,
};

export default RoomSelector;
