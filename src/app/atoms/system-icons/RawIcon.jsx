import React from 'react';
import PropTypes from 'prop-types';
import './RawIcon.scss';

function RawIcon({ color, size, src }) {
  const style = {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
  };
  if (color !== null) style.backgroundColor = color;
  return <span className={`ic-raw ic-raw-${size}`} style={style}> </span>;
}

RawIcon.defaultProps = {
  color: null,
  size: 'normal',
};

RawIcon.propTypes = {
  color: PropTypes.string,
  size: PropTypes.oneOf(['large', 'normal', 'small', 'extra-small']),
  src: PropTypes.string.isRequired,
};

export default RawIcon;
