import React, {
  KeyboardEventHandler,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
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
  color,
  config,
} from 'folds';
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
  getAutocompleteQuery,
  getPrevWorldRange,
  htmlToEditorInput,
  moveCursor,
  plainToEditorInput,
  useEditor,
} from '../../../components/editor';
import { useSetting } from '../../../state/hooks/settings';
import { UseStateProvider } from '../../../components/UseStateProvider';
import { EmojiBoard } from '../../../components/emoji-board';
import { AsyncStatus } from '../../../hooks/useAsyncCallback';
import { mobileOrTablet } from '../../../utils/user-agent';
import { useComposingCheck } from '../../../hooks/useComposingCheck';
import { useSendEditedMessage } from '../hooks/useSendEditedMessage';
import { useObservableValueOptionally } from '../../../hooks/useObservableValue';
import { rContent } from '../../../../client/reader';
import {
  EventSenderError,
  EventSenderPending,
  EventSenderSuccess,
} from '../../../../client/room/local-event';

type MessageEditorProps = {
  roomId: string;
  event: MessageEventWithoutRoomId;
  imagePackRooms?: string[];
  onCancel: () => void;
};
export const MessageEditor = as<'div', MessageEditorProps>(
  ({ roomId, event, imagePackRooms, onCancel, ...props }, ref) => {
    const editor = useEditor();
    const [enterForNewline] = useSetting('enterForNewline');
    const [globalToolbar] = useSetting('editorToolbar');
    const [isMarkdown] = useSetting('isMarkdown');
    const [toolbar, setToolbar] = useState(globalToolbar);
    const isComposing = useComposingCheck();

    const [autocompleteQuery, setAutocompleteQuery] =
      useState<AutocompleteQuery<AutocompletePrefix>>();

    const { saveState, localEventSender, save } = useSendEditedMessage(editor, event);

    const senderState = useObservableValueOptionally(localEventSender?.state);
    const saving =
      saveState.status === AsyncStatus.Loading || senderState instanceof EventSenderPending;

    const handleSave = useCallback(() => {
      if (saveState.status !== AsyncStatus.Loading) {
        save(onCancel);
      }
    }, [saveState, save, onCancel]);

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
      if (!mobileOrTablet()) ReactEditor.focus(editor);
    }, [editor]);

    const initialEditorValue = useMemo(() => {
      const prevContent = rContent.newContent(event.content) ?? event.content;
      const customHtml = rContent.formattedBody(prevContent);
      const body = rContent.body(prevContent);

      const initialValue =
        typeof customHtml === 'string'
          ? htmlToEditorInput(customHtml, isMarkdown)
          : plainToEditorInput(typeof body === 'string' ? body : '', isMarkdown);

      return initialValue;
    }, [event, isMarkdown]);

    useEffect(() => {
      if (senderState instanceof EventSenderSuccess) {
        onCancel();
      }
    }, [senderState, onCancel]);

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
          initialValue={initialEditorValue}
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
                <Box direction="Column" gap="200">
                  {senderState instanceof EventSenderError && (
                    <Text size="T200" style={{ color: color.Critical.Main }}>
                      {senderState.error?.data.error ??
                        (senderState.cause instanceof Error
                          ? senderState.cause.message
                          : 'Unknown Error')}
                    </Text>
                  )}
                  {saveState.status === AsyncStatus.Error && (
                    <Text size="T200" style={{ color: color.Critical.Main }}>
                      {saveState.error instanceof Error ? saveState.error.message : 'Unknown Error'}
                    </Text>
                  )}
                  <Box>
                    <Chip
                      onClick={handleSave}
                      variant="Primary"
                      radii="Pill"
                      disabled={saving}
                      outlined
                      before={
                        saving ? <Spinner variant="Primary" fill="Soft" size="100" /> : undefined
                      }
                    >
                      <Text size="B300">Save</Text>
                    </Chip>
                    <Chip onClick={onCancel} variant="SurfaceVariant" radii="Pill">
                      <Text size="B300">Cancel</Text>
                    </Chip>
                  </Box>
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
