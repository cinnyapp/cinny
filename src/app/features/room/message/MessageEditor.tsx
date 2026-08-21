import React, {
  KeyboardEventHandler,
  MouseEventHandler,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Box,
  Chip,
  Icon,
  IconButton,
  Icons,
  Line,
  PopOut,
  RectCords,
  Spinner,
  Text,
  as,
  config,
} from 'folds';
import { Editor, Transforms } from 'slate';
import { ReactEditor } from 'slate-react';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { isKeyHotkey } from 'is-hotkey';
import {
  AUTOCOMPLETE_PREFIXES,
  AutocompletePrefix,
  AutocompleteQuery,
  CustomEditor,
  EmoticonAutocomplete,
  RoomMentionAutocomplete,
  Toolbar,
  UserMentionAutocomplete,
  createEmoticonElement,
  customHtmlEqualsPlainText,
  getAutocompleteQuery,
  getPrevWorldRange,
  htmlToEditorInput,
  moveCursor,
  plainToEditorInput,
  toMatrixCustomHTML,
  toPlainText,
  trimCustomHtml,
  useEditor,
  getMentions,
} from '../../../components/editor';
import { useSetting } from '../../../state/hooks/settings';
import { UseStateProvider } from '../../../components/UseStateProvider';
import { EmojiBoard } from '../../../components/emoji-board';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { getEditedEvent, getMentionContent, trimReplyFromFormattedBody } from '../../../utils/room';
import { mobileOrTablet } from '../../../utils/user-agent';
import { useComposingCheck } from '../../../hooks/useComposingCheck';
import { useClient } from '../../../hooks/useClient';
import { MentionsContent, MessageContent, RelationType } from '../../../../types/matrix/common';

type MessageEditorProps = {
  roomId: string;
  event: MessageEventWithoutRoomId;
  imagePackRooms?: string[];
  onCancel: () => void;
};
export const MessageEditor = as<'div', MessageEditorProps>(
  ({ roomId, event, imagePackRooms, onCancel, ...props }, ref) => {
    const ct = useClient();
    const editor = useEditor();
    const [enterForNewline] = useSetting('enterForNewline');
    const [globalToolbar] = useSetting('editorToolbar');
    const [isMarkdown] = useSetting('isMarkdown');
    const [toolbar, setToolbar] = useState(globalToolbar);
    const isComposing = useComposingCheck();

    const [autocompleteQuery, setAutocompleteQuery] =
      useState<AutocompleteQuery<AutocompletePrefix>>();

    const getPrevBodyAndFormattedBody = useCallback((): [
      string | undefined,
      string | undefined,
      MentionsContent | undefined
    ] => {
      const evtId = event.event_id;
      const evtTimeline = room.getTimelineForEvent(evtId);
      const editedEvent =
        evtTimeline && getEditedEvent(evtId, mEvent, evtTimeline.getTimelineSet());

      const content: IContent = editedEvent?.getContent()['m.new_content'] ?? mEvent.getContent();
      const { body, formatted_body: customHtml }: Record<string, unknown> = content;

      const mMentions: IMentions | undefined = content['m.mentions'];

      return [
        typeof body === 'string' ? body : undefined,
        typeof customHtml === 'string' ? customHtml : undefined,
        mMentions,
      ];
    }, [roomId, event]);

    const [saveState, save] = useAsyncCallback(
      useCallback(async () => {
        const plainText = toPlainText(editor.children, isMarkdown).trim();
        const customHtml = trimCustomHtml(
          toMatrixCustomHTML(editor.children, {
            allowTextFormatting: true,
            allowBlockMarkdown: isMarkdown,
            allowInlineMarkdown: isMarkdown,
          })
        );

        const [prevBody, prevCustomHtml, prevMentions] = getPrevBodyAndFormattedBody();

        if (plainText === '') return undefined;
        if (prevBody) {
          if (prevCustomHtml && trimReplyFromFormattedBody(prevCustomHtml) === customHtml) {
            return undefined;
          }
          if (
            !prevCustomHtml &&
            prevBody === plainText &&
            customHtmlEqualsPlainText(customHtml, plainText)
          ) {
            return undefined;
          }
        }

        const prevContent = event.content as MessageContent;
        const newContent: MessageContent = {
          msgtype: prevContent.msgtype,
          body: plainText,
        };

        const mentionData = getMentions(ct, editor);

        prevMentions?.user_ids?.forEach((prevMentionId) => {
          mentionData.users.add(prevMentionId);
        });

        const mMentions = getMentionContent(Array.from(mentionData.users), mentionData.room);
        newContent['m.mentions'] = mMentions;

        if (!customHtmlEqualsPlainText(customHtml, plainText)) {
          newContent.format = 'org.matrix.custom.html';
          newContent.formatted_body = customHtml;
        }

        const content: MessageContent = {
          ...newContent,
          body: `* ${plainText}`,
          'm.new_content': newContent,
          'm.relates_to': {
            event_id: event.event_id,
            rel_type: RelationType.Replace,
          },
        };

        // TODO: send message
        // return mx.sendMessage(roomId, content);
        return Promise.resolve();
      }, [ct, editor, event, isMarkdown, getPrevBodyAndFormattedBody])
    );

    const handleSave = useCallback(() => {
      if (saveState.status !== AsyncStatus.Loading) {
        save();
      }
    }, [saveState, save]);

    const handleKeyDown: KeyboardEventHandler = useCallback(
      (evt) => {
        if (
          (isKeyHotkey('mod+enter', evt) || (!enterForNewline && isKeyHotkey('enter', evt))) &&
          !isComposing(evt)
        ) {
          evt.preventDefault();
          handleSave();
        }
        if (isKeyHotkey('escape', evt)) {
          evt.preventDefault();
          onCancel();
        }
      },
      [onCancel, handleSave, enterForNewline, isComposing]
    );

    const handleKeyUp: KeyboardEventHandler = useCallback(
      (evt) => {
        if (isKeyHotkey('escape', evt)) {
          evt.preventDefault();
          return;
        }

        const prevWordRange = getPrevWorldRange(editor);
        const query = prevWordRange
          ? getAutocompleteQuery<AutocompletePrefix>(editor, prevWordRange, AUTOCOMPLETE_PREFIXES)
          : undefined;
        setAutocompleteQuery(query);
      },
      [editor]
    );

    const handleCloseAutocomplete = useCallback(() => {
      ReactEditor.focus(editor);
      setAutocompleteQuery(undefined);
    }, [editor]);

    const handleEmoticonSelect = (key: string, shortcode: string) => {
      editor.insertNode(createEmoticonElement(key, shortcode));
      moveCursor(editor);
    };

    useEffect(() => {
      const [body, customHtml] = getPrevBodyAndFormattedBody();

      const initialValue =
        typeof customHtml === 'string'
          ? htmlToEditorInput(customHtml, isMarkdown)
          : plainToEditorInput(typeof body === 'string' ? body : '', isMarkdown);

      Transforms.select(editor, {
        anchor: Editor.start(editor, []),
        focus: Editor.end(editor, []),
      });

      editor.insertFragment(initialValue);
      if (!mobileOrTablet()) ReactEditor.focus(editor);
    }, [editor, getPrevBodyAndFormattedBody, isMarkdown]);

    useEffect(() => {
      if (saveState.status === AsyncStatus.Success) {
        onCancel();
      }
    }, [saveState, onCancel]);

    return (
      <div {...props} ref={ref}>
        {autocompleteQuery?.prefix === AutocompletePrefix.RoomMention && (
          <RoomMentionAutocomplete
            roomId={roomId}
            editor={editor}
            query={autocompleteQuery}
            requestClose={handleCloseAutocomplete}
          />
        )}
        {autocompleteQuery?.prefix === AutocompletePrefix.UserMention && (
          <UserMentionAutocomplete
            roomId={roomId}
            editor={editor}
            query={autocompleteQuery}
            requestClose={handleCloseAutocomplete}
          />
        )}
        {autocompleteQuery?.prefix === AutocompletePrefix.Emoticon && (
          <EmoticonAutocomplete
            imagePackRooms={imagePackRooms || []}
            editor={editor}
            query={autocompleteQuery}
            requestClose={handleCloseAutocomplete}
          />
        )}
        <CustomEditor
          editor={editor}
          placeholder="Edit message..."
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          bottom={
            <>
              <Box
                style={{ padding: config.space.S200, paddingTop: 0 }}
                alignItems="End"
                justifyContent="SpaceBetween"
                gap="100"
              >
                <Box gap="Inherit">
                  <Chip
                    onClick={handleSave}
                    variant="Primary"
                    radii="Pill"
                    disabled={saveState.status === AsyncStatus.Loading}
                    outlined
                    before={
                      saveState.status === AsyncStatus.Loading ? (
                        <Spinner variant="Primary" fill="Soft" size="100" />
                      ) : undefined
                    }
                  >
                    <Text size="B300">Save</Text>
                  </Chip>
                  <Chip onClick={onCancel} variant="SurfaceVariant" radii="Pill">
                    <Text size="B300">Cancel</Text>
                  </Chip>
                </Box>
                <Box gap="Inherit">
                  <IconButton
                    variant="SurfaceVariant"
                    size="300"
                    radii="300"
                    onClick={() => setToolbar(!toolbar)}
                  >
                    <Icon size="400" src={toolbar ? Icons.AlphabetUnderline : Icons.Alphabet} />
                  </IconButton>
                  <UseStateProvider initial={undefined}>
                    {(anchor: RectCords | undefined, setAnchor) => (
                      <PopOut
                        anchor={anchor}
                        alignOffset={-8}
                        position="Top"
                        align="End"
                        content={
                          <EmojiBoard
                            imagePackRooms={imagePackRooms ?? []}
                            returnFocusOnDeactivate={false}
                            onEmojiSelect={handleEmoticonSelect}
                            onCustomEmojiSelect={handleEmoticonSelect}
                            requestClose={() => {
                              setAnchor((v) => {
                                if (v) {
                                  if (!mobileOrTablet()) ReactEditor.focus(editor);
                                  return undefined;
                                }
                                return v;
                              });
                            }}
                          />
                        }
                      >
                        <IconButton
                          aria-pressed={anchor !== undefined}
                          onClick={
                            ((evt) =>
                              setAnchor(
                                evt.currentTarget.getBoundingClientRect()
                              )) as MouseEventHandler<HTMLButtonElement>
                          }
                          variant="SurfaceVariant"
                          size="300"
                          radii="300"
                        >
                          <Icon size="400" src={Icons.Smile} filled={anchor !== undefined} />
                        </IconButton>
                      </PopOut>
                    )}
                  </UseStateProvider>
                </Box>
              </Box>
              {toolbar && (
                <div>
                  <Line variant="SurfaceVariant" size="300" />
                  <Toolbar />
                </div>
              )}
            </>
          }
        />
      </div>
    );
  }
);
