import React from 'react';
import PropTypes from 'prop-types';
import './SidebarAvatar.scss';

import { twemojify } from '../../../util/twemojify';

import Avatar from '../../atoms/avatar/Avatar';
import Text from '../../atoms/text/Text';
import Tooltip from '../../atoms/tooltip/Tooltip';
import NotificationBadge from '../../atoms/badge/NotificationBadge';
import { blurOnBubbling } from '../../atoms/button/script';

const SidebarAvatar = React.forwardRef(({
  tooltip, text, bgColor, imageSrc,
  iconSrc, active, onClick, onContextMenu,
  isUnread, notificationCount, isAlert,
}, ref) => {
  let activeClass = '';
  if (active) activeClass = ' sidebar-avatar--active';
  return (
    <Tooltip
      content={<Text variant="b1">{twemojify(tooltip)}</Text>}
      placement="right"
    >
      <button
        ref={ref}
        className={`sidebar-avatar${activeClass}`}
        type="button"
        onMouseUp={(e) => blurOnBubbling(e, '.sidebar-avatar')}
        onClick={onClick}
        onContextMenu={onContextMenu}
      >
        <Avatar
          text={text}
          bgColor={bgColor}
          imageSrc={imageSrc}
          iconSrc={iconSrc}
          size="normal"
        />
        { isUnread && (
          <NotificationBadge
            alert={isAlert}
            content={notificationCount !== 0 ? notificationCount : null}
          />
        )}
      </button>
    </Tooltip>
  );
});
SidebarAvatar.defaultProps = {
  text: null,
  bgColor: 'transparent',
  iconSrc: null,
  imageSrc: null,
  active: false,
  onClick: null,
  onContextMenu: null,
  isUnread: false,
  notificationCount: 0,
  isAlert: false,
};

SidebarAvatar.propTypes = {
  tooltip: PropTypes.string.isRequired,
  text: PropTypes.string,
  bgColor: PropTypes.string,
  imageSrc: PropTypes.string,
  iconSrc: PropTypes.string,
  active: PropTypes.bool,
  onClick: PropTypes.func,
  onContextMenu: PropTypes.func,
  isUnread: PropTypes.bool,
  notificationCount: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  isAlert: PropTypes.bool,
};

export default SidebarAvatar;
