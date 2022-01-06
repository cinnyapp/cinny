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

/**
 * @type {Timer}
 */
let timer;

/**
 * @type {MediaStream}
 */
let _stream;
/**
 * @type {MediaRecorder}
 */
let _mediaRecorder;

async function init() {
  if (_mediaRecorder) return;

  timer = new Timer();
  _stream = null;
  _mediaRecorder = null;

  _stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  _mediaRecorder = new MediaRecorder(_stream);

  _mediaRecorder.onerror = (error) => {
    console.log(error);
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
    _mediaRecorder.start();
  }
  timer.resume();
}

async function restartRec() {
  // Needed, otherwise the browser indicator would remain after closing UI
  if (_mediaRecorder.state !== 'inactive') _mediaRecorder.stop();
  _stream.getTracks().forEach((track) => track.stop());
  _mediaRecorder = null;
  timer = new Timer();
  await init();
  startOrResumeRec();
}

function VoiceMailRecorder({ fnHowToSubmit }) {
  const [state, setState] = React.useState('Recording');
  const [timeRecording, setTimeRecording] = React.useState('00:00');
  const [browserHasNoSupport, setBrowserHasNoSupport] = React.useState(!navigator.mediaDevices
    ? 'It seems like your browser is unsupported' : null);

  async function initiateInitiation() {
    if (!_mediaRecorder) {
      await init().catch((err) => {
        console.warn('Recording is disallowed', err);
        setBrowserHasNoSupport('It seems like you have disallowed Cinny to record your voice ༼ つ ◕_◕ ༽つ');
      });

      if (browserHasNoSupport) return;
      startOrResumeRec();
    }

    _mediaRecorder.onstart = () => setState('Recording...');
    _mediaRecorder.onpause = () => setState('Recording paused');
    _mediaRecorder.onresume = () => setState('Recording...');
  }

  function stopAndSubmit(skipSubmission = false) {
    if (!skipSubmission) {
      _mediaRecorder.ondataavailable = (event) => {
        const audioChunks = [];
        audioChunks.push(event.data);
        _mediaRecorder = null;
        _stream = null;

        const opts = { type: 'audio/webm' };
        const audioBlob = new Blob(audioChunks, opts);

        const audioFile = new File([audioBlob], 'voicemail.webm', opts);
        fnHowToSubmit(audioFile);
      };
    }

    // Stop recording, remove browser indicator
    if (_mediaRecorder && _mediaRecorder.state !== 'inactive') _mediaRecorder.stop();
    _stream.getTracks().forEach((track) => track.stop());
  }

  useEffect(() => {
    const timerUpdater = setInterval(() => {
      setTimeRecording(timer.getTimeStr);
    }, 500); // .5 seconds

    // Cleanup after components unmount
    return () => {
      clearInterval(timerUpdater);
      if (_mediaRecorder) {
        _mediaRecorder = null;
      }
      if (_stream) {
        // To remove the browser's recording indicator
        _stream.getTracks().forEach((track) => track.stop());
        _stream = null;
      }
    };
  }, []);

  initiateInitiation();

  const ui = (
    <div className="room-attachment">
      <div className="room-attachment__preview">
        <RawIcon src={VolumeFullIC} />
      </div>
      <div className="room-attachment__info room-attachment-ui-recorder">
        <div>
          <Text variant="b1">
            {state}
          </Text>
          <Text variant="b3">{`for ${timeRecording}`}</Text>
        </div>
        {(_mediaRecorder && _mediaRecorder.state === 'recording')
          ? (<IconButton onClick={pauseRec} src={PauseIC}>Pause</IconButton>)
          : (<IconButton onClick={startOrResumeRec} src={PlayIC}>Start</IconButton>)}
        <IconButton onClick={() => restartRec().then(() => setState('Recording...'))} src={ArrowIC} tooltip="Start over">
          Reset
        </IconButton>
        <IconButton onClick={() => stopAndSubmit()} src={ChevronBottomIC} tooltip="Add as attachment" type="submit">Submit</IconButton>
      </div>
    </div>
  );

  return browserHasNoSupport
    ? <Text variant="b1" className="room-attachment unsupported-info">{browserHasNoSupport}</Text>
    : ui;
}

VoiceMailRecorder.propTypes = {
  fnHowToSubmit: PropTypes.func.isRequired,
};

export default VoiceMailRecorder;
