import React from 'react';
import PropTypes from 'prop-types';
import './RoomSelector.scss';

import { twemojify } from '../../../util/twemojify';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import NotificationBadge from '../../atoms/badge/NotificationBadge';
import { blurOnBubbling } from '../../atoms/button/script';

function RoomSelectorWrapper({
  isSelected, isUnread, onClick, content, options,
}) {
  let myClass = isUnread ? ' room-selector--unread' : '';
  myClass += isSelected ? ' room-selector--selected' : '';
  return (
    <div className={`room-selector${myClass}`}>
      <button
        className="room-selector__content"
        type="button"
        onClick={onClick}
        onMouseUp={(e) => blurOnBubbling(e, '.room-selector__content')}
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
  isUnread: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  content: PropTypes.node.isRequired,
  options: PropTypes.node,
};

function RoomSelector({
  name, parentName, roomId, imageSrc, iconSrc,
  isSelected, isUnread, notificationCount, isAlert,
  options, onClick,
}) {
  return (
    <RoomSelectorWrapper
      isSelected={isSelected}
      isUnread={isUnread}
      content={(
        <>
          <Avatar
            text={name}
            bgColor={colorMXID(roomId)}
            imageSrc={imageSrc}
            iconColor="var(--ic-surface-low)"
            iconSrc={iconSrc}
            size="extra-small"
          />
          <Text variant="b1" weight={isUnread ? 'medium' : 'normal'}>
            {twemojify(name)}
            {parentName && (
              <Text variant="b3" span>
                {' — '}
                {twemojify(parentName)}
              </Text>
            )}
          </Text>
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
  parentName: null,
  isSelected: false,
  imageSrc: null,
  iconSrc: null,
  options: null,
};
RoomSelector.propTypes = {
  name: PropTypes.string.isRequired,
  parentName: PropTypes.string,
  roomId: PropTypes.string.isRequired,
  imageSrc: PropTypes.string,
  iconSrc: PropTypes.string,
  isSelected: PropTypes.bool,
  isUnread: PropTypes.bool.isRequired,
  notificationCount: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]).isRequired,
  isAlert: PropTypes.bool.isRequired,
  options: PropTypes.node,
  onClick: PropTypes.func.isRequired,
};

export default RoomSelector;
