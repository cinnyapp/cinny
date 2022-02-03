import EventEmitter from 'events';
import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import encrypt from 'browser-encrypt-attachment';
import { getShortcodeToEmoji } from '../../app/organisms/emoji-board/custom-emoji';
import { spoilerExtension, spoilerExtensionHtml } from '../../util/markdown';
import cons from './cons';
import settings from './settings';

function getImageDimension(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      resolve({
        w: img.width,
        h: img.height,
      });
    };
    img.src = URL.createObjectURL(file);
  });
}
function loadVideo(videoFile) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;

    const reader = new FileReader();

    reader.onload = (ev) => {
      // Wait until we have enough data to thumbnail the first frame.
      video.onloadeddata = async () => {
        resolve(video);
        video.pause();
      };
      video.onerror = (e) => {
        reject(e);
      };

      video.src = ev.target.result;
      video.load();
      video.play();
    };
    reader.onerror = (e) => {
      reject(e);
    };
    reader.readAsDataURL(videoFile);
  });
}
function getVideoThumbnail(video, width, height, mimeType) {
  return new Promise((resolve) => {
    const MAX_WIDTH = 800;
    const MAX_HEIGHT = 600;
    let targetWidth = width;
    let targetHeight = height;
    if (targetHeight > MAX_HEIGHT) {
      targetWidth = Math.floor(targetWidth * (MAX_HEIGHT / targetHeight));
      targetHeight = MAX_HEIGHT;
    }
    if (targetWidth > MAX_WIDTH) {
      targetHeight = Math.floor(targetHeight * (MAX_WIDTH / targetWidth));
      targetWidth = MAX_WIDTH;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, targetWidth, targetHeight);

    canvas.toBlob((thumbnail) => {
      resolve({
        thumbnail,
        info: {
          w: targetWidth,
          h: targetHeight,
          mimetype: thumbnail.type,
          size: thumbnail.size,
        },
      });
    }, mimeType);
  });
}

function getFormattedBody(markdown) {
  const result = micromark(markdown, {
    extensions: [gfm(), spoilerExtension()],
    htmlExtensions: [gfmHtml(), spoilerExtensionHtml],
  });
  const bodyParts = result.match(/^(<p>)(.*)(<\/p>)$/);
  if (bodyParts === null) return result;
  if (bodyParts[2].indexOf('</p>') >= 0) return result;
  return bodyParts[2];
}

function getReplyFormattedBody(roomId, reply) {
  const replyToLink = `<a href="https://matrix.to/#/${roomId}/${reply.eventId}">In reply to</a>`;
  const userLink = `<a href="https://matrix.to/#/${reply.userId}">${reply.userId}</a>`;
  const formattedReply = getFormattedBody(reply.body.replaceAll('\n', '\n> '));
  return `<mx-reply><blockquote>${replyToLink}${userLink}<br />${formattedReply}</blockquote></mx-reply>`;
}

function bindReplyToContent(roomId, reply, content) {
  const newContent = { ...content };
  newContent.body = `> <${reply.userId}> ${reply.body.replaceAll('\n', '\n> ')}`;
  newContent.body += `\n\n${content.body}`;
  newContent.format = 'org.matrix.custom.html';
  newContent['m.relates_to'] = content['m.relates_to'] || {};
  newContent['m.relates_to']['m.in_reply_to'] = { event_id: reply.eventId };

  const formattedReply = getReplyFormattedBody(roomId, reply);
  newContent.formatted_body = formattedReply + (content.formatted_body || content.body);
  return newContent;
}

// Apply formatting to a plain text message
//
// This includes inserting any custom emoji that might be relevant, and (only if the
// user has enabled it in their settings) formatting the message using markdown.
function formatAndEmojifyText(room, text) {
  const allEmoji = getShortcodeToEmoji(room);

  // Start by applying markdown formatting (if relevant)
  let formattedText;
  if (settings.isMarkdown) {
    formattedText = getFormattedBody(text);
  } else {
    formattedText = text;
  }

  // Check to see if there are any :shortcode-style-tags: in the message
  Array.from(formattedText.matchAll(/\B:([\w-]+):\B/g))
    // Then filter to only the ones corresponding to a valid emoji
    .filter((match) => allEmoji.has(match[1]))
    // Reversing the array ensures that indices are preserved as we start replacing
    .reverse()
    // Replace each :shortcode: with an <img/> tag
    .forEach((shortcodeMatch) => {
      const emoji = allEmoji.get(shortcodeMatch[1]);

      // Render the tag that will replace the shortcode
      let tag;
      if (emoji.mxc) {
        tag = `<img data-mx-emoticon="" src="${
          emoji.mxc
        }" alt=":${
          emoji.shortcode
        }:" title=":${
          emoji.shortcode
        }:" height="32" />`;
      } else {
        tag = emoji.unicode;
      }

      // Splice the tag into the text
      formattedText = formattedText.substr(0, shortcodeMatch.index)
        + tag
        + formattedText.substr(shortcodeMatch.index + shortcodeMatch[0].length);
    });

  return formattedText;
}

class RoomsInput extends EventEmitter {
  constructor(mx) {
    super();

    this.matrixClient = mx;
    this.roomIdToInput = new Map();
  }

  cleanEmptyEntry(roomId) {
    const input = this.getInput(roomId);
    const isEmpty = typeof input.attachment === 'undefined'
      && typeof input.replyTo === 'undefined'
      && (typeof input.message === 'undefined' || input.message === '');
    if (isEmpty) {
      this.roomIdToInput.delete(roomId);
    }
  }

  getInput(roomId) {
    return this.roomIdToInput.get(roomId) || {};
  }

  setMessage(roomId, message) {
    const input = this.getInput(roomId);
    input.message = message;
    this.roomIdToInput.set(roomId, input);
    if (message === '') this.cleanEmptyEntry(roomId);
  }

  getMessage(roomId) {
    const input = this.getInput(roomId);
    if (typeof input.message === 'undefined') return '';
    return input.message;
  }

  setReplyTo(roomId, replyTo) {
    const input = this.getInput(roomId);
    input.replyTo = replyTo;
    this.roomIdToInput.set(roomId, input);
  }

  getReplyTo(roomId) {
    const input = this.getInput(roomId);
    if (typeof input.replyTo === 'undefined') return null;
    return input.replyTo;
  }

  cancelReplyTo(roomId) {
    const input = this.getInput(roomId);
    if (typeof input.replyTo === 'undefined') return;
    delete input.replyTo;
    this.roomIdToInput.set(roomId, input);
  }

  setAttachment(roomId, file) {
    const input = this.getInput(roomId);
    input.attachment = {
      file,
    };
    this.roomIdToInput.set(roomId, input);
  }

  getAttachment(roomId) {
    const input = this.getInput(roomId);
    if (typeof input.attachment === 'undefined') return null;
    return input.attachment.file;
  }

  cancelAttachment(roomId) {
    const input = this.getInput(roomId);
    if (typeof input.attachment === 'undefined') return;

    const { uploadingPromise } = input.attachment;

    if (uploadingPromise) {
      this.matrixClient.cancelUpload(uploadingPromise);
      delete input.attachment.uploadingPromise;
    }
    delete input.attachment;
    delete input.isSending;
    this.roomIdToInput.set(roomId, input);
    this.emit(cons.events.roomsInput.ATTACHMENT_CANCELED, roomId);
  }

  isSending(roomId) {
    return this.roomIdToInput.get(roomId)?.isSending || false;
  }

  async sendInput(roomId) {
    const input = this.getInput(roomId);
    input.isSending = true;
    this.roomIdToInput.set(roomId, input);
    if (input.attachment) {
      await this.sendFile(roomId, input.attachment.file);
      if (!this.isSending(roomId)) return;
    }

    if (this.getMessage(roomId).trim() !== '') {
      let content = {
        body: input.message,
        msgtype: 'm.text',
      };

      // Apply formatting if relevant
      const formattedBody = formatAndEmojifyText(
        this.matrixClient.getRoom(roomId),
        input.message,
      );
      if (formattedBody !== input.message) {
        // Formatting was applied, and we need to switch to custom HTML
        content.format = 'org.matrix.custom.html';
        content.formatted_body = formattedBody;
      }

      if (typeof input.replyTo !== 'undefined') {
        content = bindReplyToContent(roomId, input.replyTo, content);
      }
      this.matrixClient.sendMessage(roomId, content);
    }

    if (this.isSending(roomId)) this.roomIdToInput.delete(roomId);
    this.emit(cons.events.roomsInput.MESSAGE_SENT, roomId);
  }

  async sendFile(roomId, file) {
    const fileType = file.type.slice(0, file.type.indexOf('/'));
    const info = {
      mimetype: file.type,
      size: file.size,
    };
    const content = { info };
    let uploadData = null;

    if (fileType === 'image') {
      const imgDimension = await getImageDimension(file);

      info.w = imgDimension.w;
      info.h = imgDimension.h;

      content.msgtype = 'm.image';
      content.body = file.name || 'Image';
    } else if (fileType === 'video') {
      content.msgtype = 'm.video';
      content.body = file.name || 'Video';

      try {
        const video = await loadVideo(file);
        info.w = video.videoWidth;
        info.h = video.videoHeight;
        const thumbnailData = await getVideoThumbnail(video, video.videoWidth, video.videoHeight, 'image/jpeg');
        const thumbnailUploadData = await this.uploadFile(roomId, thumbnailData.thumbnail);
        info.thumbnail_info = thumbnailData.info;
        if (this.matrixClient.isRoomEncrypted(roomId)) {
          info.thumbnail_file = thumbnailUploadData.file;
        } else {
          info.thumbnail_url = thumbnailUploadData.url;
        }
      } catch (e) {
        this.emit(cons.events.roomsInput.FILE_UPLOAD_CANCELED, roomId);
        return;
      }
    } else if (fileType === 'audio') {
      content.msgtype = 'm.audio';
      content.body = file.name || 'Audio';
    } else {
      content.msgtype = 'm.file';
      content.body = file.name || 'File';
    }

    try {
      uploadData = await this.uploadFile(roomId, file, (data) => {
        // data have two properties: data.loaded, data.total
        this.emit(cons.events.roomsInput.UPLOAD_PROGRESS_CHANGES, roomId, data);
      });
      this.emit(cons.events.roomsInput.FILE_UPLOADED, roomId);
    } catch (e) {
      this.emit(cons.events.roomsInput.FILE_UPLOAD_CANCELED, roomId);
      return;
    }
    if (this.matrixClient.isRoomEncrypted(roomId)) {
      content.file = uploadData.file;
      await this.matrixClient.sendMessage(roomId, content);
    } else {
      content.url = uploadData.url;
      await this.matrixClient.sendMessage(roomId, content);
    }
  }

  async uploadFile(roomId, file, progressHandler) {
    const isEncryptedRoom = this.matrixClient.isRoomEncrypted(roomId);

    let encryptInfo = null;
    let encryptBlob = null;

    if (isEncryptedRoom) {
      const dataBuffer = await file.arrayBuffer();
      if (typeof this.getInput(roomId).attachment === 'undefined') throw new Error('Attachment canceled');
      const encryptedResult = await encrypt.encryptAttachment(dataBuffer);
      if (typeof this.getInput(roomId).attachment === 'undefined') throw new Error('Attachment canceled');
      encryptInfo = encryptedResult.info;
      encryptBlob = new Blob([encryptedResult.data]);
    }

    const uploadingPromise = this.matrixClient.uploadContent(isEncryptedRoom ? encryptBlob : file, {
      // don't send filename if room is encrypted.
      includeFilename: !isEncryptedRoom,
      progressHandler,
    });

    const input = this.getInput(roomId);
    input.attachment.uploadingPromise = uploadingPromise;
    this.roomIdToInput.set(roomId, input);

    const url = await uploadingPromise;

    delete input.attachment.uploadingPromise;
    this.roomIdToInput.set(roomId, input);

    if (isEncryptedRoom) {
      encryptInfo.url = url;
      if (file.type) encryptInfo.mimetype = file.type;
      return { file: encryptInfo };
    }
    return { url };
  }

  async sendEditedMessage(roomId, mEvent, editedBody) {
    const isReply = typeof mEvent.getWireContent()['m.relates_to']?.['m.in_reply_to'] !== 'undefined';

    const content = {
      body: ` * ${editedBody}`,
      msgtype: 'm.text',
      'm.new_content': {
        body: editedBody,
        msgtype: 'm.text',
      },
      'm.relates_to': {
        event_id: mEvent.getId(),
        rel_type: 'm.replace',
      },
    };

    // Apply formatting if relevant
    const formattedBody = formatAndEmojifyText(
      this.matrixClient.getRoom(roomId),
      editedBody,
    );
    if (formattedBody !== editedBody) {
      content.formatted_body = ` * ${formattedBody}`;
      content.format = 'org.matrix.custom.html';
      content['m.new_content'].formatted_body = formattedBody;
      content['m.new_content'].format = 'org.matrix.custom.html';
    }
    if (isReply) {
      const evBody = mEvent.getContent().body;
      const replyHead = evBody.slice(0, evBody.indexOf('\n\n'));
      const evFBody = mEvent.getContent().formatted_body;
      const fReplyHead = evFBody.slice(0, evFBody.indexOf('</mx-reply>'));

      content.format = 'org.matrix.custom.html';
      content.formatted_body = `${fReplyHead}</mx-reply>${(content.formatted_body || content.body)}`;

      content.body = `${replyHead}\n\n${content.body}`;
    }

    this.matrixClient.sendMessage(roomId, content);
  }
}

export default RoomsInput;
