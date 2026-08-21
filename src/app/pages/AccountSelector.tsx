import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Avatar, Badge, Box, Button, config, Icon, Icons, Text } from 'folds';
import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAtom, useAtomValue } from 'jotai';
import { AuthLayout, AuthLogo } from '../components/auth-layout';
import { SequenceCard } from '../components/sequence-card';
import { SettingTile } from '../components/setting-tile';
import {
  getAppPathFromHref,
  getHomePath,
  getLoginPath,
  getOriginBaseUrl,
  getRegisterPath,
} from './pathUtils';
import { getMxIdLocalPart, getMxIdServer } from '../utils/matrix';
import { UserAvatar } from '../components/user-avatar';
import { SessionContextProvider, useSessions } from '../hooks/useSessions';
import { useUnauthThemeManager } from './ThemeManager';
import { sessionUserIdAtom } from '../state/sessions';
import { useClientConfig } from '../hooks/useClientConfig';
import {
  deleteAfterLoginRedirectPath,
  getAfterLoginRedirectPath,
  setAfterLoginRedirectPath,
} from './afterLoginRedirectPath';
import { getLastActiveUserId, Session, setLastActiveUserId } from '../../client/sessions';
import { OrDivider } from '../components/OrDivider';
import { getAuthJSONRequest } from '../../client/request';
import { useUserProfileRequest } from '../hooks/useUserProfile';
import { mxcToHttp } from '../../client/mxcToHttp';
import { useSessionRequest } from '../hooks/sw/useSessionRequest';
import { useDocumentVisibilityChange } from '../hooks/useDocumentVisibilityChange';
import { useDocumentFocusChange } from '../hooks/useDocumentFocusChange';

function AccountCard({ session }: { session: Session }) {
  const { userId } = session;
  const navigate = useNavigate();
  const [sessionUserId, setSessionUserId] = useAtom(sessionUserIdAtom);
  const lastUserId = getLastActiveUserId();

  const request = useMemo(
    () => getAuthJSONRequest(session.baseUrl, session.accessToken),
    [session]
  );

  const profile = useUserProfileRequest(userId, request);

  const username = getMxIdLocalPart(userId) ?? userId;
  const server = getMxIdServer(userId) ?? userId;

  const displayName = profile?.displayName ?? username;
  const avatarUrl = profile?.avatarUrl
    ? mxcToHttp(session.baseUrl, profile.avatarUrl, true).thumbnail({
        width: 96,
        height: 96,
        method: 'crop',
      })
    : undefined;

  const handleClick = () => {
    if (sessionUserId !== userId) {
      setSessionUserId(userId);
    }
    const path = getAfterLoginRedirectPath();
    if (path) deleteAfterLoginRedirectPath();
    navigate(path ?? getHomePath());
  };

  return (
    <SequenceCard
      direction="Column"
      style={{ padding: `${config.space.S300} ${config.space.S400}` }}
      variant="SurfaceVariant"
      as="button"
      type="button"
      onClick={handleClick}
    >
      <SettingTile
        before={
          <Avatar size="300" radii="400">
            <UserAvatar
              userId={userId}
              src={avatarUrl}
              alt={userId}
              renderFallback={() => <Icon size="200" src={Icons.User} filled />}
            />
          </Avatar>
        }
      >
        <Box grow="Yes" direction="Column">
          <Box gap="200" justifyContent="SpaceBetween" alignItems="Center">
            <Text truncate>
              <b>{displayName}</b>
            </Text>
            {lastUserId === userId && (
              <Badge variant="Primary" fill="Soft" outlined radii="300">
                <Text as="span" size="L400">
                  Last used
                </Text>
              </Badge>
            )}
          </Box>
          <Box gap="200" justifyContent="SpaceBetween">
            <Text size="T200" truncate>
              {username}
            </Text>
            <Text size="L400" truncate>
              {server}
            </Text>
          </Box>
        </Box>
      </SettingTile>
    </SequenceCard>
  );
}

export function AccountSelector() {
  useUnauthThemeManager();
  const navigate = useNavigate();

  const sessions = useSessions();
  useSessionRequest(sessions[0]);

  if (sessions.length === 0) {
    return <Navigate to={getLoginPath()} replace />;
  }

  return (
    <AuthLayout>
      <Box style={{ position: 'relative' }} direction="Column" gap="500">
        <span data-spacing-node />
        <Box direction="Column" gap="400" alignItems="Center">
          <AuthLogo large />
          <Box direction="Column" gap="100" alignItems="Center">
            <Text size="H3" priority="400" align="Center">
              Welcome to Cinny
            </Text>
            <Text size="T300" priority="400" align="Center">
              Choose an account to continue.
            </Text>
          </Box>
        </Box>
        <span data-spacing-node />
        <Box direction="Column" gap="100">
          <Text size="L400" priority="400">
            Accounts
          </Text>
          {sessions.map((session) => (
            <AccountCard key={session.userId} session={session} />
          ))}
        </Box>
        <OrDivider />
        <Box direction="Column" gap="300">
          <Button
            type="button"
            variant="Primary"
            size="500"
            before={<Icon size="400" src={Icons.Plus} />}
            onClick={() => navigate(getLoginPath())}
          >
            <Text as="span" size="B500">
              Add Account
            </Text>
          </Button>
        </Box>
        <span data-spacing-node />
        <Text size="T300" align="Center">
          Do not have an account? <Link to={getRegisterPath()}>Register</Link>
        </Text>
      </Box>
    </AuthLayout>
  );
}

export function ClientAccountSelector() {
  const clientConfig = useClientConfig();

  const prevUserIdRef = useRef<string>();

  const userId = useAtomValue(sessionUserIdAtom);
  const prevUserId = prevUserIdRef.current;
  prevUserIdRef.current = userId;

  const sessions = useSessions();
  const session = useMemo(() => sessions.find((s) => userId === s.userId), [userId, sessions]);

  useSessionRequest(session ?? sessions[0]);

  const handleVisibility = useCallback(
    (visible: boolean) => {
      if (visible && userId) {
        setLastActiveUserId(userId);
      }
    },
    [userId]
  );

  useDocumentVisibilityChange(handleVisibility);
  useDocumentFocusChange(handleVisibility);

  useEffect(() => {
    if (userId) {
      setLastActiveUserId(userId);
    }
  }, [userId]);

  if (!session) {
    return <AccountSelector />;
  }

  if (sessions.length === 0) {
    const afterLoginPath = getAppPathFromHref(
      getOriginBaseUrl(clientConfig.hashRouter),
      window.location.href
    );
    if (afterLoginPath) setAfterLoginRedirectPath(afterLoginPath);

    return <Navigate to={getLoginPath()} replace />;
  }

  return (
    <SessionContextProvider key={session.userId} value={session}>
      <Outlet />
      {/* reset url from previous account */}
      {prevUserId && prevUserId !== userId && <Navigate to={getHomePath()} />}
    </SessionContextProvider>
  );
}
