import React from 'react';
import PropTypes from 'prop-types';
import IconButton from '../../../atoms/button/IconButton';
import CirclePlusIC from '../../../../../public/res/ic/outlined/circle-plus.svg';
import PlusIC from '../../../../../public/res/ic/outlined/plus.svg';
import ContextMenu, { MenuHeader, MenuItem } from '../../../atoms/context-menu/ContextMenu';
import attachmentUiFrameTypes from './attachmentUis';

function AttachmentTypeSelector({ alreadyHasAttachment, actOnAttaching }) {
  function getList(toggleMenu) {
    const list = [];

    attachmentUiFrameTypes.forEach((obj, key) => {
      // Entries have to have an icon
      const icon = obj.icon ?? PlusIC;

      list.push(
        <MenuItem
          // This does not matter
          // eslint-disable-next-line react/no-array-index-key
          key={`attachmentUiListItem-${key}`}
          onClick={() => {
            toggleMenu();
            actOnAttaching(key);
          }}
          iconSrc={icon}
        >
          {obj.fullName}
        </MenuItem>,
      );
    });

    return list;
  }

  return (
    <ContextMenu
      maxWidth={200}
      content={(toggleMenu) => (
        <div>
          <MenuHeader>Attachment</MenuHeader>
          {getList(toggleMenu)}
        </div>
      )}
      render={(toggleMenu) => (
        <IconButton
          onClick={() => {
            if (!alreadyHasAttachment) {
              toggleMenu();
            } else {
              actOnAttaching(attachmentUiFrameTypes.none);
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
  actOnAttaching: PropTypes.func.isRequired,
};

AttachmentTypeSelector.defaultProps = {
  alreadyHasAttachment: false,
};

export default AttachmentTypeSelector;
