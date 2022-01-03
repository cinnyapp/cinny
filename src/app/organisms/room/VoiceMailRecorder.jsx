import React from 'react';
import PropTypes from 'prop-types';
import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import VolumeFullIC from '../../../../public/res/ic/outlined/volume-full.svg';

function VoiceMailRecorder({ returnedFileHandler, attachmentOrUi }) {
  let mediaRecorder;

  const recordVoice = () => {
    console.log('record voice, new recorder');
    // TODO: Check if supported

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();
        const audioChunks = [];

        mediaRecorder.addEventListener('dataavailable', (event) => {
          audioChunks.push(event.data);
        });
        mediaRecorder.addEventListener('error', (error) => {
          console.log(error);
          mediaRecorder.stop();
        });
        mediaRecorder.addEventListener('stop', () => {
          const opts = { type: 'audio/webm' };
          const audioBlob = new Blob(audioChunks, opts);

          const audioFile = new File([audioBlob], 'voicemail.webm', opts);
          console.log(`attachmentOrUi is ${attachmentOrUi}`);
          returnedFileHandler(audioFile);
        });

        // Voicemails too long are not nice, lets forbid them!
        setTimeout(() => {
          mediaRecorder.stop();
        }, 5000); // 1 hour 3600000
      })
      .catch(console.log);
  };

  recordVoice();

  return (
    <div className="room-attachment">
      Voice recorder
      <div className="room-attachment__preview">
        <RawIcon src={VolumeFullIC} />
      </div>
      <div className="room-attachment__info">
        <Text variant="b1">Recording...</Text>
        <Text variant="b3">{`for: ${'some time '}`}</Text>
      </div>
    </div>
  );
}

VoiceMailRecorder.propTypes = {
  returnedFileHandler: PropTypes.func.isRequired,
  attachmentOrUi: PropTypes.node.isRequired,
};

export { VoiceMailRecorder };
