import { useCallback, useState } from 'react';
import { Editor } from 'slate';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { useClient } from '../../../hooks/useClient';
import { useRoom } from '../../../hooks/useRoom';
import { useEnsureRoomEncryptionSession } from '../../../hooks/useEnsureRoomEncryptionSession';
import {
  EventSenderIdle,
  LocalEvent,
  LocalEventSender,
  LocalMessage,
} from '../../../../client/room/local-event';
import { MessageEvent } from '../../../../types/matrix/room';
import {
  MentionsContent,
  MessageContent,
  MsgType,
  RelationType,
} from '../../../../types/matrix/common';
import { rContent } from '../../../../client/reader';
import {
  customHtmlEqualsPlainText,
  getMentions,
  toMatrixCustomHTML,
  toPlainText,
  trimCustomHtml,
} from '../../../components/editor';
import { useSetting } from '../../../state/hooks/settings';
import { getMentionContent, trimReplyFromFormattedBody } from '../../../utils/room';
import { useAsyncCallback } from '../../../hooks/useAsyncCallback';

const useSendLocalMessage = () => {
  const ct = useClient();
  const roomId = useRoom();
  const prepareEncryptionSession = useEnsureRoomEncryptionSession();

  const [localEventSender, setLocalEventSender] = useState<LocalEventSender>();

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

      const localEvent = new LocalEvent(localMessage, wireMessage, txnId, Date.now());

      const sender = new LocalEventSender(localEvent, ct.requestAuthJSON);

      if (sender.state.read instanceof EventSenderIdle) {
        sender.state.read.send();
      }
      setLocalEventSender(sender);
    },
    [ct, roomId, prepareEncryptionSession]
  );

  return {
    localEventSender,
    sendLocalMessage,
  };
};

export const useSendEditedMessage = (editor: Editor, event: MessageEventWithoutRoomId) => {
  const ct = useClient();
  const roomId = useRoom();
  const [isMarkdown] = useSetting('isMarkdown');
  const { localEventSender, sendLocalMessage } = useSendLocalMessage();

  const getPrevContent = useCallback((): {
    body?: string;
    formattedBody?: string;
    mentions?: MentionsContent;
  } => {
    const content = rContent.newContent(event.content) ?? event.content;
    const body = rContent.body(content);
    const formattedBody = rContent.formattedBody(content);

    const mentions: MentionsContent | undefined = rContent.mentions(content);

    return {
      body,
      formattedBody,
      mentions,
    };
  }, [event]);

  const [saveState, save] = useAsyncCallback(
    useCallback(
      async (onCancel: () => void) => {
        const plainText = toPlainText(editor.children, isMarkdown).trim();
        const customHtml = trimCustomHtml(
          toMatrixCustomHTML(editor.children, {
            allowTextFormatting: true,
            allowBlockMarkdown: isMarkdown,
            allowInlineMarkdown: isMarkdown,
          })
        );

        const prevContent = getPrevContent();

        if (plainText === '') {
          onCancel();
          return undefined;
        }
        if (prevContent.body) {
          if (
            prevContent.formattedBody &&
            trimReplyFromFormattedBody(prevContent.formattedBody) === customHtml
          ) {
            onCancel();
            return undefined;
          }
          if (
            !prevContent.formattedBody &&
            prevContent.body === plainText &&
            customHtmlEqualsPlainText(customHtml, plainText)
          ) {
            onCancel();
            return undefined;
          }
        }

        const newContent: MessageContent = {
          msgtype: (rContent.msgtype(event.content) as MsgType) ?? MsgType.Text,
          body: plainText,
        };

        const mentionData = getMentions(ct, editor);

        prevContent.mentions?.user_ids?.forEach((prevMentionId) => {
          mentionData.users.add(prevMentionId);
        });

        const mMentions = getMentionContent(Array.from(mentionData.users), mentionData.room);
        newContent['m.mentions'] = mMentions;

        if (!customHtmlEqualsPlainText(customHtml, plainText)) {
          newContent.format = 'org.matrix.custom.html';
          newContent.formatted_body = customHtml;
        }

        const content: MessageContent & {
          'm.new_content': MessageContent;
        } = {
          ...newContent,
          body: `* ${plainText}`,
          'm.new_content': newContent,
          'm.relates_to': {
            event_id: event.event_id,
            rel_type: RelationType.Replace,
          },
        };

        const messageEvent = new LocalMessage(roomId, event.type, content);
        return sendLocalMessage(messageEvent);
      },
      [ct, roomId, editor, event, isMarkdown, getPrevContent, sendLocalMessage]
    )
  );

  return {
    saveState,
    localEventSender,
    save,
  };
};
