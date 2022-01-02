import React from 'react';
import PropTypes from 'prop-types';
import IconButton from '../../atoms/button/IconButton';
import CirclePlusIC from '../../../../public/res/ic/outlined/circle-plus.svg';
import ContextMenu, { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';

function AttachmentTypeSelector({ uploadFile }) {
  const recordVoice = () => {
    navigator.getUserMedia = navigator.getUserMedia
                           || navigator.webkitGetUserMedia
                           || navigator.mozGetUserMedia
                           || navigator.msGetUserMedia;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();
        const audioChunks = [];

        mediaRecorder.addEventListener('dataavailable', (event) => {
          audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener('stop', () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm; codecs=opus' });
          const audioUrl = URL.createObjectURL(audioBlob);

          console.log(audioUrl);
        });

        setTimeout(() => {
          mediaRecorder.stop();
        }, 1000); // 1 hour 3600000
      })
      .catch((e) => console.log(e));
  };

  return (
    <ContextMenu
      maxWidth={200}
      content={(toggleMenu) => (
        <>
          <MenuHeader>Attachment</MenuHeader>
          <MenuItem
            onClick={() => {
              uploadFile(); toggleMenu();
            }}
          >
            File
          </MenuItem>
          <MenuItem
            onClick={() => {
              recordVoice(); toggleMenu();
            }}
          >
            Audio
          </MenuItem>

        </>
      )}
      render={(toggleMenu) => (
        <IconButton onClick={toggleMenu} tooltip={true === null ? 'Upload' : 'Cancel'} src={CirclePlusIC} />
      )}
    />
  );
}

AttachmentTypeSelector.propTypes = {
  uploadFile: PropTypes.func,
};

AttachmentTypeSelector.defaultProps = {
  uploadFile: null,
};

export { AttachmentTypeSelector };
