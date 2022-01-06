import FileIC from '../../../../../public/res/ic/outlined/file.svg';
import VoiceMailRecorder from './VoiceMailRecorder';

const attachmentUis = new Map();

attachmentUis.set('file', {
  fullName: 'File',
  icon: FileIC,
});
attachmentUis.set('voiceMailRecorder', {
  fullName: 'Voice mail',
  component: VoiceMailRecorder,
});

export default attachmentUis;
