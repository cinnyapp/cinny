/* eslint-disable no-param-reassign */
import React, { KeyboardEventHandler, ReactNode, useCallback, useState } from 'react';

import { Box, Scroll } from 'folds';
import { Descendant, Editor, createEditor } from 'slate';
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

const withMentions = (editor: Editor) => {
  const { isInline, isVoid } = editor;

  editor.isInline = (element) => element.type === BlockType.Mention || isInline(element);
  editor.isVoid = (element) => element.type === BlockType.Mention || isVoid(element);

  return editor;
};

export const useEditor = (): Editor => {
  const [editor] = useState(withMentions(withReact(createEditor())));
  return editor;
};

export type EditorChangeHandler = ((value: Descendant[]) => void) | undefined;
type CustomEditorProps = {
  top?: ReactNode;
  bottom?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  maxHeight?: string;
  editor: Editor;
  placeholder?: string;
  onKeyDown?: KeyboardEventHandler;
  onChange?: EditorChangeHandler;
};
export function CustomEditor({
  top,
  bottom,
  before,
  after,
  maxHeight = '50vh',
  editor,
  placeholder,
  onKeyDown,
  onChange,
}: CustomEditorProps) {
  const renderElement = useCallback(
    (props: RenderElementProps) => <RenderElement {...props} />,
    []
  );

  const renderLeaf = useCallback((props: RenderLeafProps) => <RenderLeaf {...props} />, []);

  const handleKeydown: KeyboardEventHandler = useCallback(
    (evt) => {
      onKeyDown?.(evt);
      toggleKeyboardShortcut(editor, evt);
    },
    [editor, onKeyDown]
  );

  return (
    <div className={css.Editor}>
      <Slate editor={editor} value={initialValue} onChange={onChange}>
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
