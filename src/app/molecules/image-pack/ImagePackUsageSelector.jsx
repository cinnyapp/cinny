import React from 'react';
import PropTypes from 'prop-types';

import { useTranslation } from 'react-i18next';
import { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';
import CheckIC from '../../../../public/res/ic/outlined/check.svg';
import '../../i18n';

function ImagePackUsageSelector({ usage, onSelect }) {
  const { t } = useTranslation();
  return (
    <div>
      <MenuHeader>{t('Molecules.ImagePackUsageSelector.header')}</MenuHeader>
      <MenuItem
        iconSrc={usage === 'emoticon' ? CheckIC : undefined}
        variant={usage === 'emoticon' ? 'positive' : 'surface'}
        onClick={() => onSelect('emoticon')}
      >
        {t('Molecules.ImagePackUsageSelector.type_emoji')}
      </MenuItem>
      <MenuItem
        iconSrc={usage === 'sticker' ? CheckIC : undefined}
        variant={usage === 'sticker' ? 'positive' : 'surface'}
        onClick={() => onSelect('sticker')}
      >
        {t('Molecules.ImagePackUsageSelector.type_sticker')}
      </MenuItem>
      <MenuItem
        iconSrc={usage === 'both' ? CheckIC : undefined}
        variant={usage === 'both' ? 'positive' : 'surface'}
        onClick={() => onSelect('both')}
      >
        {t('Molecules.ImagePackUsageSelector.type_both')}
      </MenuItem>
    </div>
  );
}

ImagePackUsageSelector.propTypes = {
  usage: PropTypes.oneOf(['emoticon', 'sticker', 'both']).isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default ImagePackUsageSelector;
