import FocusTrap from 'focus-trap-react';
import { as, Modal, Overlay, OverlayBackdrop, OverlayCenter } from 'folds';
import React, { ReactNode } from 'react';
import { ModalWide } from '../styles/Modal.css';
import { stopPropagation } from '../utils/keyboard';

export type RenderViewerProps = {
  src: string;
  alt: string;
  requestClose: () => void;
};

export const ImageOverlay = as<
  'div',
  {
    src: string;
    alt: string;
    viewer: boolean;
    requestClose: () => void;
    renderViewer: (props: RenderViewerProps) => ReactNode;
  }
>(({ src, alt, viewer, requestClose, renderViewer, ...props }, ref) => (
  <Overlay {...props} ref={ref} open={viewer} backdrop={<OverlayBackdrop />}>
    <OverlayCenter>
      <FocusTrap
        focusTrapOptions={{
          initialFocus: false,
          onDeactivate: () => requestClose(),
          clickOutsideDeactivates: true,
          escapeDeactivates: stopPropagation,
        }}
      >
        <Modal className={ModalWide} size="500" onContextMenu={(evt: any) => evt.stopPropagation()}>
          {renderViewer({
            src,
            alt,
            requestClose: () => requestClose(),
          })}
        </Modal>
      </FocusTrap>
    </OverlayCenter>
  </Overlay>
));
