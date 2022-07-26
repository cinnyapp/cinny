import React from 'react';
import PropTypes from 'prop-types';
import './ImagePackProfile.scss';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';

import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';
import PencilIC from '../../../../public/res/ic/outlined/pencil.svg';

function ImagePackProfile({
  avatarUrl, displayName, attribution, usage, onUsage, onEdit,
}) {
  return (
    <div className="image-pack-profile">
      <Avatar text={displayName} bgColor="blue" imageSrc={avatarUrl} size="normal" />
      <div className="image-pack-profile__content">
        <div>
          <Text>{displayName}</Text>
          {onEdit && <IconButton size="extra-small" onClick={onEdit} src={PencilIC} />}
        </div>
        {attribution && <Text variant="b3">{attribution}</Text>}
      </div>
      <div className="image-pack-profile__usage">
        <Text variant="b3">Pack usage</Text>
        <Button iconSrc={onUsage ? ChevronBottomIC : null} onClick={onUsage}>
          {usage === 'emoticon' && 'Emoji'}
          {usage === 'sticker' && 'Sticker'}
          {usage === 'both' && 'Emoji & Sticker'}
        </Button>
      </div>
    </div>
  );
}

ImagePackProfile.defaultProps = {
  avatarUrl: null,
  attribution: null,
  onUsage: null,
  onEdit: null,
};
ImagePackProfile.propTypes = {
  avatarUrl: PropTypes.string,
  displayName: PropTypes.string.isRequired,
  attribution: PropTypes.string,
  usage: PropTypes.oneOf(['emoticon', 'sticker', 'both']).isRequired,
  onUsage: PropTypes.func,
  onEdit: PropTypes.func,
};

export default ImagePackProfile;
