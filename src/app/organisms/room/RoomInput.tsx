import React, { useCallback, useState } from 'react';
import { Editor, Transforms } from 'slate';
import { MsgType } from 'matrix-js-sdk';

import { Icon, IconButton, Icons, Line } from 'folds';
import { CustomEditor, useEditor } from '../../components/editor/Editor';
import { Toolbar } from '../../components/editor/Toolbar';
import { toMatrixCustomHTML, toPlainText } from '../../components/editor/output';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { BlockType } from '../../components/editor/Elements';
import { resetEditor } from '../../components/editor/common';

interface RoomInputProps {
  roomId: string;
}
export function RoomInput({ roomId }: RoomInputProps) {
  const mx = useMatrixClient();
  const editor = useEditor();
  const [toolbar, setToolbar] = useState(false);

  const handleSubmit = useCallback(
    (e: Editor) => {
      const plainText = toPlainText(e.children).trim();
      const customHtml = toMatrixCustomHTML(e.children);

      Transforms.setNodes(e, {
        type: BlockType.Paragraph,
      });
      if (plainText === '') return;

      mx.sendMessage(roomId, {
        msgtype: MsgType.Text,
        body: plainText,
        format: 'org.matrix.custom.html',
        formatted_body: customHtml,
      });
      resetEditor(e);
    },
    [mx, roomId]
  );

  return (
    <CustomEditor
      editor={editor}
      placeholder="Send a message..."
      submitKey="enter"
      onSubmit={handleSubmit}
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
          <IconButton variant="SurfaceVariant" size="300" radii="300">
            <Icon src={Icons.Smile} />
          </IconButton>
          <IconButton
            onClick={() => handleSubmit(editor)}
            variant="SurfaceVariant"
            size="300"
            radii="300"
          >
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
