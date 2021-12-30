import React from 'react';
import PropTypes from 'prop-types';
import './RawIcon.scss';

function RawIcon({
  color, size, src, isImage,
}) {
  const style = {};
  if (color !== null) style.backgroundColor = color;
  if (isImage) {
    style.backgroundColor = 'transparent';
    style.backgroundImage = `url(${src})`;
  } else {
    style.WebkitMaskImage = `url(${src})`;
    style.maskImage = `url(${src})`;
  }

  return <span className={`ic-raw ic-raw-${size}`} style={style}> </span>;
}

RawIcon.defaultProps = {
  color: null,
  size: 'normal',
  isImage: false,
};

RawIcon.propTypes = {
  color: PropTypes.string,
  size: PropTypes.oneOf(['large', 'normal', 'small', 'extra-small']),
  src: PropTypes.string.isRequired,
  isImage: PropTypes.bool,
};

export default RawIcon;
