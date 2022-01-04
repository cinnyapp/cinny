import React, { useRef } from 'react';
import PropTypes, { func } from 'prop-types';
import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import VolumeFullIC from '../../../../public/res/ic/outlined/volume-full.svg';
import IconButton from '../../atoms/button/IconButton';

let _stream;
let _mediaRecorder;
const audioChunks = [];

console.log('record voice, new recorder');
// TODO: Check if supported

navigator.mediaDevices.getUserMedia({ audio: true })
  .then((stream) => {
    _stream = stream;
    _mediaRecorder = new MediaRecorder(_stream);

    _mediaRecorder.start();

    _mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
    _mediaRecorder.onerror = (error) => {
      console.log(error);
      _mediaRecorder.stop();
    };
  })
  .catch(console.log);

// TODO: Handle turning off the recorder to remove the browser indicator
function VoiceMailRecorder({ fnCancel, fnRequestResult, fnHowToSubmit }) {
  const [state, setState] = React.useState('unknown');

  while (!_mediaRecorder) {
    // Blocking
  }

  _mediaRecorder.onstop = () => setState('stopped');
  _mediaRecorder.onstart = () => setState('started');
  _mediaRecorder.onpause = () => setState('paused');
  _mediaRecorder.onresume = () => setState('resumed');

  function pauseRec() {
    if (_mediaRecorder.state === 'recording') {
      _mediaRecorder.pause();
      console.log('pause');
    }
  }
  function startOrResumeRec() {
    if (_mediaRecorder.state === 'paused') {
      _mediaRecorder.resume();
      console.log('resume');
    } else if (_mediaRecorder.state === 'inactive') {
      audioChunks.length = 0;
      _mediaRecorder.start();
      console.log('start');
    }
  }
  function restartRec() {
    _mediaRecorder.stop();
    startOrResumeRec();
  }

  function stopAndSubmit() {
    _mediaRecorder.stop();

    _stream.getTracks().forEach((track) => track.stop());

    const opts = { type: 'audio/webm' };
    const audioBlob = new Blob(audioChunks, opts);

    const audioFile = new File([audioBlob], 'voicemail.webm', opts);
    fnHowToSubmit(audioFile);
  }
  fnCancel(stopAndSubmit);

  return (
    <div className="room-attachment">
      <div className="room-attachment__preview">
        <RawIcon src={VolumeFullIC} />
      </div>
      <div className="room-attachment__info">
        <Text variant="b1">Recording...{state}</Text>
        <Text variant="b3">{`for: ${'some time '}`}</Text>
        <button onClick={pauseRec} type="button">Pause</button>
        <button onClick={startOrResumeRec} type="button">Start</button>
        <button onClick={startOrResumeRec} type="button">Stop</button>
        <button onClick={restartRec} type="button">Restart</button>
        <button onClick={fnHowToSubmit(stopAndSubmit)} type="submit">Submit</button>
      </div>
    </div>
  );
}

VoiceMailRecorder.propTypes = {
  fnCancel: PropTypes.func.isRequired,
  fnRequestResult: PropTypes.func.isRequired,
  fnHowToSubmit: PropTypes.func.isRequired,
};

export { VoiceMailRecorder };
