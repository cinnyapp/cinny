import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Avatar.scss';

import { twemojify } from '../../../util/twemojify';

import Text from '../text/Text';
import RawIcon from '../system-icons/RawIcon';

function Avatar({
  text, bgColor, iconSrc, iconColor, imageSrc, size,
}) {
  const [image, updateImage] = useState(imageSrc);
  let textSize = 's1';
  if (size === 'large') textSize = 'h1';
  if (size === 'small') textSize = 'b1';
  if (size === 'extra-small') textSize = 'b3';

  useEffect(() => updateImage(imageSrc), [imageSrc]);

  return (
    <div className={`avatar-container avatar-container__${size} noselect`}>
      {
        image !== null
          ? <img draggable="false" src={image} onError={() => updateImage(null)} alt="avatar" />
          : (
            <span
              style={{ backgroundColor: iconSrc === null ? bgColor : 'transparent' }}
              className={`avatar__border${iconSrc !== null ? ' avatar__bordered' : ''} inline-flex--center`}
            >
              {
                iconSrc !== null
                  ? <RawIcon size={size} src={iconSrc} color={iconColor} />
                  : text !== null && (
                    <Text variant={textSize} primary>
                      {twemojify([...text][0])}
                    </Text>
                  )
              }
            </span>
          )
      }
    </div>
  );
}

Avatar.defaultProps = {
  text: null,
  bgColor: 'transparent',
  iconSrc: null,
  iconColor: null,
  imageSrc: null,
  size: 'normal',
};

Avatar.propTypes = {
  text: PropTypes.string,
  bgColor: PropTypes.string,
  iconSrc: PropTypes.string,
  iconColor: PropTypes.string,
  imageSrc: PropTypes.string,
  size: PropTypes.oneOf(['large', 'normal', 'small', 'extra-small']),
};

export default Avatar;
