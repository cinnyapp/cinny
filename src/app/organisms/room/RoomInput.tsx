import React, { KeyboardEventHandler, useCallback, useEffect, useState } from 'react';
import isHotkey from 'is-hotkey';
import { MsgType, Room } from 'matrix-js-sdk';
import { ReactEditor } from 'slate-react';

import { Icon, IconButton, Icons, Line, PopOut } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  CustomEditor,
  EditorChangeHandler,
  useEditor,
  Toolbar,
  toMatrixCustomHTML,
  toPlainText,
  AUTOCOMPLETE_PREFIXES,
  AutocompletePrefix,
  AutocompleteQuery,
  getAutocompleteQuery,
  getPrevWorldRange,
  resetEditor,
  RoomMentionAutocomplete,
  UserMentionAutocomplete,
} from '../../components/editor';
import { EmojiBoard } from '../../components/emoji-board';
import { UseStateProvider } from '../../components/UseStateProvider';
import initMatrix from '../../../client/initMatrix';

interface RoomInputProps {
  roomId: string;
}
export function RoomInput({ roomId }: RoomInputProps) {
  const mx = useMatrixClient();
  const editor = useEditor();
  const allParentSpaces = [...(initMatrix.roomList?.getAllParentSpaces(roomId) ?? [])];
  const imagePackRooms: Room[] = allParentSpaces.reduce<Room[]>((list, rId) => {
    const r = mx.getRoom(rId);
    if (r) list.push(r);
    return list;
  }, []);
  const [toolbar, setToolbar] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] =
    useState<AutocompleteQuery<AutocompletePrefix>>();

  useEffect(() => {
    ReactEditor.focus(editor);
  }, [roomId, editor]);

  const submit = useCallback(() => {
    const plainText = toPlainText(editor.children).trim();
    const customHtml = toMatrixCustomHTML(editor.children);

    if (plainText === '') return;

    mx.sendMessage(roomId, {
      msgtype: MsgType.Text,
      body: plainText,
      format: 'org.matrix.custom.html',
      formatted_body: customHtml,
    });
    resetEditor(editor);
  }, [mx, roomId, editor]);

  const handleKeyDown: KeyboardEventHandler = useCallback(
    (evt) => {
      if (isHotkey('enter', evt)) {
        evt.preventDefault();
        submit();
      }
    },
    [submit]
  );

  const handleChange: EditorChangeHandler = () => {
    const prevWordRange = getPrevWorldRange(editor);
    const query = prevWordRange
      ? getAutocompleteQuery<AutocompletePrefix>(editor, prevWordRange, AUTOCOMPLETE_PREFIXES)
      : undefined;

    setAutocompleteQuery(query);
  };

  const handleEmojiSelect = (unicode: string) => {
    editor.insertText(unicode);
  };

  return (
    <div>
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
      <CustomEditor
        editor={editor}
        placeholder="Send a message..."
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        before={
          <IconButton variant="SurfaceVariant" size="300" radii="300">
            <Icon src={Icons.PlusCircle} />
          </IconButton>
        }
        after={
          <>
            <IconButton
              variant="SurfaceVariant"
              size="300"
              radii="300"
              onClick={() => setToolbar(!toolbar)}
              aria-pressed={toolbar}
            >
              <Icon src={toolbar ? Icons.AlphabetUnderline : Icons.Alphabet} />
            </IconButton>
            <UseStateProvider initial={false}>
              {(emojiBoard, setEmojiBoard) => (
                <PopOut
                  offset={16}
                  alignOffset={-44}
                  position="top"
                  align="end"
                  open={emojiBoard}
                  content={
                    <EmojiBoard
                      imagePackRooms={imagePackRooms}
                      returnFocusOnDeactivate={false}
                      onEmojiSelect={handleEmojiSelect}
                      requestClose={() => {
                        setEmojiBoard(false);
                        ReactEditor.focus(editor);
                      }}
                    />
                  }
                >
                  {(anchorRef) => (
                    <IconButton
                      aria-pressed={emojiBoard}
                      ref={anchorRef}
                      onClick={() => setEmojiBoard(!emojiBoard)}
                      variant="SurfaceVariant"
                      size="300"
                      radii="300"
                    >
                      <Icon src={Icons.Smile} />
                    </IconButton>
                  )}
                </PopOut>
              )}
            </UseStateProvider>
            <IconButton onClick={submit} variant="SurfaceVariant" size="300" radii="300">
              <Icon src={Icons.Send} />
            </IconButton>
          </>
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
    </div>
  );
}
