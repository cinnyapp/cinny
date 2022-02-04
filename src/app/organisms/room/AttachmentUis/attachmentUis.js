import FileIC from '../../../../../public/res/ic/outlined/file.svg';
import VoiceMailRecorder from './VoiceMailRecorder';

/**
 * @typedef {Object} AttachmentUi
 * @property {string} fullName How should it be listed as to the user?
 * @property {any} icon The icon to use for the attachment type.
 * @property {React.ComponentType<{fnHowToSubmit: Function}>} component
 *  The component for the attachment type
 */

/**
 * @type {Map<string, AttachmentUi>} attachmentUis
 */
const attachmentUis = new Map();

// Populate attachmentUis
attachmentUis.set('file', {
  fullName: 'File',
  icon: FileIC,
});
attachmentUis.set('voiceMailRecorder', {
  fullName: 'Voice mail',
  component: VoiceMailRecorder,
});

export default attachmentUis;
