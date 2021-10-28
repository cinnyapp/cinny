import React from 'react';
import PropTypes from 'prop-types';
import './RoomIntro.scss';

import Linkify from 'linkify-react';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';

function linkifyContent(content) {
  return <Linkify options={{ target: { url: '_blank' } }}>{content}</Linkify>;
}

function RoomIntro({
  roomId, avatarSrc, name, heading, desc, time,
}) {
  return (
    <div className="room-intro">
      <Avatar imageSrc={avatarSrc} text={name.slice(0, 1)} bgColor={colorMXID(roomId)} size="large" />
      <div className="room-intro__content">
        <Text className="room-intro__name" variant="h1">{heading}</Text>
        <Text className="room-intro__desc" variant="b1">{linkifyContent(desc)}</Text>
        { time !== null && <Text className="room-intro__time" variant="b3">{time}</Text>}
      </div>
    </div>
  );
}

RoomIntro.defaultProps = {
  avatarSrc: null,
  time: null,
};

RoomIntro.propTypes = {
  roomId: PropTypes.string.isRequired,
  avatarSrc: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
  ]),
  name: PropTypes.string.isRequired,
  heading: PropTypes.string.isRequired,
  desc: PropTypes.string.isRequired,
  time: PropTypes.string,
};

export default RoomIntro;
