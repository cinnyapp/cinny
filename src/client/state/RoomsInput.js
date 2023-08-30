import EventEmitter from 'events';
import encrypt from 'browser-encrypt-attachment';
import { encode } from 'blurhash';
import { getShortcodeToEmoji } from '../../app/organisms/emoji-board/custom-emoji';
import { getBlobSafeMimeType } from '../../util/mimetypes';
import { sanitizeText } from '../../util/sanitize';
import cons from './cons';
import settings from './settings';
import { markdown, plain } from '../../util/markdown';

const blurhashField = 'xyz.amorgan.blurhash';

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

  getContent(roomId, options, message, reply, edit) {
    const msgType = options?.msgType || 'm.text';
    const autoMarkdown = options?.autoMarkdown ?? true;

    const room = this.matrixClient.getRoom(roomId);

    const userNames = room.currentState.userIdsToDisplayNames;
    const parentIds = this.roomList.getAllParentSpaces(room.roomId);
    const parentRooms = [...parentIds].map((id) => this.matrixClient.getRoom(id));
    const emojis = getShortcodeToEmoji(this.matrixClient, [room, ...parentRooms]);

    const output = settings.isMarkdown && autoMarkdown ? markdown : plain;
    const body = output(message, { userNames, emojis });

    const content = {
      body: body.plain,
      msgtype: msgType,
    };

    if (!body.onlyPlain || reply) {
      content.format = 'org.matrix.custom.html';
      content.formatted_body = body.html;
    }

    if (edit) {
      content['m.new_content'] = { ...content };
      content['m.relates_to'] = {
        event_id: edit.getId(),
        rel_type: 'm.replace',
      };

      const isReply = edit.getWireContent()['m.relates_to']?.['m.in_reply_to'];
      if (isReply) {
        content.format = 'org.matrix.custom.html';
        content.formatted_body = body.html;
      }

      content.body = ` * ${content.body}`;
      if (content.formatted_body) content.formatted_body = ` * ${content.formatted_body}`;

      if (isReply) {
        const eBody = edit.getContent().body;
        const replyHead = eBody.substring(0, eBody.indexOf('\n\n'));
        if (replyHead) content.body = `${replyHead}\n\n${content.body}`;

        const eFBody = edit.getContent().formatted_body;
        const fReplyHead = eFBody.substring(0, eFBody.indexOf('</mx-reply>'));
        if (fReplyHead) content.formatted_body = `${fReplyHead}</mx-reply>${content.formatted_body}`;
      }
    }

    if (reply) {
      content['m.relates_to'] = {
        'm.in_reply_to': {
          event_id: reply.eventId,
        },
      };

      content.body = `> <${reply.userId}> ${reply.body.replace(/\n/g, '\n> ')}\n\n${content.body}`;

      const replyToLink = `<a href="https://matrix.to/#/${encodeURIComponent(roomId)}/${encodeURIComponent(reply.eventId)}">In reply to</a>`;
      const userLink = `<a href="https://matrix.to/#/${encodeURIComponent(reply.userId)}">${sanitizeText(reply.userId)}</a>`;
      const fallback = `<mx-reply><blockquote>${replyToLink}${userLink}<br />${reply.formattedBody || sanitizeText(reply.body)}</blockquote></mx-reply>`;
      content.formatted_body = fallback + content.formatted_body;
    }

    return content;
  }

  async sendInput(roomId, options) {
    const input = this.getInput(roomId);
    input.isSending = true;
    this.roomIdToInput.set(roomId, input);
    if (input.attachment) {
      await this.sendFile(roomId, input.attachment.file);
      if (!this.isSending(roomId)) return;
    }

    if (this.getMessage(roomId).trim() !== '') {
      const content = this.getContent(roomId, options, input.message, input.replyTo);
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

    const { content_uri: url } = await uploadingPromise;

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
    const content = this.getContent(
      roomId,
      { msgType: mEvent.getWireContent().msgtype },
      editedBody,
      null,
      mEvent,
    );
    this.matrixClient.sendMessage(roomId, content);
  }
}

export default RoomsInput;
