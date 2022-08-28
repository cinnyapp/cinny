import EventEmitter from 'events';
import encrypt from 'browser-encrypt-attachment';
import { encode } from 'blurhash';
import { getShortcodeToEmoji } from '../../app/organisms/emoji-board/custom-emoji';
import { getBlobSafeMimeType } from '../../util/mimetypes';
import { sanitizeText } from '../../util/sanitize';
import cons from './cons';
import settings from './settings';
import { htmlOutput, parser } from '../../util/markdown';

const blurhashField = 'xyz.amorgan.blurhash';
const MXID_REGEX = /\B@\S+:\S+\.\S+[^.,:;?!\s]/g;
const SHORTCODE_REGEX = /\B:([\w-]+):\B/g;

function encodeBlurhash(img) {
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const context = canvas.getContext('2d');
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  return encode(data.data, data.width, data.height, 4, 4);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
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
    if (videoFile.type === 'video/quicktime') {
      const quicktimeVideoFile = new File([videoFile], videoFile.name, { type: 'video/mp4' });
      reader.readAsDataURL(quicktimeVideoFile);
    } else {
      reader.readAsDataURL(videoFile);
    }
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
  let content = parser(markdown);
  if (content.length === 1 && content[0].type === 'paragraph') {
    content = content[0].content;
  }
  return htmlOutput(content);
}

function getReplyFormattedBody(roomId, reply) {
  const replyToLink = `<a href="https://matrix.to/#/${roomId}/${reply.eventId}">In reply to</a>`;
  const userLink = `<a href="https://matrix.to/#/${reply.userId}">${reply.userId}</a>`;
  const formattedReply = getFormattedBody(reply.body.replace(/\n/g, '\n> '));
  return `<mx-reply><blockquote>${replyToLink}${userLink}<br />${formattedReply}</blockquote></mx-reply>`;
}

function bindReplyToContent(roomId, reply, content) {
  const newContent = { ...content };
  newContent.body = `> <${reply.userId}> ${reply.body.replace(/\n/g, '\n> ')}`;
  newContent.body += `\n\n${content.body}`;
  newContent.format = 'org.matrix.custom.html';
  newContent['m.relates_to'] = content['m.relates_to'] || {};
  newContent['m.relates_to']['m.in_reply_to'] = { event_id: reply.eventId };

  const formattedReply = getReplyFormattedBody(roomId, reply);
  newContent.formatted_body = formattedReply + (content.formatted_body || content.body);
  return newContent;
}

function findAndReplace(text, regex, filter, replace) {
  let copyText = text;
  Array.from(copyText.matchAll(regex))
    .filter(filter)
    .reverse() /* to replace backward to forward */
    .forEach((match) => {
      const matchText = match[0];
      const tag = replace(match);

      copyText = copyText.substr(0, match.index)
        + tag
        + copyText.substr(match.index + matchText.length);
    });
  return copyText;
}

function formatUserPill(room, text) {
  const { userIdsToDisplayNames } = room.currentState;
  return findAndReplace(
    text,
    MXID_REGEX,
    (match) => userIdsToDisplayNames[match[0]],
    (match) => (
      `<a href="https://matrix.to/#/${match[0]}">@${userIdsToDisplayNames[match[0]]}</a>`
    ),
  );
}

function formatEmoji(mx, room, roomList, text) {
  const parentIds = roomList.getAllParentSpaces(room.roomId);
  const parentRooms = [...parentIds].map((id) => mx.getRoom(id));
  const allEmoji = getShortcodeToEmoji(mx, [room, ...parentRooms]);

  return findAndReplace(
    text,
    SHORTCODE_REGEX,
    (match) => allEmoji.has(match[1]),
    (match) => {
      const emoji = allEmoji.get(match[1]);

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
      return tag;
    },
  );
}

class RoomsInput extends EventEmitter {
  constructor(mx, roomList) {
    super();

    this.matrixClient = mx;
    this.roomList = roomList;
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

  async sendInput(roomId, msgType) {
    const room = this.matrixClient.getRoom(roomId);
    const input = this.getInput(roomId);
    input.isSending = true;
    this.roomIdToInput.set(roomId, input);
    if (input.attachment) {
      await this.sendFile(roomId, input.attachment.file);
      if (!this.isSending(roomId)) return;
    }

    if (this.getMessage(roomId).trim() !== '') {
      const rawMessage = input.message;
      let content = {
        body: rawMessage,
        msgtype: msgType ?? 'm.text',
      };

      // Apply formatting if relevant
      let formattedBody = settings.isMarkdown
        ? getFormattedBody(rawMessage)
        : sanitizeText(rawMessage);

      formattedBody = formatUserPill(room, formattedBody);
      formattedBody = formatEmoji(this.matrixClient, room, this.roomList, formattedBody);

      content.body = findAndReplace(
        content.body,
        MXID_REGEX,
        (match) => room.currentState.userIdsToDisplayNames[match[0]],
        (match) => `@${room.currentState.userIdsToDisplayNames[match[0]]}`,
      );
      if (formattedBody !== sanitizeText(rawMessage)) {
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

  async sendSticker(roomId, data) {
    const { mxc: url, body, httpUrl } = data;
    const info = {};

    const img = new Image();
    img.src = httpUrl;

    try {
      const res = await fetch(httpUrl);
      const blob = await res.blob();
      info.w = img.width;
      info.h = img.height;
      info.mimetype = blob.type;
      info.size = blob.size;
      info.thumbnail_info = { ...info };
      info.thumbnail_url = url;
    } catch {
      // send sticker without info
    }

    this.matrixClient.sendEvent(roomId, 'm.sticker', {
      body,
      url,
      info,
    });
    this.emit(cons.events.roomsInput.MESSAGE_SENT, roomId);
  }

  async sendFile(roomId, file) {
    const fileType = getBlobSafeMimeType(file.type).slice(0, file.type.indexOf('/'));
    const info = {
      mimetype: file.type,
      size: file.size,
    };
    const content = { info };
    let uploadData = null;

    if (fileType === 'image') {
      const img = await loadImage(URL.createObjectURL(file));

      info.w = img.width;
      info.h = img.height;
      info[blurhashField] = encodeBlurhash(img);

      content.msgtype = 'm.image';
      content.body = file.name || 'Image';
    } else if (fileType === 'video') {
      content.msgtype = 'm.video';
      content.body = file.name || 'Video';

      try {
        const video = await loadVideo(file);

        info.w = video.videoWidth;
        info.h = video.videoHeight;
        info[blurhashField] = encodeBlurhash(video);

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
    const room = this.matrixClient.getRoom(roomId);
    const isReply = typeof mEvent.getWireContent()['m.relates_to']?.['m.in_reply_to'] !== 'undefined';

    const msgtype = mEvent.getWireContent().msgtype ?? 'm.text';

    const content = {
      body: ` * ${editedBody}`,
      msgtype,
      'm.new_content': {
        body: editedBody,
        msgtype,
      },
      'm.relates_to': {
        event_id: mEvent.getId(),
        rel_type: 'm.replace',
      },
    };

    // Apply formatting if relevant
    let formattedBody = settings.isMarkdown
      ? getFormattedBody(editedBody)
      : sanitizeText(editedBody);
    formattedBody = formatUserPill(room, formattedBody);
    formattedBody = formatEmoji(this.matrixClient, room, this.roomList, formattedBody);

    content.body = findAndReplace(
      content.body,
      MXID_REGEX,
      (match) => room.currentState.userIdsToDisplayNames[match[0]],
      (match) => `@${room.currentState.userIdsToDisplayNames[match[0]]}`,
    );
    if (formattedBody !== sanitizeText(editedBody)) {
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
