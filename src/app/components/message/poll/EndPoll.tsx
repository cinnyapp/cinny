import React from 'react';
import FocusTrap from 'focus-trap-react';
import {
  as,
  Box,
  Button,
  config,
  Header,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
} from 'folds';
import { stopPropagation } from '../../../utils/keyboard';

export const EndPollModal = as<
  'div',
  { open: boolean; setOpen: React.Dispatch<React.SetStateAction<boolean>> }
>(({ open, setOpen }, ref) => (
  // TODO: implement sending actual poll end event
  <Overlay ref={ref} open={open} backdrop={<OverlayBackdrop />}>
    <OverlayCenter>
      <FocusTrap
        focusTrapOptions={{
          initialFocus: false,
          onDeactivate: () => setOpen(false),
          clickOutsideDeactivates: true,
          escapeDeactivates: stopPropagation,
        }}
      >
        <Modal size="300" style={{ height: 'fit-content' }}>
          <Header
            size="600"
            style={{ padding: `0 ${config.space.S500}`, marginTop: config.space.S100 }}
          >
            <Text size="H4" truncate>
              End poll
            </Text>
          </Header>
          <Box
            direction="Column"
            gap="500"
            style={{ padding: `0 ${config.space.S500} ${config.space.S500}` }}
          >
            <Text size="T300">
              Are you sure you want to end this poll? This will reveal the results of the poll, and
              not allow anyone to vote on it anymore.
            </Text>

            <Box direction="Row" gap="500" style={{ width: '100%' }}>
              <Button
                variant="Secondary"
                fill="Soft"
                onClick={() => setOpen(false)}
                style={{ width: '100%' }}
              >
                <Text size="B400">Cancel</Text>
              </Button>
              <Button
                variant="Primary"
                fill="Soft"
                onClick={() => setOpen(false)}
                style={{ width: '100%' }}
              >
                <Text size="B400">End poll</Text>
              </Button>
            </Box>
          </Box>
        </Modal>
      </FocusTrap>
    </OverlayCenter>
  </Overlay>
));
