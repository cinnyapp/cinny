import React, { FormEventHandler, useCallback, useEffect, useState } from 'react';
import { Badge, Box, Button, Chip, Input, Spinner, Text, color, config } from 'folds';
import { SettingTile } from '../../../components/setting-tile';
import { PasswordInput } from '../../../components/password-input';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { copyToClipboard } from '../../../utils/dom';
import { useToast } from '../../../components/toast';
import { useAdminApi } from '../../admin/useAdminApi';
import {
  MIN_PASSWORD_LENGTH,
  ManagedUser,
  ROLE_LABELS,
  Role,
  adminErrorMessage,
  generatePassword,
  loginDetails,
  matchesUserFilter,
} from '../../admin/adminApi';

const ROLE_BADGE: Record<Role, 'Secondary' | 'Primary' | 'Critical' | 'Warning'> = {
  user: 'Secondary',
  admin: 'Primary',
  superadmin: 'Critical',
  bot: 'Warning',
};

type Action = (label: string, run: () => Promise<void>) => Promise<boolean>;

function ResetPassword({ user, act }: { user: ManagedUser; act: Action }) {
  const mx = useMatrixClient();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState<string>();
  const api = useAdminApi();

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (evt) => {
    evt.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) return;
    const ok = await act(`Password reset for ${user.userId}`, () =>
      api.resetPassword(user.userId, password)
    );
    if (ok) {
      setDone(password);
      setPassword('');
    }
  };

  if (done) {
    const details = loginDetails(mx.getDomain() ?? '', user.userId, done);
    return (
      <Box direction="Column" gap="200">
        <Text size="T200" priority="300">
          New password set; they were signed out everywhere. Send them:
        </Text>
        <Text
          as="pre"
          size="T300"
          style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
        >
          {details}
        </Text>
        <Box>
          <Chip
            variant="Secondary"
            radii="Pill"
            onClick={() => {
              copyToClipboard(details);
              toast('Login details copied');
            }}
          >
            <Text size="T200">Copy login details</Text>
          </Chip>
        </Box>
      </Box>
    );
  }

  return (
    <Box as="form" onSubmit={handleSubmit} gap="200" alignItems="Center" wrap="Wrap">
      <Box grow="Yes" direction="Column" style={{ minWidth: 180 }}>
        <PasswordInput
          name="newPasswordInput"
          aria-label="New password"
          placeholder="New password"
          autoComplete="new-password"
          size="400"
          variant="Background"
          radii="300"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(evt) => setPassword(evt.currentTarget.value)}
        />
      </Box>
      <Button
        type="button"
        size="300"
        variant="Secondary"
        fill="Soft"
        radii="300"
        onClick={() => setPassword(generatePassword())}
      >
        <Text size="B300">Generate</Text>
      </Button>
      <Button type="submit" size="300" variant="Primary" fill="Solid" radii="300">
        <Text size="B300">Set password</Text>
      </Button>
    </Box>
  );
}

function UserActions({ user, act }: { user: ManagedUser; act: Action }) {
  const api = useAdminApi();
  const [resetting, setResetting] = useState(false);

  return (
    <Box
      direction="Column"
      gap="200"
      style={{
        paddingTop: config.space.S200,
        borderTop: `1px solid ${color.SurfaceVariant.ContainerLine}`,
      }}
    >
      <Box gap="200" wrap="Wrap">
        <Chip variant="Secondary" radii="Pill" onClick={() => setResetting((r) => !r)}>
          <Text size="T200">Reset password</Text>
        </Chip>
        <Chip
          variant={user.locked ? 'Success' : 'Critical'}
          radii="Pill"
          onClick={() =>
            act(`${user.locked ? 'Unlocked' : 'Locked'} ${user.userId}`, () =>
              api.setLocked(user.userId, !user.locked)
            )
          }
        >
          <Text size="T200">{user.locked ? 'Unlock' : 'Lock'}</Text>
        </Chip>
        {user.canChangeRole && (
          <Chip
            variant="Warning"
            radii="Pill"
            onClick={() =>
              act(
                user.role === 'admin'
                  ? `${user.userId} is now a regular user`
                  : `${user.userId} is now an admin`,
                () => api.setAdmin(user.userId, user.role !== 'admin')
              )
            }
          >
            <Text size="T200">{user.role === 'admin' ? 'Remove admin' : 'Make admin'}</Text>
          </Chip>
        )}
      </Box>
      {resetting && <ResetPassword user={user} act={act} />}
    </Box>
  );
}

function UserRow({ user, act }: { user: ManagedUser; act: Action }) {
  const [open, setOpen] = useState(false);
  const name = user.displayName || user.userId;

  return (
    <Box
      direction="Column"
      gap="200"
      style={{
        padding: config.space.S300,
        borderRadius: config.radii.R400,
        background: color.SurfaceVariant.Container,
        opacity: user.deactivated ? 0.6 : undefined,
      }}
    >
      <Box alignItems="Center" gap="200">
        <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
          <Text size="T300" truncate>
            <b>{name}</b>
          </Text>
          <Text size="T200" priority="300" truncate>
            {user.userId}
          </Text>
        </Box>
        <Box shrink="No" gap="100" alignItems="Center" wrap="Wrap" justifyContent="End">
          {user.deactivated && (
            <Badge variant="Secondary" fill="Soft" radii="Pill">
              <Text size="L400">Deactivated</Text>
            </Badge>
          )}
          {user.locked && (
            <Badge variant="Critical" fill="Soft" radii="Pill">
              <Text size="L400">Locked</Text>
            </Badge>
          )}
          <Badge variant={ROLE_BADGE[user.role]} fill="Soft" radii="Pill">
            <Text size="L400">{ROLE_LABELS[user.role]}</Text>
          </Badge>
          {user.canEdit ? (
            <Button
              type="button"
              size="300"
              variant="Secondary"
              fill="Soft"
              radii="300"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
            >
              <Text size="B300">{open ? 'Close' : 'Edit'}</Text>
            </Button>
          ) : (
            <Text size="T200" priority="300" style={{ minWidth: 62, textAlign: 'center' }}>
              View only
            </Text>
          )}
        </Box>
      </Box>
      {open && user.canEdit && <UserActions user={user} act={act} />}
    </Box>
  );
}

type UsersListProps = {
  // Bumped after an account is created, so the list reloads.
  reloadKey: number;
};
export function UsersList({ reloadKey }: UsersListProps) {
  const api = useAdminApi();
  const toast = useToast();
  const [users, setUsers] = useState<ManagedUser[]>();
  const [loadError, setLoadError] = useState<string>();
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    try {
      setUsers(await api.listUsers());
      setLoadError(undefined);
    } catch (e) {
      setLoadError(adminErrorMessage(e));
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  // Runs one change, reports it in a toast and reloads the list so roles and flags are current.
  const act: Action = useCallback(
    async (label, run) => {
      try {
        await run();
        toast(label);
        return true;
      } catch (e) {
        toast(adminErrorMessage(e), 'Critical');
        return false;
      } finally {
        await load();
      }
    },
    [toast, load]
  );

  const shown = users?.filter((user) => matchesUserFilter(user, filter)) ?? [];

  return (
    <SettingTile
      title={
        <Text as="span" size="L400">
          Users{users ? ` (${users.length})` : ''}
        </Text>
      }
      description="Admins can edit regular users. Only superadmins can edit admins; superadmins are managed on the server (superadmin.sh)."
    >
      <Box direction="Column" gap="200">
        <Input
          size="400"
          variant="Background"
          radii="300"
          placeholder="Search by name, ID or role"
          aria-label="Search users"
          value={filter}
          onChange={(evt) => setFilter(evt.currentTarget.value)}
        />
        {loadError && (
          <Text size="T200" style={{ color: color.Critical.Main }}>
            {loadError}
          </Text>
        )}
        {!users && !loadError && (
          <Box justifyContent="Center" style={{ padding: config.space.S400 }}>
            <Spinner variant="Secondary" />
          </Box>
        )}
        {users && shown.length === 0 && (
          <Text size="T300" priority="300">
            No users match.
          </Text>
        )}
        {shown.map((user) => (
          <UserRow key={user.userId} user={user} act={act} />
        ))}
      </Box>
    </SettingTile>
  );
}
