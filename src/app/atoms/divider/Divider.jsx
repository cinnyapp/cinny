import React from 'react';
import PropTypes from 'prop-types';
import './Divider.scss';

import Text from '../text/Text';

function Divider({ text, variant, align }) {
  const dividerClass = ` divider--${variant} divider--${align}`;
  return (
    <div className={`divider${dividerClass}`}>
      {text !== null && <Text className="divider__text" variant="b3" weight="bold">{text}</Text>}
    </div>
  );
}

Divider.defaultProps = {
  text: null,
  variant: 'surface',
  align: 'center',
};

Divider.propTypes = {
  text: PropTypes.string,
  variant: PropTypes.oneOf(['surface', 'primary', 'positive', 'caution', 'danger']),
  align: PropTypes.oneOf(['left', 'center', 'right']),
};

export default Divider;
