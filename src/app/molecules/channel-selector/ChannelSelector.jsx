import React from 'react';
import PropTypes from 'prop-types';
import './ChannelSelector.scss';

import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import NotificationBadge from '../../atoms/badge/NotificationBadge';
import { blurOnBubbling } from '../../atoms/button/script';

function ChannelSelectorWrapper({
  isSelected, onClick, content, options,
}) {
  return (
    <div className={`channel-selector${isSelected ? ' channel-selector--selected' : ''}`}>
      <button
        className="channel-selector__content"
        type="button"
        onClick={onClick}
        onMouseUp={(e) => blurOnBubbling(e, '.channel-selector')}
      >
        {content}
      </button>
      <div className="channel-selector__options">{options}</div>
    </div>
  );
}
ChannelSelectorWrapper.defaultProps = {
  options: null,
};
ChannelSelectorWrapper.propTypes = {
  isSelected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  content: PropTypes.node.isRequired,
  options: PropTypes.node,
};

function ChannelSelector({
  name, roomId, imageSrc, iconSrc,
  isSelected, isUnread, notificationCount, isAlert,
  options, onClick,
}) {
  return (
    <ChannelSelectorWrapper
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
ChannelSelector.defaultProps = {
  imageSrc: null,
  iconSrc: null,
  options: null,
};
ChannelSelector.propTypes = {
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

export default ChannelSelector;
