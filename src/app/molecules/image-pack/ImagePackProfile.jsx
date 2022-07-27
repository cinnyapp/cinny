import React from 'react';
import PropTypes from 'prop-types';
import './ImagePackProfile.scss';

import { openReusableContextMenu } from '../../../client/action/navigation';
import { getEventCords } from '../../../util/common';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import ImagePackUsageSelector from './ImagePackUsageSelector';

import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';
import PencilIC from '../../../../public/res/ic/outlined/pencil.svg';

function ImagePackProfile({
  avatarUrl, displayName, attribution, usage, onUsageChange, onEdit,
}) {
  const handleUsageSelect = (event) => {
    openReusableContextMenu(
      'bottom',
      getEventCords(event, '.btn-surface'),
      (closeMenu) => (
        <ImagePackUsageSelector
          usage={usage}
          onSelect={(newUsage) => {
            onUsageChange(newUsage);
            closeMenu();
          }}
        />
      ),
    );
  };

  return (
    <div className="image-pack-profile">
      <Avatar text={displayName} bgColor="blue" imageSrc={avatarUrl} size="normal" />
      <div className="image-pack-profile__content">
        <div>
          <Text>{displayName}</Text>
          {onEdit && <IconButton size="extra-small" onClick={onEdit} src={PencilIC} tooltip="Edit" />}
        </div>
        {attribution && <Text variant="b3">{attribution}</Text>}
      </div>
      <div className="image-pack-profile__usage">
        <Text variant="b3">Pack usage</Text>
        <Button
          onClick={onUsageChange ? handleUsageSelect : undefined}
          iconSrc={onUsageChange ? ChevronBottomIC : null}
        >
          <Text>
            {usage === 'emoticon' && 'Emoji'}
            {usage === 'sticker' && 'Sticker'}
            {usage === 'both' && 'Both'}
          </Text>
        </Button>
      </div>
    </div>
  );
}

ImagePackProfile.defaultProps = {
  avatarUrl: null,
  attribution: null,
  onUsageChange: null,
  onEdit: null,
};
ImagePackProfile.propTypes = {
  avatarUrl: PropTypes.string,
  displayName: PropTypes.string.isRequired,
  attribution: PropTypes.string,
  usage: PropTypes.oneOf(['emoticon', 'sticker', 'both']).isRequired,
  onUsageChange: PropTypes.func,
  onEdit: PropTypes.func,
};

export default ImagePackProfile;
