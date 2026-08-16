import { MutableRefObject, RefObject, useCallback, useEffect } from 'react';
import { isKeyHotkey } from 'is-hotkey';
import { ReactEditor } from 'slate-react';
import { Editor } from 'slate';
import { useKeyDown } from '../../../hooks/useKeyDown';
import { editableActiveElement } from '../../../utils/dom';

const FN_KEYS_REGEX = /^F\d+$/;

const shouldFocusMessageField = (evt: KeyboardEvent): boolean => {
  const { code } = evt;

  if (evt.metaKey || evt.altKey || evt.ctrlKey) {
    return false;
  }

  if (FN_KEYS_REGEX.test(code)) return false;

  if (
    code.startsWith('OS') ||
    code.startsWith('Meta') ||
    code.startsWith('Shift') ||
    code.startsWith('Alt') ||
    code.startsWith('Control') ||
    code.startsWith('Arrow') ||
    code.startsWith('Page') ||
    code.startsWith('End') ||
    code.startsWith('Home') ||
    code === 'Tab' ||
    code === 'Space' ||
    code === 'Enter' ||
    code === 'NumLock' ||
    code === 'ScrollLock'
  ) {
    return false;
  }

  return true;
};

export const useEditorAutoFocus = (
  editor: Editor,
  threadFocusRef: RefObject<boolean>,
  thread: boolean
) => {
  useKeyDown(
    window,
    useCallback(
      (evt) => {
        if (editableActiveElement()) return;

        const portalContainer = document.getElementById('portalContainer');
        if (portalContainer && portalContainer.children.length > 0) {
          return;
        }

        if (!shouldFocusMessageField(evt) && !isKeyHotkey('mod+v', evt)) {
          return;
        }

        if (threadFocusRef.current && !thread) {
          return;
        }

        ReactEditor.focus(editor);
      },
      [editor, threadFocusRef, thread]
    )
  );
};

export const useThreadFocus = (
  threadId: string,
  threadFocusRef: MutableRefObject<boolean>,
  viewElementRef: RefObject<HTMLElement>
) => {
  useEffect(() => {
    const handlePointerDown = (evt: PointerEvent) => {
      const viewElement = viewElementRef.current;
      if (!viewElement) return;

      const lastTarget = evt.target;

      const clickedInsideView = lastTarget instanceof Node && viewElement.contains(lastTarget);
      // eslint-disable-next-line no-param-reassign
      threadFocusRef.current = clickedInsideView;
    };

    // eslint-disable-next-line no-param-reassign
    threadFocusRef.current = !!threadId; // detect thread-change
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      // eslint-disable-next-line no-param-reassign
      threadFocusRef.current = false;
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [threadFocusRef, viewElementRef, threadId]);

  return threadFocusRef;
};
