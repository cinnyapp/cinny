import React, { FormEventHandler, useCallback, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Icon,
  IconButton,
  Icons,
  Input,
  Scroll,
  Spinner,
  Switch,
  Text,
  color,
  config,
} from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { PasswordInput } from '../../../components/password-input';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAlive } from '../../../hooks/useAlive';
import { copyToClipboard } from '../../../utils/dom';
import { useToast } from '../../../components/toast';
import { useAdminApi } from '../../admin/useAdminApi';
import {
  MIN_PASSWORD_LENGTH,
  NewAccount,
  adminErrorMessage,
  generatePassword,
  loginDetails,
} from '../../admin/adminApi';

type Created = { userId: string; password: string };

function CreatedAccount({ created, homeserver }: { created: Created; homeserver: string }) {
  const toast = useToast();
  const details = loginDetails(homeserver, created.userId, created.password);

  const handleCopy = () => {
    copyToClipboard(details);
    toast('Login details copied');
  };

  return (
    <SettingTile
      title={
        <Text as="span" size="L400">
          Created {created.userId}
        </Text>
      }
      description="Send these to the new user. The password isn't shown again."
    >
      <Box direction="Column" gap="200">
        <Text
          as="pre"
          size="T300"
          style={{
            margin: 0,
            padding: config.space.S300,
            borderRadius: config.radii.R300,
            background: color.Background.Container,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {details}
        </Text>
        <Box>
          <Chip variant="Secondary" radii="Pill" onClick={handleCopy}>
            <Text size="T200">Copy login details</Text>
          </Chip>
        </Box>
      </Box>
    </SettingTile>
  );
}

function CreateAccount() {
  const mx = useMatrixClient();
  const api = useAdminApi();
  const alive = useAlive();
  const toast = useToast();
  const homeserver = mx.getDomain() ?? '';

  const [password, setPassword] = useState('');
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [created, setCreated] = useState<Created>();

  const [createState, create] = useAsyncCallback<string, unknown, [NewAccount]>(
    useCallback((account: NewAccount) => api.createAccount(account), [api])
  );
  const creating = createState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (creating) return;
    const form = evt.currentTarget;
    const usernameInput = form.elements.namedItem('usernameInput') as HTMLInputElement;
    const username = usernameInput.value.trim();
    if (!username || password.length < MIN_PASSWORD_LENGTH) return;

    // A failure is shown below the form from createState.
    create({ username, password, admin: makeAdmin })
      .then((userId) => {
        if (!alive()) return;
        setCreated({ userId, password });
        toast(`Created ${userId}`);
        usernameInput.value = '';
        setPassword('');
        setMakeAdmin(false);
      })
      .catch(() => undefined);
  };

  return (
    <>
      <SettingTile
        title={
          <Text as="span" size="L400">
            Create Account
          </Text>
        }
        description="Same as add-user.sh on the server. Share the login details with the person yourself."
      >
        <Box as="form" onSubmit={handleSubmit} direction="Column" gap="300">
          <Box direction="Column" gap="100">
            <Text size="L400">Username</Text>
            <Input
              name="usernameInput"
              size="400"
              variant="Secondary"
              radii="300"
              autoComplete="off"
              required
              readOnly={creating}
              placeholder="username"
              after={
                <Text size="T200" priority="300">
                  :{homeserver}
                </Text>
              }
            />
          </Box>
          <Box direction="Column" gap="100">
            <Text size="L400">Password</Text>
            <Box gap="200" alignItems="Center">
              <Box grow="Yes" direction="Column">
                <PasswordInput
                  name="passwordInput"
                  autoComplete="new-password"
                  size="400"
                  variant="Secondary"
                  radii="300"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  readOnly={creating}
                  value={password}
                  onChange={(evt) => setPassword(evt.currentTarget.value)}
                />
              </Box>
              <Button
                type="button"
                size="400"
                variant="Secondary"
                fill="Soft"
                outlined
                radii="300"
                disabled={creating}
                onClick={() => setPassword(generatePassword())}
              >
                <Text size="B400">Generate</Text>
              </Button>
            </Box>
            <Text size="T200" priority="300">
              At least {MIN_PASSWORD_LENGTH} characters. They can change it later in Settings →
              Account.
            </Text>
          </Box>
          <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
            <Box direction="Column">
              <Text size="T300">Server admin</Text>
              <Text size="T200" priority="300">
                Can create accounts and manage the server. Only for people you fully trust.
              </Text>
            </Box>
            <Switch variant="Critical" value={makeAdmin} onChange={setMakeAdmin} />
          </Box>
          {createState.status === AsyncStatus.Error && (
            <Text size="T200" style={{ color: color.Critical.Main }}>
              <b>{adminErrorMessage(createState.error)}</b>
            </Text>
          )}
          <Box>
            <Button
              type="submit"
              size="400"
              variant="Success"
              fill="Solid"
              radii="300"
              disabled={creating}
              before={creating ? <Spinner size="200" variant="Success" fill="Solid" /> : undefined}
            >
              <Text size="B400">Create Account</Text>
            </Button>
          </Box>
        </Box>
      </SettingTile>
      {created && <CreatedAccount created={created} homeserver={homeserver} />}
    </>
  );
}

type AdminProps = {
  requestClose: () => void;
};
export function Admin({ requestClose }: AdminProps) {
  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Admin
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="100">
              <Text size="L400">Accounts</Text>
              <SequenceCard
                className={SequenceCardStyle}
                variant="SurfaceVariant"
                direction="Column"
                gap="400"
              >
                <CreateAccount />
              </SequenceCard>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
