import React, { KeyboardEventHandler, useCallback, useEffect, useState } from 'react';
import { Box, Chip, Icon, IconButton, Icons, Line, PopOut, Text, as, config } from 'folds';
import { Editor, Transforms } from 'slate';
import { ReactEditor } from 'slate-react';
import { IContent, MatrixEvent, Room } from 'matrix-js-sdk';
import isHotkey from 'is-hotkey';
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
import { settingsAtom } from '../../../state/settings';
import { UseStateProvider } from '../../../components/UseStateProvider';
import { EmojiBoard } from '../../../components/emoji-board';

type MessageEditorProps = {
  roomId: string;
  mEvent: MatrixEvent;
  imagePackRooms?: Room[];
  onCancel: () => void;
};
export const MessageEditor = as<'div', MessageEditorProps>(
  ({ roomId, mEvent, imagePackRooms, onCancel, ...props }, ref) => {
    const editor = useEditor();
    const [globalToolbar] = useSetting(settingsAtom, 'editorToolbar');
    const [toolbar, setToolbar] = useState(globalToolbar);

    const [autocompleteQuery, setAutocompleteQuery] =
      useState<AutocompleteQuery<AutocompletePrefix>>();

    const handleKeyDown: KeyboardEventHandler = useCallback(
      (evt) => {
        if (isHotkey('escape', evt)) {
          evt.preventDefault();
          onCancel();
        }
      },
      [onCancel]
    );

    const handleKeyUp: KeyboardEventHandler = useCallback(() => {
      const prevWordRange = getPrevWorldRange(editor);
      const query = prevWordRange
        ? getAutocompleteQuery<AutocompletePrefix>(editor, prevWordRange, AUTOCOMPLETE_PREFIXES)
        : undefined;
      setAutocompleteQuery(query);
    }, [editor]);

    const handleEmoticonSelect = (key: string, shortcode: string) => {
      editor.insertNode(createEmoticonElement(key, shortcode));
      moveCursor(editor);
    };

    useEffect(() => {
      // FIXME: take latest message if edited
      const { body, formatted_body: customHtml } = mEvent.getContent<IContent>();
      const initialValue =
        typeof customHtml === 'string'
          ? htmlToEditorInput(customHtml)
          : plainToEditorInput(typeof body === 'string' ? body : '');

      Transforms.select(editor, {
        anchor: Editor.start(editor, []),
        focus: Editor.end(editor, []),
      });

      editor.insertFragment(initialValue);
      ReactEditor.focus(editor);
    }, [editor, mEvent]);

    return (
      <div {...props} ref={ref}>
        {autocompleteQuery?.prefix === AutocompletePrefix.RoomMention && (
          <RoomMentionAutocomplete
            roomId={roomId}
            editor={editor}
            query={autocompleteQuery}
            requestClose={() => setAutocompleteQuery(undefined)}
          />
        )}
        {autocompleteQuery?.prefix === AutocompletePrefix.UserMention && (
          <UserMentionAutocomplete
            roomId={roomId}
            editor={editor}
            query={autocompleteQuery}
            requestClose={() => setAutocompleteQuery(undefined)}
          />
        )}
        {autocompleteQuery?.prefix === AutocompletePrefix.Emoticon && (
          <EmoticonAutocomplete
            imagePackRooms={imagePackRooms || []}
            editor={editor}
            query={autocompleteQuery}
            requestClose={() => setAutocompleteQuery(undefined)}
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
                alignItems="Center"
                justifyContent="SpaceBetween"
                gap="100"
              >
                <Box gap="200">
                  <Chip variant="Primary" radii="Pill" outlined>
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
                    <Icon size="100" src={toolbar ? Icons.AlphabetUnderline : Icons.Alphabet} />
                  </IconButton>
                  <UseStateProvider initial={false}>
                    {(emojiBoard: boolean, setEmojiBoard) => (
                      <PopOut
                        alignOffset={-8}
                        position="Top"
                        align="End"
                        open={!!emojiBoard}
                        content={
                          <EmojiBoard
                            imagePackRooms={imagePackRooms ?? []}
                            returnFocusOnDeactivate={false}
                            onEmojiSelect={handleEmoticonSelect}
                            onCustomEmojiSelect={handleEmoticonSelect}
                            requestClose={() => {
                              setEmojiBoard(false);
                              ReactEditor.focus(editor);
                            }}
                          />
                        }
                      >
                        {(anchorRef) => (
                          <IconButton
                            ref={anchorRef}
                            aria-pressed={emojiBoard}
                            onClick={() => setEmojiBoard(true)}
                            variant="SurfaceVariant"
                            size="300"
                            radii="300"
                          >
                            <Icon size="100" src={Icons.Smile} filled={emojiBoard} />
                          </IconButton>
                        )}
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
