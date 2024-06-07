import React from 'react';
import PropTypes from 'prop-types';
import './PeopleSelector.scss';

import { blurOnBubbling } from '../../atoms/button/script';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';

function PeopleSelector({ avatarSrc, name, color, peopleRole, onClick }) {
  return (
    <div className="people-selector__container">
      <button
        className="people-selector"
        onMouseUp={(e) => blurOnBubbling(e, '.people-selector')}
        onClick={onClick}
        type="button"
      >
        <Avatar imageSrc={avatarSrc} text={name} bgColor={color} size="extra-small" />
        <Text className="people-selector__name" variant="b1">
          {name}
        </Text>
        {peopleRole !== null && (
          <Text className="people-selector__role" variant="b3">
            {peopleRole}
          </Text>
        )}
      </button>
    </div>
  );
}

PeopleSelector.defaultProps = {
  avatarSrc: null,
  peopleRole: null,
};

PeopleSelector.propTypes = {
  avatarSrc: PropTypes.string,
  name: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  peopleRole: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

export default PeopleSelector;
