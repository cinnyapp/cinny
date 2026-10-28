import React, { useState } from 'react';
import { Box, Button, Spinner, Text, color, config } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { FriendsApiError } from './friendsApi';
import { useFriends, useFriendsApi } from './useFriends';
import { friendDisplayName } from './userDisplay';
import { FriendAvatar } from './FriendAvatar';

const pendingErrorMessage = (error: unknown): string => {
  if (error instanceof FriendsApiError && error.code === 'no_request') {
    return 'This request no longer exists';
  }
  return "Couldn't update the request, try again";
};

type Action = 'accept' | 'remove';

type PendingRowProps = {
  userId: string;
  direction: 'incoming' | 'outgoing';
};
export function PendingRow({ userId, direction }: PendingRowProps) {
  const mx = useMatrixClient();
  const api = useFriendsApi();
  const { refresh } = useFriends();
  const [inFlight, setInFlight] = useState<Action>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const name = friendDisplayName(mx, userId);

  const run = async (action: Action) => {
    setInFlight(action);
    setErrorMessage(undefined);
    try {
      if (action === 'accept') await api.accept(userId);
      else await api.remove(userId);
    } catch (e) {
      setErrorMessage(pendingErrorMessage(e));
    } finally {
      await refresh();
      setInFlight(undefined);
    }
  };

  const busy = inFlight !== undefined;
  const spinner = <Spinner size="100" variant="Secondary" />;

  return (
    <Box
      direction="Column"
      gap="100"
      style={{ padding: `${config.space.S100} ${config.space.S200}` }}
    >
      <Box alignItems="Center" gap="300">
        <FriendAvatar userId={userId} />
        <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
          <Text size="T400" truncate>
            {name}
          </Text>
          <Text size="T200" priority="300" truncate>
            {direction === 'incoming' ? 'Incoming request' : 'Outgoing request'} · {userId}
          </Text>
        </Box>
        <Box shrink="No" gap="200">
          {direction === 'incoming' ? (
            <>
              <Button
                size="300"
                variant="Success"
                fill="Solid"
                radii="300"
                disabled={busy}
                before={inFlight === 'accept' && spinner}
                onClick={() => run('accept')}
              >
                <Text size="B300">Accept</Text>
              </Button>
              <Button
                size="300"
                variant="Secondary"
                fill="Soft"
                radii="300"
                disabled={busy}
                before={inFlight === 'remove' && spinner}
                onClick={() => run('remove')}
              >
                <Text size="B300">Decline</Text>
              </Button>
            </>
          ) : (
            <Button
              size="300"
              variant="Secondary"
              fill="Soft"
              radii="300"
              disabled={busy}
              before={inFlight === 'remove' && spinner}
              onClick={() => run('remove')}
            >
              <Text size="B300">Cancel</Text>
            </Button>
          )}
        </Box>
      </Box>
      {errorMessage && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          {errorMessage}
        </Text>
      )}
    </Box>
  );
}
