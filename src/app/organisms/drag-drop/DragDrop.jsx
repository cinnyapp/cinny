import React from 'react';
import PropTypes from 'prop-types';
import './DragDrop.scss';

import RawModal from '../../atoms/modal/RawModal';
import Text from '../../atoms/text/Text';

function DragDrop({ isOpen }) {
  return (
    <RawModal
      className="drag-drop__modal"
      overlayClassName="drag-drop__overlay"
      isOpen={isOpen}
    >
      <Text variant="h2" weight="medium">Drop file to upload</Text>
    </RawModal>
  );
}

DragDrop.propTypes = {
  isOpen: PropTypes.bool.isRequired,
};

export default DragDrop;
