import React from 'react';
import PropTypes from 'prop-types';
import './DragDrop.scss';

import { useTranslation } from 'react-i18next';

import RawModal from '../../atoms/modal/RawModal';
import Text from '../../atoms/text/Text';

import '../../i18n';

function DragDrop({ isOpen }) {
  const { t } = useTranslation();

  return (
    <RawModal
      className="drag-drop__modal"
      overlayClassName="drag-drop__overlay"
      isOpen={isOpen}
    >
      <Text variant="h2" weight="medium">{t('Organisms.DragDrop.drop_file_to_upload_prompt')}</Text>
    </RawModal>
  );
}

DragDrop.propTypes = {
  isOpen: PropTypes.bool.isRequired,
};

export default DragDrop;
