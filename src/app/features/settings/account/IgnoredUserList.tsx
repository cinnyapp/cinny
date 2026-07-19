import React, { ChangeEventHandler, FormEventHandler, useCallback, useState } from 'react';
import { Box, Button, Chip, Icon, IconButton, Icons, Input, Spinner, Text, config } from 'folds';
import { putAccountData } from 'neurone/lib/api/matrix/client/v3/user';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { isUserId } from '../../../utils/matrix';
import { getIgnoredUsersContent, useIgnoredUsers } from '../../../hooks/useIgnoredUsers';
import { useAlive } from '../../../hooks/useAlive';
import { useClient } from '../../../hooks/useClient';
import { AccountDataType } from '../../../../types/matrix/accountData';

function IgnoreUserInput({ userList }: { userList: string[] }) {
  const ct = useClient();
  const [userId, setUserId] = useState<string>('');
  const alive = useAlive();

  const [ignoreState, ignore] = useAsyncCallback(
    useCallback(
      (uId: string) =>
        ct.requestAuthJSON(
          putAccountData({
            pathParams: { userId: ct.session.userId, type: AccountDataType.IgnoredUserList },
            body: getIgnoredUsersContent(userList.filter((id) => id !== uId).concat([uId])),
          })
        ),
      [ct, userList]
    )
  );
  const ignoring = ignoreState.status === AsyncStatus.Loading;

  const handleChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const uId = evt.currentTarget.value;
    setUserId(uId);
  };

  const handleReset = () => {
    setUserId('');
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (ignoring) return;

    const target = evt.target as HTMLFormElement | undefined;
    const userIdInput = target?.userIdInput as HTMLInputElement | undefined;
    const uId = userIdInput?.value.trim();
    if (!uId) return;

    if (!isUserId(uId)) return;

    ignore(uId).then(() => {
      if (alive()) {
        setUserId('');
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} gap="200" aria-disabled={ignoring}>
      <Box grow="Yes" direction="Column">
        <Input
          required
          name="userIdInput"
          value={userId}
          onChange={handleChange}
          variant="Secondary"
          radii="300"
          style={{ paddingRight: config.space.S200 }}
          readOnly={ignoring}
          after={
            userId &&
            !ignoring && (
              <IconButton
                type="reset"
                onClick={handleReset}
                size="300"
                radii="300"
                variant="Secondary"
              >
                <Icon src={Icons.Cross} size="100" />
              </IconButton>
            )
          }
        />
      </Box>
      <Button
        size="400"
        variant="Secondary"
        fill="Soft"
        outlined
        radii="300"
        type="submit"
        disabled={ignoring}
      >
        {ignoring && <Spinner variant="Secondary" size="300" />}
        <Text size="B400">Block</Text>
      </Button>
    </Box>
  );
}

function IgnoredUserChip({ userId, userList }: { userId: string; userList: string[] }) {
  const ct = useClient();
  const [unignoreState, unignore] = useAsyncCallback(
    useCallback(
      async () =>
        ct.requestAuthJSON(
          putAccountData({
            pathParams: { userId: ct.session.userId, type: AccountDataType.IgnoredUserList },
            body: getIgnoredUsersContent(userList.filter((u) => u !== userId)),
          })
        ),
      [ct, userList, userId]
    )
  );

  const handleUnignore = () => unignore();

  const unIgnoring = unignoreState.status === AsyncStatus.Loading;
  return (
    <Chip
      variant="Secondary"
      radii="Pill"
      after={
        unIgnoring ? (
          <Spinner variant="Secondary" size="100" />
        ) : (
          <Icon src={Icons.Cross} size="100" />
        )
      }
      onClick={handleUnignore}
      disabled={unIgnoring}
    >
      <Text size="T200" truncate>
        {userId}
      </Text>
    </Chip>
  );
}

export function IgnoredUserList() {
  const ignoredUsers = useIgnoredUsers();

  return (
    <Box direction="Column" gap="100">
      <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
        <Text size="L400">Blocked Users</Text>
      </Box>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title="Select User"
          description="Prevent receiving messages or invites from user by adding their userId."
        >
          <Box direction="Column" gap="300">
            <IgnoreUserInput userList={ignoredUsers} />
            {ignoredUsers.length > 0 && (
              <Box direction="Inherit" gap="100">
                <Text size="L400">Users</Text>
                <Box wrap="Wrap" gap="200">
                  {ignoredUsers.map((userId) => (
                    <IgnoredUserChip key={userId} userId={userId} userList={ignoredUsers} />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </SettingTile>
      </SequenceCard>
    </Box>
  );
}
