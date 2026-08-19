import React, {
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Box, Icon, IconButton, Icons, Line, PopOut, config } from 'folds';
import { isKeyHotkey } from 'is-hotkey';
import {
  EventType,
  IContent,
  MsgType,
  NotificationCountType,
  RelationType,
  Room,
  Thread,
} from 'matrix-js-sdk';
import { useAtom, useAtomValue } from 'jotai';
import { ReactEditor } from 'slate-react';
import { Transforms } from 'slate';

import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  createEmoticonElement,
  CustomEditor,
  moveCursor,
  getMentions,
  Toolbar,
  toMatrixCustomHTML,
  toPlainText,
  resetEditor,
  resetEditorHistory,
  useEditor,
  isEmptyEditor,
  trimCustomHtml,
  customHtmlEqualsPlainText,
} from '../../components/editor';
import { EmojiBoard, EmojiBoardTab } from '../../components/emoji-board';
import { UseStateProvider } from '../../components/UseStateProvider';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { getMentionContent } from '../../utils/room';
import { threadIdToMsgDraftAtomFamily } from '../../state/room/roomInputDrafts';
import { useComposingCheck } from '../../hooks/useComposingCheck';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useImagePackRooms } from '../../hooks/useImagePackRooms';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { getImageInfo, mxcUrlToHttp } from '../../utils/matrix';
import { getImageUrlBlob, loadImageElement } from '../../utils/dom';
import { mobileOrTablet } from '../../utils/user-agent';

/**
 * Reply composer for the thread panel. Persists its draft per-thread (not the
 * room-wide composer draft) and sends the message as a thread reply via
 * `m.relates_to { rel_type: m.thread, event_id: <root> }` — the same shape
 * RoomInput already uses for the thread branch of a reply.
 */
function ThreadReplyInput({ room, thread }: { room: Room; thread: Thread }) {
  const mx = useMatrixClient();
  const editor = useEditor();
  const [enterForNewline] = useSetting(settingsAtom, 'enterForNewline');
  const [isMarkdown] = useSetting(settingsAtom, 'isMarkdown');
  const [toolbar, setToolbar] = useSetting(settingsAtom, 'editorToolbar');
  const [msgDraft, setMsgDraft] = useAtom(threadIdToMsgDraftAtomFamily(thread.id));
  const isComposing = useComposingCheck();

  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const useAuthentication = useMediaAuthentication();
  const roomToParents = useAtomValue(roomToParentsAtom);
  const imagePackRooms: Room[] = useImagePackRooms(room.roomId, roomToParents);
  const [hideStickerBtn] = useState(document.body.clientWidth < 500);

  const rootEventId = thread.rootEvent?.getId();

  useEffect(() => {
    Transforms.insertFragment(editor, msgDraft);
  }, [editor, msgDraft]);

  useEffect(
    () => () => {
      if (!isEmptyEditor(editor)) {
        const parsedDraft = JSON.parse(JSON.stringify(editor.children));
        setMsgDraft(parsedDraft);
      } else {
        setMsgDraft([]);
      }
      resetEditor(editor);
      resetEditorHistory(editor);
    },
    [thread.id, editor, setMsgDraft]
  );

  const submit = useCallback(() => {
    if (!rootEventId) return;

    const plainText = toPlainText(editor.children, isMarkdown).trim();
    const formattedBody = trimCustomHtml(
      toMatrixCustomHTML(editor.children, {
        allowTextFormatting: true,
        allowBlockMarkdown: isMarkdown,
        allowInlineMarkdown: isMarkdown,
      })
    );
    if (plainText === '') return;

    const mentionData = getMentions(mx, room.roomId, editor);
    const content: IContent = {
      msgtype: MsgType.Text,
      body: plainText,
    };
    content['m.mentions'] = getMentionContent(Array.from(mentionData.users), mentionData.room);
    if (!customHtmlEqualsPlainText(formattedBody, plainText)) {
      content.format = 'org.matrix.custom.html';
      content.formatted_body = formattedBody;
    }
    content['m.relates_to'] = {
      rel_type: RelationType.Thread,
      event_id: rootEventId,
      is_falling_back: false,
    };

    mx.sendMessage(room.roomId, content as any).then(() => {
      // Best-effort thread read marker so the unread indicator clears.
      room.setThreadUnreadNotificationCount(thread.id, NotificationCountType.Total, 0);
    });
    resetEditor(editor);
    resetEditorHistory(editor);
    setMsgDraft([]);
    ReactEditor.focus(editor);
  }, [editor, isMarkdown, mx, room, rootEventId, setMsgDraft, thread.id]);

  const handleKeyDown: KeyboardEventHandler = useCallback(
    (evt) => {
      if (
        (isKeyHotkey('mod+enter', evt) || (!enterForNewline && isKeyHotkey('enter', evt))) &&
        !isComposing(evt)
      ) {
        evt.preventDefault();
        submit();
      }
    },
    [submit, enterForNewline, isComposing]
  );

  const handleEmoticonSelect = (key: string, shortcode: string) => {
    editor.insertNode(createEmoticonElement(key, shortcode));
    moveCursor(editor);
  };

  const handleStickerSelect = async (mxc: string, shortcode: string, label: string) => {
    if (!rootEventId) return;
    const stickerUrl = mxcUrlToHttp(mx, mxc, useAuthentication);
    if (!stickerUrl) return;

    const info = await getImageInfo(
      await loadImageElement(stickerUrl),
      await getImageUrlBlob(stickerUrl)
    );

    await mx.sendEvent(room.roomId, EventType.Sticker, {
      body: label,
      url: mxc,
      info,
      'm.relates_to': {
        rel_type: RelationType.Thread,
        event_id: rootEventId,
        is_falling_back: false,
      },
    });
    room.setThreadUnreadNotificationCount(thread.id, NotificationCountType.Total, 0);
  };

  return (
    <Box direction="Column" style={{ padding: `${config.space.S200} ${config.space.S300}` }}>
      <CustomEditor
        editableName="ThreadReplyInput"
        editor={editor}
        placeholder="Reply to thread..."
        onKeyDown={handleKeyDown}
        before={
          <IconButton onClick={submit} variant="SurfaceVariant" size="300" radii="300">
            <Icon src={Icons.Send} />
          </IconButton>
        }
        after={
          <UseStateProvider initial={undefined}>
            {(emojiBoardTab: EmojiBoardTab | undefined, setEmojiBoardTab) => (
              <>
                <IconButton
                  variant="SurfaceVariant"
                  size="300"
                  radii="300"
                  onClick={() => setToolbar(!toolbar)}
                >
                  <Icon src={toolbar ? Icons.AlphabetUnderline : Icons.Alphabet} />
                </IconButton>
                <PopOut
                  offset={16}
                  alignOffset={-44}
                  position="Top"
                  align="End"
                  anchor={
                    emojiBoardTab === undefined
                      ? undefined
                      : emojiBtnRef.current?.getBoundingClientRect() ?? undefined
                  }
                  content={
                    <EmojiBoard
                      tab={emojiBoardTab}
                      onTabChange={setEmojiBoardTab}
                      imagePackRooms={imagePackRooms}
                      returnFocusOnDeactivate={false}
                      onEmojiSelect={handleEmoticonSelect}
                      onCustomEmojiSelect={handleEmoticonSelect}
                      onStickerSelect={handleStickerSelect}
                      requestClose={() => {
                        setEmojiBoardTab((t) => {
                          if (t) {
                            if (!mobileOrTablet()) ReactEditor.focus(editor);
                            return undefined;
                          }
                          return t;
                        });
                      }}
                    />
                  }
                >
                  {!hideStickerBtn && (
                    <IconButton
                      aria-pressed={emojiBoardTab === EmojiBoardTab.Sticker}
                      onClick={() => setEmojiBoardTab(EmojiBoardTab.Sticker)}
                      variant="SurfaceVariant"
                      size="300"
                      radii="300"
                    >
                      <Icon
                        src={Icons.Sticker}
                        filled={emojiBoardTab === EmojiBoardTab.Sticker}
                      />
                    </IconButton>
                  )}
                  <IconButton
                    ref={emojiBtnRef}
                    aria-pressed={
                      hideStickerBtn ? !!emojiBoardTab : emojiBoardTab === EmojiBoardTab.Emoji
                    }
                    onClick={() => setEmojiBoardTab(EmojiBoardTab.Emoji)}
                    variant="SurfaceVariant"
                    size="300"
                    radii="300"
                  >
                    <Icon
                      src={Icons.Smile}
                      filled={
                        hideStickerBtn ? !!emojiBoardTab : emojiBoardTab === EmojiBoardTab.Emoji
                      }
                    />
                  </IconButton>
                </PopOut>
              </>
            )}
          </UseStateProvider>
        }
        bottom={
          toolbar && (
            <div>
              <Line variant="SurfaceVariant" size="300" />
              <Toolbar />
            </div>
          )
        }
      />
    </Box>
  );
}

export default ThreadReplyInput;
