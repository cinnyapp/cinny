import React from 'react';
import {
  Box,
  config,
  Header,
  Icon,
  IconButton,
  Icons,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Scroll,
  Text,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { SpaceProvider } from '../../hooks/useSpace';
import { CreateSpaceForm } from './CreateSpace';
import {
  useCloseCreateSpaceModal,
  useCreateSpaceModalState,
} from '../../state/hooks/createSpaceModal';
import { CreateSpaceModalState } from '../../state/createSpaceModal';
import { stopPropagation } from '../../utils/keyboard';

type CreateSpaceModalProps = {
  state: CreateSpaceModalState;
};
function CreateSpaceModal({ state }: CreateSpaceModalProps) {
  const { spaceId } = state;
  const closeDialog = useCloseCreateSpaceModal();

  return (
    <SpaceProvider value={spaceId ?? null}>
      <Overlay open backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              clickOutsideDeactivates: true,
              onDeactivate: closeDialog,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Modal size="300" flexHeight>
              <Box direction="Column">
                <Header
                  size="500"
                  style={{
                    padding: config.space.S200,
                    paddingLeft: config.space.S400,
                    borderBottomWidth: config.borderWidth.B300,
                  }}
                >
                  <Box grow="Yes">
                    <Text size="H4">New Space</Text>
                  </Box>
                  <Box shrink="No">
                    <IconButton size="300" radii="300" onClick={closeDialog}>
                      <Icon src={Icons.Cross} />
                    </IconButton>
                  </Box>
                </Header>
                <Scroll size="300" hideTrack>
                  <Box
                    style={{
                      padding: config.space.S400,
                      paddingRight: config.space.S200,
                    }}
                    direction="Column"
                    gap="500"
                  >
                    <CreateSpaceForm spaceId={spaceId} onCreate={closeDialog} />
                  </Box>
                </Scroll>
              </Box>
            </Modal>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
    </SpaceProvider>
  );
}

export function CreateSpaceModalRenderer() {
  const state = useCreateSpaceModalState();

  if (!state) return null;
  return <CreateSpaceModal state={state} />;
}
