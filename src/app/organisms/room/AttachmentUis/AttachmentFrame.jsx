/* eslint-disable react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import FileAttachedIndicator from './FileAttachedIndicator';
import attachmentUis from './attachmentUis';

function AttachmentFrame({
  attachmentOrUi,
  fileSetter,
  uploadProgressRef,
}) {
  // To enable child components to learn how to attach their result
  let submission;
  const fnHowToSubmit = (func) => {
    submission = func;
    fileSetter(submission);
  };

  // If there already is an attachment, show it
  if (typeof attachmentOrUi === 'object') {
    return (
      <FileAttachedIndicator
        attachmentOrUi={attachmentOrUi}
        uploadProgressRef={uploadProgressRef}
      />
    );
  }

  // Show the desired UI
  const UiComponent = attachmentUis.get(attachmentOrUi).component;
  return (<UiComponent fnHowToSubmit={fnHowToSubmit} />);
}

AttachmentFrame.propTypes = {
  attachmentOrUi: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  fileSetter: PropTypes.func.isRequired,
  uploadProgressRef: PropTypes.shape().isRequired,
};

export default AttachmentFrame;
