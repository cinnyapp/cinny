import React from 'react';
import PropTypes from 'prop-types';
import './ImagePackItem.scss';

import { useTranslation } from 'react-i18next';
import { openReusableContextMenu } from '../../../client/action/navigation';
import { getEventCords } from '../../../util/common';

import Avatar from '../../atoms/avatar/Avatar';
import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import RawIcon from '../../atoms/system-icons/RawIcon';
import IconButton from '../../atoms/button/IconButton';
import ImagePackUsageSelector from './ImagePackUsageSelector';

import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';
import PencilIC from '../../../../public/res/ic/outlined/pencil.svg';
import BinIC from '../../../../public/res/ic/outlined/bin.svg';

import '../../i18n';

function ImagePackItem({
  url, shortcode, usage, onUsageChange, onDelete, onRename,
}) {
  const { t } = useTranslation();
  const handleUsageSelect = (event) => {
    openReusableContextMenu(
      'bottom',
      getEventCords(event, '.btn-surface'),
      (closeMenu) => (
        <ImagePackUsageSelector
          usage={usage}
          onSelect={(newUsage) => {
            onUsageChange(shortcode, newUsage);
            closeMenu();
          }}
        />
      ),
    );
  };

  return (
    <div className="image-pack-item">
      <Avatar imageSrc={url} size="extra-small" text={shortcode} bgColor="black" />
      <div className="image-pack-item__content">
        <Text>{shortcode}</Text>
      </div>
      <div className="image-pack-item__usage">
        <div className="image-pack-item__btn">
          {onRename && <IconButton tooltip={t('Molecules.ImagePackItem.rename_tooltip')} size="extra-small" src={PencilIC} onClick={() => onRename(shortcode)} />}
          {onDelete && <IconButton tooltip={t('Molecules.ImagePackItem.delete_tooltip')} size="extra-small" src={BinIC} onClick={() => onDelete(shortcode)} />}
        </div>
        <Button onClick={onUsageChange ? handleUsageSelect : undefined}>
          {onUsageChange && <RawIcon src={ChevronBottomIC} size="extra-small" />}
          <Text variant="b2">
            {usage === 'emoticon' && t('Molecules.ImagePackUsageSelector.type_emoji')}
            {usage === 'sticker' && t('Molecules.ImagePackUsageSelector.type_sticker')}
            {usage === 'both' && t('Molecules.ImagePackUsageSelector.type_both')}
          </Text>
        </Button>
      </div>
    </div>
  );
}

ImagePackItem.defaultProps = {
  onUsageChange: null,
  onDelete: null,
  onRename: null,
};
ImagePackItem.propTypes = {
  url: PropTypes.string.isRequired,
  shortcode: PropTypes.string.isRequired,
  usage: PropTypes.oneOf(['emoticon', 'sticker', 'both']).isRequired,
  onUsageChange: PropTypes.func,
  onDelete: PropTypes.func,
  onRename: PropTypes.func,
};

export default ImagePackItem;
