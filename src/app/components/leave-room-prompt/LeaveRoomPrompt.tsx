import React, { useCallback, useEffect } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Dialog,
  Overlay,
  OverlayCenter,
  OverlayBackdrop,
  Header,
  config,
  Box,
  Text,
  IconButton,
  Icon,
  Icons,
  color,
  Button,
  Spinner,
} from 'folds';
import { postLeave } from 'neurone/lib/api/matrix/client/v3/rooms';
import {
  MatrixResponseResult,
  parseMatrixResp,
  printMatrixError,
} from 'neurone/lib/matrix-request';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { stopPropagation } from '../../utils/keyboard';
import { useClient } from '../../hooks/useClient';
import { deleteJoinRooms } from '../../../client/syncWriter/utils';

type LeaveRoomPromptProps = {
  roomId: string;
  onDone: () => void;
  onCancel: () => void;
};
export function LeaveRoomPrompt({ roomId, onDone, onCancel }: LeaveRoomPromptProps) {
  const ct = useClient();

  const [leaveState, leaveRoom] = useAsyncCallback<MatrixResponseResult<unknown>, Error, []>(
    useCallback(async () => {
      const response = await ct.requestAuthJSON(postLeave({ pathParams: { roomId } }));
      deleteJoinRooms(ct, [roomId])
        .then(() => console.log('=====> deleted'))
        .catch((e) => {
          console.error(e);
        });
      return parseMatrixResp(response);
    }, [ct, roomId])
  );
  const success = leaveState.status === AsyncStatus.Success;
  const [requestError] = success ? leaveState.data : [];

  const handleLeave = () => {
    leaveRoom();
  };

  useEffect(() => {
    if (success) {
      onDone();
    }
  }, [success, onDone]);

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: onCancel,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog variant="Surface">
            <Header
              style={{
                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                borderBottomWidth: config.borderWidth.B300,
              }}
              variant="Surface"
              size="500"
            >
              <Box grow="Yes">
                <Text size="H4">Leave Room</Text>
              </Box>
              <IconButton size="300" onClick={onCancel} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              <Box direction="Column" gap="200">
                <Text priority="400">Are you sure you want to leave this room?</Text>
                {leaveState.status === AsyncStatus.Error && (
                  <Text style={{ color: color.Critical.Main }} size="T300">
                    Failed to leave room! {leaveState.error.message}
                  </Text>
                )}
                {requestError && (
                  <Text style={{ color: color.Critical.Main }} size="T300">
                    Failed to leave room! {printMatrixError(requestError)}
                  </Text>
                )}
              </Box>
              <Button
                type="submit"
                variant="Critical"
                onClick={handleLeave}
                before={
                  leaveState.status === AsyncStatus.Loading ? (
                    <Spinner fill="Solid" variant="Critical" size="200" />
                  ) : undefined
                }
                aria-disabled={
                  leaveState.status === AsyncStatus.Loading ||
                  leaveState.status === AsyncStatus.Success
                }
              >
                <Text size="B400">
                  {leaveState.status === AsyncStatus.Loading ? 'Leaving...' : 'Leave'}
                </Text>
              </Button>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
