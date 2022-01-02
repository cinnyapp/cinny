import React from 'react';
import PropTypes from 'prop-types';
import IconButton from '../../atoms/button/IconButton';
import CirclePlusIC from '../../../../public/res/ic/outlined/circle-plus.svg';
import FileIC from '../../../../public/res/ic/outlined/file.svg';
import ContextMenu, { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';

const AttachmentTypes = {
  remove: 'remove',
  file: 'file',
  voice: 'voice',
  currentLocation: 'currentLocation',
};

function AttachmentTypeSelector({ alreadyHasAttachment, actOnAttaching }) {
  return (
    <ContextMenu
      maxWidth={200}
      content={(toggleMenu) => (
        <>
          <MenuHeader>Attachment</MenuHeader>
          <MenuItem
            onClick={() => {
              toggleMenu(); actOnAttaching(AttachmentTypes.file);
            }}
            iconSrc={FileIC}
          >
            File
          </MenuItem>
          <MenuItem
            onClick={() => {
              toggleMenu(); actOnAttaching(AttachmentTypes.voice);
            }}
          >
            Audio
          </MenuItem>
        </>
      )}
      render={(toggleMenu) => (
        <IconButton
          onClick={() => {
            if (!alreadyHasAttachment) {
              toggleMenu();
            } else {
              actOnAttaching(AttachmentTypes.remove);
            }
          }}
          tooltip={alreadyHasAttachment ? 'Cancel' : 'Select attachment'}
          src={CirclePlusIC}
        />
      )}
    />
  );
}

AttachmentTypeSelector.propTypes = {
  alreadyHasAttachment: PropTypes.bool,
  actOnAttaching: PropTypes.func,
};

AttachmentTypeSelector.defaultProps = {
  alreadyHasAttachment: false,
  actOnAttaching: null,
};

export { AttachmentTypeSelector, AttachmentTypes };
