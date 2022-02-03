import React from 'react';
import PropTypes from 'prop-types';
import './DragDrop.scss';

import RawModal from '../../atoms/modal/RawModal';
import Text from '../../atoms/text/Text';

function DragDrop({ isOpen }) {
  return (
    <RawModal
      className="drag-drop__model dialog-model"
      isOpen={isOpen}
      size="small"
    >
      <div className="drag-drop">
        <Text variant="s1" weight="medium">Drop file to upload</Text>
      </div>
    </RawModal>
  );
}

DragDrop.propTypes = {
  isOpen: PropTypes.bool.isRequired,
};

export default DragDrop;
