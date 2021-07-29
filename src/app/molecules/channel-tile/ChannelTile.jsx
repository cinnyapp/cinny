import React from 'react';
import PropTypes from 'prop-types';
import './ChannelTile.scss';

import Linkify from 'linkifyjs/react';
import colorMXID from '../../../util/colorMXID';

import {Text} from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';

function linkifyContent(content) {
  return <Linkify options={{ target: { url: '_blank' } }}>{content}</Linkify>;
}

function ChannelTile({
  avatarSrc, name, id,
  inviterName, memberCount, desc, options,
}) {
  return (
    <div className="channel-tile">
      <div className="channel-tile__avatar">
        <Avatar
          imageSrc={avatarSrc}
          bgColor={colorMXID(id)}
          text={name.slice(0, 1)}
        />
      </div>
      <div className="channel-tile__content">
        <Text variant="s1">{name}</Text>
        <Text variant="b3">
          {
            inviterName !== null
              ? `Invited by ${inviterName} to ${id}${memberCount === null ? '' : ` • ${memberCount} members`}`
              : id + (memberCount === null ? '' : ` • ${memberCount} members`)
          }
        </Text>
        {
          desc !== null && (typeof desc === 'string')
            ? <Text className="channel-tile__content__desc" variant="b2">{linkifyContent(desc)}</Text>
            : desc
        }
      </div>
      { options !== null && (
        <div className="channel-tile__options">
          {options}
        </div>
      )}
    </div>
  );
}

ChannelTile.defaultProps = {
  avatarSrc: null,
  inviterName: null,
  options: null,
  desc: null,
  memberCount: null,
};
ChannelTile.propTypes = {
  avatarSrc: PropTypes.string,
  name: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  inviterName: PropTypes.string,
  memberCount: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  desc: PropTypes.node,
  options: PropTypes.node,
};

export default ChannelTile;
