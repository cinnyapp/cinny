/* eslint-disable react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { attachmentUiFrameTypes } from '../AttachmentTypeSelector';
import { VoiceMailRecorder } from './VoiceMailRecorder';
import RawIcon from '../../../atoms/system-icons/RawIcon';
import VLCIC from '../../../../../public/res/ic/outlined/vlc.svg';
import VolumeFullIC from '../../../../../public/res/ic/outlined/volume-full.svg';
import FileIC from '../../../../../public/res/ic/outlined/file.svg';
import Text from '../../../atoms/text/Text';
import { bytesToSize } from '../../../../util/common';

function AttachmentFrame({
  attachmentOrUi,
  fileSetter,
  uploadProgressRef,
  cancelNeedle,
}) {
  function fileAttachedIndicator() {
    console.log(attachmentOrUi.type);
    console.log(typeof attachmentOrUi === 'object');

    // If this is not a file object, how can this be reached?
    if (typeof attachmentOrUi !== 'object') return null;

    const fileType = attachmentOrUi.type.slice(0, attachmentOrUi.type.indexOf('/'));
    return (
      <div className="room-attachment">
        <div className={`room-attachment__preview${fileType !== 'image' ? ' room-attachment__icon' : ''}`}>
          {fileType === 'image' && <img alt={attachmentOrUi.name} src={URL.createObjectURL(attachmentOrUi)} />}
          {fileType === 'video' && <RawIcon src={VLCIC} />}
          {fileType === 'audio' && <RawIcon src={VolumeFullIC} />}
          {fileType !== 'image' && fileType !== 'video' && fileType !== 'audio' && <RawIcon src={FileIC} />}
        </div>
        <div className="room-attachment__info">
          <Text variant="b1">{attachmentOrUi.name}</Text>
          <Text variant="b3"><span ref={uploadProgressRef}>{`size: ${bytesToSize(attachmentOrUi.size)}`}</span></Text>
        </div>
      </div>
    );
  }

  function attachmentFrame() {
    let initStop;
    const fnInitStop = (func) => {
      initStop = func;
      cancelNeedle(initStop);
    };
    let requestResult;
    const fnRequestResult = (func) => {
      requestResult = func;
    };
    let submission;
    const fnHowToSubmit = (func) => {
      submission = func;
      console.log(submission);
      fileSetter(submission);
    };

    // If there already is an attachment, show it
    if (typeof attachmentOrUi === 'object') return fileAttachedIndicator();

    // How to interact with components?
    switch (attachmentOrUi) {
      case attachmentUiFrameTypes.voiceMailRecorder:
        // Not too easy, need to attach function to return the audio blob
        return (
          <VoiceMailRecorder
            fnCancel={fnInitStop}
            fnRequestResult={fnRequestResult}
            fnHowToSubmit={fnHowToSubmit}
          />
        );
      default:
        console.log('unhandled attachmentOrUi');
        return null;
    }
  }
  return attachmentFrame();
}

AttachmentFrame.propTypes = {
  attachmentOrUi: PropTypes.node.isRequired,
  fileSetter: PropTypes.func.isRequired,
  uploadProgressRef: PropTypes.node.isRequired,
  cancelNeedle: PropTypes.func.isRequired,
};

export default AttachmentFrame;
