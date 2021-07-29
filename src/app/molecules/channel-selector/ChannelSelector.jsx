import React from 'react';
import PropTypes from 'prop-types';
import './ChannelSelector.scss';

import colorMXID from '../../../util/colorMXID';

import {Text} from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import NotificationBadge from '../../atoms/badge/NotificationBadge';
import { blurOnBubbling } from '../../atoms/button/script';

function ChannelSelector({
  selected, unread, notificationCount, alert,
  iconSrc, imageSrc, roomId, onClick, children,
}) {
  return (
    <button
      className={`channel-selector__button-wrapper${selected ? ' channel-selector--selected' : ''}`}
      type="button"
      onClick={onClick}
      onMouseUp={(e) => blurOnBubbling(e, '.channel-selector__button-wrapper')}
    >
      <div className="channel-selector">
        <div className="channel-selector__icon flex--center">
          <Avatar
            text={children.slice(0, 1)}
            bgColor={colorMXID(roomId)}
            imageSrc={imageSrc}
            iconSrc={iconSrc}
            size="extra-small"
          />
        </div>
        <div className="channel-selector__text-container">
          <Text variant="b1">{children}</Text>
        </div>
        <div className="channel-selector__badge-container">
          {
            notificationCount !== 0
              ? unread && (
                <NotificationBadge alert={alert}>
                  {notificationCount}
                </NotificationBadge>
              )
              : unread && <div className="channel-selector--unread" />
          }
        </div>
      </div>
    </button>
  );
}

ChannelSelector.defaultProps = {
  selected: false,
  unread: false,
  notificationCount: 0,
  alert: false,
  iconSrc: null,
  imageSrc: null,
};

ChannelSelector.propTypes = {
  selected: PropTypes.bool,
  unread: PropTypes.bool,
  notificationCount: PropTypes.number,
  alert: PropTypes.bool,
  iconSrc: PropTypes.string,
  imageSrc: PropTypes.string,
  roomId: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  children: PropTypes.string.isRequired,
};

export default ChannelSelector;
