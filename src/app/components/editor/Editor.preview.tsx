import React, { useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  config,
  Icon,
  IconButton,
  Icons,
  Line,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
} from 'folds';

import { CustomEditor, useEditor } from './Editor';
import { Toolbar } from './Toolbar';
import { stopPropagation } from '../../utils/keyboard';

export function EditorPreview() {
  const [open, setOpen] = useState(false);
  const editor = useEditor();
  const [toolbar, setToolbar] = useState(false);

  return (
    <>
      <IconButton variant="SurfaceVariant" onClick={() => setOpen(!open)}>
        <Icon src={Icons.BlockQuote} />
      </IconButton>
      <Overlay open={open} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setOpen(false),
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal size="500">
              <div style={{ padding: config.space.S400 }}>
                <CustomEditor
                  editor={editor}
                  placeholder="Send a message..."
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
                      <IconButton variant="SurfaceVariant" size="300" radii="300">
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
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
    </>
  );
}
