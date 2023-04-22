import React, { KeyboardEventHandler, useCallback, useState } from 'react';
import isHotkey from 'is-hotkey';
import { MsgType } from 'matrix-js-sdk';
import { Editor } from 'slate';

import { Icon, IconButton, Icons, Line } from 'folds';
import { CustomEditor, EditorChangeHandler, useEditor } from '../../components/editor/Editor';
import { Toolbar } from '../../components/editor/Toolbar';
import { toMatrixCustomHTML, toPlainText } from '../../components/editor/output';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  getPrevWorldRange,
  getWordPrefix,
  insertMention,
  resetEditor,
} from '../../components/editor/common';

interface RoomInputProps {
  roomId: string;
}
export function RoomInput({ roomId }: RoomInputProps) {
  const mx = useMatrixClient();
  const editor = useEditor();
  const [toolbar, setToolbar] = useState(false);

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
    if (prevWordRange) {
      const prevWorld = Editor.string(editor, prevWordRange);
      const prefix = getWordPrefix(editor, prevWordRange);
      switch (prefix) {
        case '@':
          console.log(`USER_MENTION: ${prevWorld}`);
          break;
        case '#':
          console.log(`ROOM_MENTION: ${prevWorld}`);
          break;
        case ':':
          console.log(`EMOJI_CODE: ${prevWorld}`);
          break;
        default:
      }
      // TODO: [x] get worldPrefix character
      // [x] switch based on world Prefix
      // generate specif search result based on prefix + word text
      // Show a generic overflow menu
      // const domRange = targetRange && ReactEditor.toDOMRange(editor, targetRange);
    }
  };

  return (
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
          <IconButton
            variant="SurfaceVariant"
            size="300"
            radii="300"
            onClick={() => insertMention(editor, '@kfiven:matrix.org', '@Lozenge', true)}
          >
            <Icon src={Icons.Smile} />
          </IconButton>
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
  );
}
