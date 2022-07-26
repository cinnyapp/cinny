import React from 'react';
import PropTypes from 'prop-types';
import './ImagePackItem.scss';

import Avatar from '../../atoms/avatar/Avatar';
import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import RawIcon from '../../atoms/system-icons/RawIcon';

import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';

function ImagePackItem({ url, shortcode, usage }) {
  return (
    <div className="image-pack-item">
      <Avatar imageSrc={url} size="extra-small" text={shortcode} bgColor="black" />
      <div className="image-pack-item__content">
        <Text>{shortcode}</Text>
      </div>
      <div className="image-pack-item__usage">
        <Button>
          <RawIcon src={ChevronBottomIC} size="extra-small" />
          <Text variant="b2">
            {usage === 'emoticon' && 'Emoji'}
            {usage === 'sticker' && 'Sticker'}
            {usage === 'both' && 'Both'}
          </Text>
        </Button>
      </div>
    </div>
  );
}

ImagePackItem.propTypes = {
  url: PropTypes.string.isRequired,
  shortcode: PropTypes.string.isRequired,
  usage: PropTypes.oneOf(['emoticon', 'sticker', 'both']).isRequired,
};

export default ImagePackItem;
