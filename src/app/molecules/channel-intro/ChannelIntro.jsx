import React from 'react';
import PropTypes from 'prop-types';
import './ChannelIntro.scss';

import Linkify from 'linkifyjs/react';
import colorMXID from '../../../util/colorMXID';

import {Text} from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';

function linkifyContent(content) {
  return <Linkify options={{ target: { url: '_blank' } }}>{content}</Linkify>;
}

function ChannelIntro({
  avatarSrc, name, heading, desc, time,
}) {
  return (
    <div className="channel-intro">
      <Avatar imageSrc={avatarSrc} text={name.slice(0, 1)} bgColor={colorMXID(name)} size="large" />
      <div className="channel-intro__content">
        <Text className="channel-intro__name" variant="h1">{heading}</Text>
        <Text className="channel-intro__desc" variant="b1">{linkifyContent(desc)}</Text>
        { time !== null && <Text className="channel-intro__time" variant="b3">{time}</Text>}
      </div>
    </div>
  );
}

ChannelIntro.defaultProps = {
  avatarSrc: false,
  time: null,
};

ChannelIntro.propTypes = {
  avatarSrc: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
  ]),
  name: PropTypes.string.isRequired,
  heading: PropTypes.string.isRequired,
  desc: PropTypes.string.isRequired,
  time: PropTypes.string,
};

export default ChannelIntro;
