import React from 'react';
import PropTypes from 'prop-types';
import './TimelineChange.scss';

// import Linkify from 'linkifyjs/react';

import { Text } from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';

import JoinArraowIC from '../../../../public/res/ic/outlined/join-arrow.svg';
import LeaveArraowIC from '../../../../public/res/ic/outlined/leave-arrow.svg';
import InviteArraowIC from '../../../../public/res/ic/outlined/invite-arrow.svg';
import InviteCancelArraowIC from '../../../../public/res/ic/outlined/invite-cancel-arrow.svg';
import UserIC from '../../../../public/res/ic/outlined/user.svg';
import TickMarkIC from '../../../../public/res/ic/outlined/tick-mark.svg';

function TimelineChange({ variant, content, time }) {
  let iconSrc;

  switch (variant) {
    case 'join':
      iconSrc = JoinArraowIC;
      break;
    case 'leave':
      iconSrc = LeaveArraowIC;
      break;
    case 'invite':
      iconSrc = InviteArraowIC;
      break;
    case 'invite-cancel':
      iconSrc = InviteCancelArraowIC;
      break;
    case 'avatar':
      iconSrc = UserIC;
      break;
    case 'follow':
      iconSrc = TickMarkIC;
      break;
    default:
      iconSrc = JoinArraowIC;
      break;
  }

  return (
    <div className="timeline-change">
      <div className="timeline-change__avatar-container">
        <RawIcon src={iconSrc} size="extra-small" />
      </div>
      <div className="timeline-change__content">
        <Text variant="b2">
          {content}
          {/* <Linkify options={{ target: { url: '_blank' } }}>{content}</Linkify> */}
        </Text>
      </div>
      <div className="timeline-change__time">
        <Text variant="b3">{time}</Text>
      </div>
    </div>
  );
}

TimelineChange.defaultProps = {
  variant: 'other',
};

TimelineChange.propTypes = {
  variant: PropTypes.oneOf([
    'join', 'leave', 'invite',
    'invite-cancel', 'avatar', 'other',
    'follow',
  ]),
  content: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.node,
  ]).isRequired,
  time: PropTypes.string.isRequired,
};

export default TimelineChange;
