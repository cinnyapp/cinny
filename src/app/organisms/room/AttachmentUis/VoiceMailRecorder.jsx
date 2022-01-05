import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import Text from '../../../atoms/text/Text';
import RawIcon from '../../../atoms/system-icons/RawIcon';
import VolumeFullIC from '../../../../../public/res/ic/outlined/volume-full.svg';
import ChevronBottomIC from '../../../../../public/res/ic/outlined/chevron-bottom.svg';
import ArrowIC from '../../../../../public/res/ic/outlined/leave-arrow.svg';
import PauseIC from '../../../../../public/res/ic/outlined/pause.svg';
import PlayIC from '../../../../../public/res/ic/outlined/play.svg';
import IconButton from '../../../atoms/button/IconButton';
import './VoiceMailRecorder.scss';
import Timer from '../../../../util/Timer';

let timer = new Timer();

let _stream;
let _mediaRecorder;
const audioChunks = [];

// TODO: Check if supported

async function init() {
  if (_mediaRecorder) return;

  console.log('record voice, new recorder');
  _stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  _mediaRecorder = new MediaRecorder(_stream);

  // Remove previous recording
  audioChunks.length = 0;

  _mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };
  _mediaRecorder.onerror = (error) => {
    console.warn(error);
    _mediaRecorder.stop();
  };
}

function pauseRec() {
  if (_mediaRecorder.state === 'recording') {
    _mediaRecorder.pause();
    timer.pause();
  }
}
function startOrResumeRec() {
  if (!_mediaRecorder) return;

  if (_mediaRecorder.state === 'paused') {
    _mediaRecorder.resume();
  } else if (_mediaRecorder.state === 'inactive') {
    audioChunks.length = 0;
    _mediaRecorder.start();
  }
  timer.start();
}
function restartRec() {
  if (_mediaRecorder.state !== 'inactive') _mediaRecorder.stop();

  _mediaRecorder = null;
  timer = new Timer();
  init()
    .then(startOrResumeRec());
}

// TODO: Handle turning off the recorder to remove the browser indicator
function VoiceMailRecorder({ fnRequestResult, fnHowToSubmit }) {
  const [state, setState] = React.useState('unknown');

  async function initiateInitiation() {
    if (!_mediaRecorder) {
      await init();
      startOrResumeRec();
    }
    // _mediaRecorder.onstop = () => {
    //   setState('Recording stopped');
    // };
    _mediaRecorder.onstart = () => setState('Recording...');
    _mediaRecorder.onpause = () => setState('Recording paused');
    _mediaRecorder.onresume = () => setState('Recording...');
  }

  function stopAndSubmit(skipSubmission) {
    if (_mediaRecorder && _mediaRecorder.state !== 'inactive') _mediaRecorder.stop();

    _stream.getTracks().forEach((track) => track.stop());

    if (!skipSubmission) {
      setTimeout(() => {
        _mediaRecorder = null;
        _stream = null;

        const opts = { type: 'audio/webm' };
        const audioBlob = new Blob(audioChunks, opts);
        console.log('audioBlob', audioBlob);
        const audioFile = new File([audioBlob], 'voicemail.webm', opts);
        fnHowToSubmit(audioFile);
      // BUG: This will cause the recorder to add the file although it was to be cancelled
      }, 300); // TODO: Fix this hack, stop does not mean dataavailable but its going to happen soon
    }
  }

  // Cleanup after components unmount
  useEffect(() => () => {
    console.log('VoiceMailRecorder unmount');

    if (_mediaRecorder) {
      _mediaRecorder = null;
    }
    if (_stream) {
      _stream.getTracks().forEach((track) => track.stop());
      _stream = null;
    }
    // stopAndSubmit(true);
  }, []);
  // fnCancel(() => console.log('meh'));
  fnRequestResult(stopAndSubmit);

  initiateInitiation();

  return (
    <div className="room-attachment">
      <div className="room-attachment__preview">
        <RawIcon src={VolumeFullIC} />
      </div>
      <div className="room-attachment__info room-attachment-ui-recorder">
        <div>
          <Text variant="b1">
            {state}
          </Text>
          <Text variant="b3">for some time maybe?</Text>
        </div>
        {(_mediaRecorder && _mediaRecorder.state === 'recording')
          ? (<IconButton onClick={pauseRec} src={PauseIC}>Pause</IconButton>)
          : (<IconButton onClick={startOrResumeRec} src={PlayIC}>Start</IconButton>)}
        <IconButton onClick={restartRec} src={ArrowIC} tooltip="Start over">Reset</IconButton>
        <IconButton onClick={() => stopAndSubmit()} src={ChevronBottomIC} tooltip="Add as attachment" type="submit">Submit</IconButton>
      </div>
    </div>
  );
}

VoiceMailRecorder.propTypes = {
  // fnCancel: PropTypes.func.isRequired,
  fnRequestResult: PropTypes.func.isRequired,
  fnHowToSubmit: PropTypes.func.isRequired,
};

export { VoiceMailRecorder };
