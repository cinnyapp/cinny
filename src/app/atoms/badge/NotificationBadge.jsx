import React from 'react';
import PropTypes from 'prop-types';
import './NotificationBadge.scss';

import {Text} from '../text/Text';

function NotificationBadge({ alert, children }) {
  const notificationClass = alert ? ' notification-badge--alert' : '';
  return (
    <div className={`notification-badge${notificationClass}`}>
      <Text variant="b3">{children}</Text>
    </div>
  );
}

NotificationBadge.defaultProps = {
  alert: false,
};

NotificationBadge.propTypes = {
  alert: PropTypes.bool,
  children: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]).isRequired,
};

export default NotificationBadge;
