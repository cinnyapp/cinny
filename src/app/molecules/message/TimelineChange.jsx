import React from 'react';
import PropTypes from 'prop-types';
import './TimelineChange.scss';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';

import JoinArrowIC from '../../../../public/res/ic/outlined/join-arrow.svg';
import LeaveArrowIC from '../../../../public/res/ic/outlined/leave-arrow.svg';
import InviteArrowIC from '../../../../public/res/ic/outlined/invite-arrow.svg';
import InviteCancelArrowIC from '../../../../public/res/ic/outlined/invite-cancel-arrow.svg';
import UserIC from '../../../../public/res/ic/outlined/user.svg';
import PencilIC from '../../../../public/res/ic/outlined/pencil.svg';

function TimelineChange({
  variant, content, time, onClick,
}) {
  let iconSrc;

  switch (variant) {
    case 'join':
      iconSrc = JoinArrowIC;
      break;
    case 'leave':
      iconSrc = LeaveArrowIC;
      break;
    case 'invite':
      iconSrc = InviteArrowIC;
      break;
    case 'invite-cancel':
      iconSrc = InviteCancelArrowIC;
      break;
    case 'avatar':
      iconSrc = UserIC;
      break;
    case 'edit':
      iconSrc = PencilIC;
      break;
    default:
      iconSrc = JoinArrowIC;
      break;
  }

  return (
    <button style={{ cursor: onClick === null ? 'default' : 'pointer' }} onClick={onClick} type="button" className="timeline-change">
      <div className="timeline-change__avatar-container">
        <RawIcon src={iconSrc} size="extra-small" />
      </div>
      <div className="timeline-change__content">
        <Text variant="b2">
          {content}
        </Text>
      </div>
      <div className="timeline-change__time">
        <Text variant="b3">{time}</Text>
      </div>
    </button>
  );
}

TimelineChange.defaultProps = {
  variant: 'other',
  onClick: null,
};

TimelineChange.propTypes = {
  variant: PropTypes.oneOf([
    'join', 'leave', 'invite',
    'invite-cancel', 'avatar', 'other',
  ]),
  content: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.node,
  ]).isRequired,
  time: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

export default TimelineChange;
