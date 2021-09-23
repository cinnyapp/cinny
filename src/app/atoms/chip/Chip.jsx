import React from 'react';
import PropTypes from 'prop-types';
import './Chip.scss';

import Text from '../text/Text';
import RawIcon from '../system-icons/RawIcon';

function Chip({
  iconSrc, iconColor, text, children,
}) {
  return (
    <div className="chip">
      {iconSrc != null && <RawIcon src={iconSrc} color={iconColor} size="small" />}
      {(text != null && text !== '') && <Text variant="b2">{text}</Text>}
      {children}
    </div>
  );
}

Chip.propTypes = {
  iconSrc: PropTypes.string,
  iconColor: PropTypes.string,
  text: PropTypes.string,
  children: PropTypes.element,
};

Chip.defaultProps = {
  iconSrc: null,
  iconColor: null,
  text: null,
  children: null,
};

export default Chip;
