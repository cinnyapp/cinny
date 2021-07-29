import React from 'react';
import PropTypes from 'prop-types';
import './SidebarAvatar.scss';

import Tippy from '@tippyjs/react';
import Avatar from '../../atoms/avatar/Avatar';
import {Text} from '../../atoms/text/Text';
import NotificationBadge from '../../atoms/badge/NotificationBadge';
import { blurOnBubbling } from '../../atoms/button/script';

const SidebarAvatar = React.forwardRef(({
  tooltip, text, bgColor, imageSrc,
  iconSrc, active, onClick, notifyCount,
}, ref) => {
  let activeClass = '';
  if (active) activeClass = ' sidebar-avatar--active';
  return (
    <Tippy
      content={<Text variant="b1">{tooltip}</Text>}
      className="sidebar-avatar-tippy"
      touch="hold"
      arrow={false}
      placement="right"
      maxWidth={200}
      delay={[0, 0]}
      duration={[100, 0]}
      offset={[0, 0]}
    >
      <button
        ref={ref}
        className={`sidebar-avatar${activeClass}`}
        type="button"
        onMouseUp={(e) => blurOnBubbling(e, '.sidebar-avatar')}
        onClick={onClick}
      >
        <Avatar
          text={text}
          bgColor={bgColor}
          imageSrc={imageSrc}
          iconSrc={iconSrc}
          size="normal"
        />
        { notifyCount !== null && <NotificationBadge alert>{notifyCount}</NotificationBadge> }
      </button>
    </Tippy>
  );
});
SidebarAvatar.defaultProps = {
  text: null,
  bgColor: 'transparent',
  iconSrc: null,
  imageSrc: null,
  active: false,
  onClick: null,
  notifyCount: null,
};

SidebarAvatar.propTypes = {
  tooltip: PropTypes.string.isRequired,
  text: PropTypes.string,
  bgColor: PropTypes.string,
  imageSrc: PropTypes.string,
  iconSrc: PropTypes.string,
  active: PropTypes.bool,
  onClick: PropTypes.func,
  notifyCount: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
};

export default SidebarAvatar;
