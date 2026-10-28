import React, { FormEventHandler, useState } from 'react';
import { Box, Button, Icon, Icons, Input, Spinner, Text, color } from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getMxIdServer } from '../../utils/matrix';
import { expandUserId } from './friendsApi';
import { useFriends, useFriendsApi } from './useFriends';
import { sendErrorMessage, sendSuccessMessage } from './addFriendMessages';

type Feedback = { ok: boolean; text: string };

export function AddFriend() {
  const mx = useMatrixClient();
  const api = useFriendsApi();
  const { refresh } = useFriends();
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (evt) => {
    evt.preventDefault();
    if (sending || !value.trim()) return;
    const userId = expandUserId(value, getMxIdServer(mx.getSafeUserId()) ?? '');
    setSending(true);
    setFeedback(undefined);
    try {
      const result = await api.sendRequest(userId);
      setFeedback({ ok: true, text: sendSuccessMessage(result, userId) });
      setValue('');
    } catch (e) {
      setFeedback({ ok: false, text: sendErrorMessage(e, userId) });
    } finally {
      await refresh();
      setSending(false);
    }
  };

  return (
    <Box as="form" direction="Column" gap="200" onSubmit={handleSubmit}>
      <Text size="L400">Add a friend by their username</Text>
      <Box gap="200" wrap="Wrap">
        <Box grow="Yes" style={{ minWidth: 0 }}>
          <Input
            style={{ width: '100%' }}
            name="friendUsername"
            placeholder="username"
            value={value}
            onChange={(evt) => setValue(evt.currentTarget.value)}
            before={<Icon size="100" src={Icons.User} />}
            size="400"
            variant="SurfaceVariant"
            radii="400"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={sending}
          />
        </Box>
        <Button
          type="submit"
          size="400"
          variant="Primary"
          fill="Solid"
          radii="400"
          disabled={sending || !value.trim()}
          before={sending && <Spinner size="100" variant="Primary" fill="Solid" />}
        >
          <Text size="B400">Send request</Text>
        </Button>
      </Box>
      {feedback && (
        <Text size="T300" style={{ color: feedback.ok ? color.Success.Main : color.Critical.Main }}>
          {feedback.text}
        </Text>
      )}
    </Box>
  );
}
