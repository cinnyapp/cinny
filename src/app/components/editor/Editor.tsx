import React, { KeyboardEventHandler, ReactNode, useCallback, useState } from 'react';
import isHotkey from 'is-hotkey';

import { Box, Scroll } from 'folds';
import { Editor, createEditor } from 'slate';
import { Slate, Editable, withReact, RenderLeafProps, RenderElementProps } from 'slate-react';
import { BlockType, RenderElement, RenderLeaf } from './Elements';
import { CustomElement } from './slate';
import * as css from './Editor.css';
import { toggleKeyboardShortcut } from './keyboard';

const initialValue: CustomElement[] = [
  {
    type: BlockType.Paragraph,
    children: [{ text: '' }],
  },
];

export const useEditor = (): Editor => {
  const [editor] = useState(() => withReact(createEditor()));
  return editor;
};

type CustomEditorProps = {
  top?: ReactNode;
  bottom?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  maxHeight?: string;
  editor: Editor;
  placeholder?: string;
  submitKey?: 'enter' | 'shift+enter';
  onSubmit?: (editor: Editor) => void;
};
export function CustomEditor({
  top,
  bottom,
  before,
  after,
  maxHeight = '50vh',
  editor,
  placeholder,
  submitKey = 'enter',
  onSubmit,
}: CustomEditorProps) {
  const renderElement = useCallback(
    (props: RenderElementProps) => <RenderElement {...props} />,
    []
  );

  const renderLeaf = useCallback((props: RenderLeafProps) => <RenderLeaf {...props} />, []);

  const handleKeydown: KeyboardEventHandler = useCallback(
    (evt) => {
      if (isHotkey(submitKey, evt)) {
        evt.preventDefault();
        onSubmit?.(editor);
        return;
      }
      toggleKeyboardShortcut(editor, evt);
    },
    [editor, submitKey, onSubmit]
  );

  return (
    <div className={css.Editor}>
      <Slate editor={editor} value={initialValue}>
        {top}
        <Box alignItems="Start">
          {before && (
            <Box className={css.EditorOptions} alignItems="Center" gap="100" shrink="No">
              {before}
            </Box>
          )}
          <Scroll
            className={css.EditorTextareaScroll}
            variant="SurfaceVariant"
            style={{ maxHeight }}
            size="300"
            visibility="Hover"
            hideTrack
          >
            <Editable
              className={css.EditorTextarea}
              placeholder={placeholder}
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              onKeyDown={handleKeydown}
            />
          </Scroll>
          {after && (
            <Box className={css.EditorOptions} alignItems="Center" gap="100" shrink="No">
              {after}
            </Box>
          )}
        </Box>
        {bottom}
      </Slate>
    </div>
  );
}
