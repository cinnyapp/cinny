import { useCallback } from 'react';
import { Editor } from 'slate';
import {
  customHtmlEqualsPlainText,
  getBeginCommand,
  getMentions,
  resetEditor,
  resetEditorHistory,
  toMatrixCustomHTML,
  toPlainText,
  trimCommand,
  trimCustomHtml,
} from '../../../components/editor';
import { settingsAtom } from '../../../state/settings';
import { useSetting } from '../../../state/hooks/settings';
import { MessageEvent } from '../../../../types/matrix/room';
import { Command, CommandRecord, SHRUG, TABLEFLIP, UNFLIP } from '../../../hooks/useCommands';
import { useClient } from '../../../hooks/useClient';
import { getMentionContent } from '../../../utils/room';
import { useRoom } from '../../../hooks/useRoom';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { getImageInfo } from '../../../utils/matrix';
import { getImageUrlBlob, loadImageElement } from '../../../utils/dom';
import { UploadItem } from '../../../state/room/roomInputDrafts';
import { Upload, UploadSuccess } from '../../../state/upload';
import { fulfilledPromiseSettledResult } from '../../../utils/common';
import {
  getAudioMsgContent,
  getFileMsgContent,
  getImageMsgContent,
  getVideoMsgContent,
} from '../msgContent';
import {
  MsgType,
  MessageContent,
  RelationType,
  StickerContent,
} from '../../../../types/matrix/common';
import { useEnsureRoomEncryptionSession } from './useEnsureRoomEncryptionSession';
import { LocalMessage } from '../../../../client/room/local-event';
import { useTimelineView } from './useTimeline';

const useSendLocalMessage = () => {
  const ct = useClient();
  const roomId = useRoom();
  const prepareEncryptionSession = useEnsureRoomEncryptionSession();
  const timeline = useTimelineView();

  const sendLocalMessage = useCallback(
    async (localMessage: LocalMessage) => {
      let wireMessage = localMessage.clone();

      if (ct.encryptedRooms.read.has(roomId)) {
        await prepareEncryptionSession();
        const encStr = await ct.machine.roomEncryption.encryptMessageEvent(
          roomId,
          localMessage.type,
          localMessage.content
        );
        const encContent = JSON.parse(encStr);

        wireMessage = new LocalMessage(roomId, MessageEvent.RoomMessageEncrypted, encContent);
      }

      const txnId = ct.getTxnId();

      await timeline.sendMessage(localMessage, wireMessage, txnId);
    },
    [ct, roomId, prepareEncryptionSession, timeline]
  );

  return sendLocalMessage;
};

export type ReplyToData = {
  userId: string;
  eventId: string;
  ping: boolean;
};

export type SendMessageCallback = (replyTo?: ReplyToData) => void;

export const useSendMessage = (
  editor: Editor,
  commands: CommandRecord,
  threadId?: string
): SendMessageCallback => {
  const ct = useClient();
  const roomId = useRoom();
  const [isMarkdown] = useSetting(settingsAtom, 'isMarkdown');

  const sendLocalMessage = useSendLocalMessage();

  const sendMessage: SendMessageCallback = useCallback(
    async (replyTo) => {
      const commandName = getBeginCommand(editor);
      let plainText = toPlainText(editor.children, isMarkdown).trim();
      let customHtml = trimCustomHtml(
        toMatrixCustomHTML(editor.children, {
          allowTextFormatting: true,
          allowBlockMarkdown: isMarkdown,
          allowInlineMarkdown: isMarkdown,
        })
      );
      let msgType: MsgType = MsgType.Text;

      if (commandName) {
        plainText = trimCommand(commandName, plainText);
        customHtml = trimCommand(commandName, customHtml);
      }
      if (commandName === Command.Me) {
        msgType = MsgType.Emote;
      } else if (commandName === Command.Notice) {
        msgType = MsgType.Notice;
      } else if (commandName === Command.Shrug) {
        plainText = `${SHRUG} ${plainText}`;
        customHtml = `${SHRUG} ${customHtml}`;
      } else if (commandName === Command.TableFlip) {
        plainText = `${TABLEFLIP} ${plainText}`;
        customHtml = `${TABLEFLIP} ${customHtml}`;
      } else if (commandName === Command.UnFlip) {
        plainText = `${UNFLIP} ${plainText}`;
        customHtml = `${UNFLIP} ${customHtml}`;
      } else if (commandName) {
        const commandContent = commands[commandName as Command];
        if (commandContent) {
          commandContent.exe(plainText);
        }
        resetEditor(editor);
        resetEditorHistory(editor);
        return;
      }

      if (plainText === '') {
        return;
      }

      const body = plainText;
      const formattedBody = customHtml;
      const mentionData = getMentions(ct, editor);

      const content: MessageContent = {
        msgtype: msgType,
        body,
      };

      if (replyTo && replyTo.userId !== ct.session.userId && replyTo.ping) {
        mentionData.users.add(replyTo.userId);
      }

      const mMentions = getMentionContent(Array.from(mentionData.users), mentionData.room);
      content['m.mentions'] = mMentions;

      if (replyTo || !customHtmlEqualsPlainText(formattedBody, body)) {
        content.format = 'org.matrix.custom.html';
        content.formatted_body = formattedBody;
      }
      if (replyTo) {
        content['m.relates_to'] = {
          'm.in_reply_to': {
            event_id: replyTo.eventId,
          },
        };
      }
      if (threadId) {
        content['m.relates_to'] = {
          ...content['m.relates_to'],
          event_id: threadId,
          rel_type: RelationType.Thread,
        };
        if (!replyTo) {
          // this should be the latest threaded message event_id
          // but we will always keep it to root. The intention is
          // so user always see this message in response to original
          // thread root message as they are not in response to the latest
          // message from thread
          content['m.relates_to']['m.in_reply_to'] = { event_id: threadId };
          content['m.relates_to'].is_falling_back = true;
        }
      }

      const localMessage = new LocalMessage(roomId, MessageEvent.RoomMessage, content);
      sendLocalMessage(localMessage);

      resetEditor(editor);
      resetEditorHistory(editor);
    },
    [ct, roomId, editor, isMarkdown, commands, threadId, sendLocalMessage]
  );

  return sendMessage;
};

export const useSendStickerMessage = (threadId?: string) => {
  const ct = useClient();
  const roomId = useRoom();
  const useAuthentication = useMediaAuthentication();

  const sendLocalMessage = useSendLocalMessage();

  const sendSticker = async (mxc: string, shortcode: string, label: string) => {
    const stickerUrl = mxcToHttp(ct.session.baseUrl, mxc, useAuthentication).url();
    if (!stickerUrl) return;

    const info = getImageInfo(
      await loadImageElement(stickerUrl),
      await getImageUrlBlob(stickerUrl)
    );
    const content: StickerContent = {
      body: label,
      url: mxc,
      info,
    };
    if (threadId) {
      content['m.relates_to'] = {
        event_id: threadId,
        rel_type: RelationType.Thread,
        'm.in_reply_to': { event_id: threadId },
        is_falling_back: true,
      };
    }

    const localMessage = new LocalMessage(roomId, MessageEvent.Sticker, content);
    sendLocalMessage(localMessage);
  };

  return sendSticker;
};

export const useSendUploadMessage = (
  dropUploads: (uploads: Upload[]) => void,
  threadId?: string
) => {
  const ct = useClient();
  const roomId = useRoom();

  const sendLocalMessage = useSendLocalMessage();

  const sendUpload = async (uploadItems: UploadItem[], uploads: UploadSuccess[]) => {
    const contentsPromises = uploads.map(async (upload) => {
      const fileItem = uploadItems.find((f) => f.file === upload.file);
      if (!fileItem) throw new Error('Broken upload');

      if (fileItem.file.type.startsWith('image')) {
        return getImageMsgContent(ct, fileItem, upload.mxc);
      }
      if (fileItem.file.type.startsWith('video')) {
        return getVideoMsgContent(ct, fileItem, upload.mxc);
      }
      if (fileItem.file.type.startsWith('audio')) {
        return getAudioMsgContent(fileItem, upload.mxc);
      }
      return getFileMsgContent(fileItem, upload.mxc);
    });
    dropUploads(uploads);
    const contents = fulfilledPromiseSettledResult(await Promise.allSettled(contentsPromises));

    contents.forEach((c) => {
      const content = { ...c };
      if (threadId) {
        content['m.relates_to'] = {
          event_id: threadId,
          rel_type: RelationType.Thread,
          'm.in_reply_to': { event_id: threadId },
          is_falling_back: true,
        };
      }

      const localMessage = new LocalMessage(roomId, MessageEvent.RoomMessage, content);
      sendLocalMessage(localMessage);
    });
  };

  return sendUpload;
};
