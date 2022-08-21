import React from 'react';
import PropTypes from 'prop-types';
import './RoomTile.scss';

import { useTranslation } from 'react-i18next';
import { twemojify } from '../../../util/twemojify';

import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';

import '../../i18n';

function RoomTile({
  avatarSrc, name, id,
  inviterName, memberCount, desc, options,
}) {
  const { t } = useTranslation();

  return (
    <div className="room-tile">
      <div className="room-tile__avatar">
        <Avatar
          imageSrc={avatarSrc}
          bgColor={colorMXID(id)}
          text={name}
        />
      </div>
      <div className="room-tile__content">
        <Text variant="s1">{twemojify(name)}</Text>
        <Text variant="b3">
          {
            inviterName !== null
              ? t('Molecules.RoomTile.invited_by_user', { inviter: inviterName, count: memberCount || 0, id })
              : t('Molecules.RoomTile.invited', { count: memberCount || 0, id })
          }
        </Text>
        {
          desc !== null && (typeof desc === 'string')
            ? <Text className="room-tile__content__desc" variant="b2">{twemojify(desc, undefined, true)}</Text>
            : desc
        }
      </div>
      { options !== null && (
        <div className="room-tile__options">
          {options}
        </div>
      )}
    </div>
  );
}

RoomTile.defaultProps = {
  avatarSrc: null,
  inviterName: null,
  options: null,
  desc: null,
  memberCount: null,
};
RoomTile.propTypes = {
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

export default RoomTile;
