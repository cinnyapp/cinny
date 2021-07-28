import React from 'react';
import PropTypes from 'prop-types';
import './Divider.scss';

import Text from '../text/Text';

function Divider({ text, variant }) {
  const dividerClass = ` divider--${variant}`;
  return (
    <div className={`divider${dividerClass}`}>
      {text !== false && <Text className="divider__text" variant="b3">{text}</Text>}
    </div>
  );
}

Divider.defaultProps = {
  text: false,
  variant: 'surface',
};

Divider.propTypes = {
  text: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
  ]),
  variant: PropTypes.oneOf(['surface', 'primary', 'caution', 'danger']),
};

export default Divider;
