import React, { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  Header,
  Icon,
  IconButton,
  IconSrc,
  Icons,
  Input,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  color,
  config,
} from 'folds';
import { useFocusWithin, useHover } from 'react-aria';
import {
  NavButton,
  NavCategory,
  NavCategoryHeader,
  NavItem,
  NavItemContent,
  NavItemOptions,
  NavLink,
} from '../../../components/nav';
import { getExploreFeaturedPath, getExploreServerPath } from '../../pathUtils';
import {
  useExploreFeaturedSelected,
  useExploreServer,
} from '../../../hooks/router/useExploreSelected';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getMxIdServer } from '../../../utils/matrix';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';
import { stopPropagation } from '../../../utils/keyboard';
import { useExploreServers } from '../../../hooks/useExploreServers';
import { useAlive } from '../../../hooks/useAlive';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { UseStateProvider } from '../../../components/UseStateProvider';

type AddExploreServerPromptProps = {
  onSubmit: (server: string, save: boolean) => Promise<void>;
  open: boolean;
  requestClose: () => void;
};
export function AddExploreServerPrompt({
  onSubmit,
  open,
  requestClose,
}: AddExploreServerPromptProps) {
  const alive = useAlive();
  const serverInputRef = useRef<HTMLInputElement>(null);

  const getInputServer = (): string | undefined => {
    const serverInput = serverInputRef.current;
    if (!serverInput) return undefined;
    const server = serverInput.value.trim();
    return server || undefined;
  };

  const submit = useCallback(
    async (save: boolean) => {
      const server = getInputServer();
      if (!server) return;

      await onSubmit(server, save);
      if (alive()) {
        requestClose();
      }
    },
    [onSubmit, alive, requestClose]
  );

  const [viewState, handleView] = useAsyncCallback(() => submit(false));
  const [saveViewState, handleSaveView] = useAsyncCallback(() => submit(true));
  const busy =
    viewState.status === AsyncStatus.Loading || saveViewState.status === AsyncStatus.Loading;

  return (
    <Overlay open={open} backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            clickOutsideDeactivates: true,
            onDeactivate: requestClose,
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
                <Text size="H4">Add Server</Text>
              </Box>
              <IconButton size="300" onClick={requestClose} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              <Text priority="400">Add server name to explore public communities.</Text>
              <Box direction="Column" gap="100">
                <Text size="L400">Server Name</Text>
                <Input ref={serverInputRef} name="serverInput" variant="Background" required />
                {viewState.status === AsyncStatus.Error && (
                  <Text style={{ color: color.Critical.Main }} size="T300">
                    Failed to load public rooms. Please try again.
                  </Text>
                )}
              </Box>
              <Box direction="Column" gap="200">
                <Button
                  type="submit"
                  onClick={handleView}
                  variant="Primary"
                  fill="Soft"
                  before={
                    viewState.status === AsyncStatus.Loading && (
                      <Spinner fill="Soft" variant="Secondary" size="200" />
                    )
                  }
                  disabled={busy}
                >
                  <Text size="B400">View</Text>
                </Button>
                <Button
                  type="submit"
                  onClick={handleSaveView}
                  variant="Primary"
                  fill="Solid"
                  before={
                    saveViewState.status === AsyncStatus.Loading && (
                      <Spinner fill="Solid" variant="Secondary" size="200" />
                    )
                  }
                  disabled={busy}
                >
                  <Text size="B400">Save & View</Text>
                </Button>
              </Box>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

type ExploreServerNavItemProps = {
  server: string;
  selected: boolean;
  icon: IconSrc;
  after?: (hover: boolean) => ReactNode;
};
export function ExploreServerNavItem({ server, selected, icon, after }: ExploreServerNavItemProps) {
  const [hover, setHover] = useState(false);
  const { hoverProps } = useHover({ onHoverChange: setHover });
  const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });

  return (
    <NavItem
      variant="Background"
      radii="400"
      aria-selected={selected}
      {...hoverProps}
      {...focusWithinProps}
    >
      <NavLink to={getExploreServerPath(server)}>
        <NavItemContent>
          <Box as="span" grow="Yes" alignItems="Center" gap="200">
            <Avatar size="200" radii="400">
              <Icon src={icon} size="100" filled={selected} />
            </Avatar>
            <Box as="span" grow="Yes">
              <Text as="span" size="Inherit" truncate>
                {server}
              </Text>
            </Box>
          </Box>
        </NavItemContent>
      </NavLink>
      {/* {action !== undefined && (hover || actionInProgress || action.alwaysVisible) && (
        <NavItemOptions>
          <IconButton
            onClick={actionCallback}
            variant="Background"
            fill="None"
            size="300"
            radii="300"
            disabled={actionInProgress}
          >
            {actionInProgress ? (
              <Spinner variant="Secondary" fill="Solid" size="200" />
            ) : (
              <Icon size="50" src={action.icon} />
            )}
          </IconButton>
        </NavItemOptions>
      )} */}
      {after && <NavItemOptions>{after(hover)}</NavItemOptions>}
    </NavItem>
  );
}

export function Explore() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  useNavToActivePathMapper('explore');
  const userId = mx.getUserId();
  const clientConfig = useClientConfig();
  const userServer = userId ? getMxIdServer(userId) : undefined;
  const featuredServers = useMemo(
    () =>
      clientConfig.featuredCommunities?.servers?.filter((server) => server !== userServer) ?? [],
    [clientConfig, userServer]
  );
  const [exploreServers, addServer, removeServer] = useExploreServers();

  const selectedServer = useExploreServer();
  const exploringFeaturedRooms = useExploreFeaturedSelected();
  const exploringUnlistedServer = useMemo(
    () =>
      !(
        selectedServer === undefined ||
        selectedServer === userServer ||
        featuredServers.includes(selectedServer) ||
        exploreServers.includes(selectedServer)
      ),
    [exploreServers, selectedServer, userServer, featuredServers]
  );

  const [addServerState, addServerCallback] = useAsyncCallback(
    useCallback(
      async (server: string, save: boolean) => {
        if (save && server !== userServer && !featuredServers.includes(server) && selectedServer) {
          await addServer(server);
        }
        navigate(getExploreServerPath(server));
      },
      [addServer, navigate, userServer, featuredServers, selectedServer]
    )
  );

  const [removeServerState, removeServerCallback] = useAsyncCallback(
    useCallback(
      async (server: string) => {
        await removeServer(server);
      },
      [removeServer]
    )
  );

  return (
    <PageNav>
      <PageNavHeader>
        <Box grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              Explore Community
            </Text>
          </Box>
        </Box>
      </PageNavHeader>

      <PageNavContent>
        <Box direction="Column" gap="300">
          <NavCategory>
            <NavItem variant="Background" radii="400" aria-selected={exploringFeaturedRooms}>
              <NavLink to={getExploreFeaturedPath()}>
                <NavItemContent>
                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                    <Avatar size="200" radii="400">
                      <Icon src={Icons.Bulb} size="100" filled={exploringFeaturedRooms} />
                    </Avatar>
                    <Box as="span" grow="Yes">
                      <Text as="span" size="Inherit" truncate>
                        Featured
                      </Text>
                    </Box>
                  </Box>
                </NavItemContent>
              </NavLink>
            </NavItem>
            {userServer && (
              <ExploreServerNavItem
                server={userServer}
                selected={userServer === selectedServer}
                icon={Icons.Server}
              />
            )}
          </NavCategory>
          <NavCategory>
            <NavCategoryHeader>
              <Text size="O400" style={{ paddingLeft: config.space.S200 }}>
                Servers
              </Text>
            </NavCategoryHeader>
            {featuredServers.map((server) => (
              <ExploreServerNavItem
                key={server}
                server={server}
                selected={server === selectedServer}
                icon={Icons.Server}
              />
            ))}
            {exploreServers
              .filter((server) => !featuredServers.includes(server))
              .map((server) => (
                <ExploreServerNavItem
                  key={server}
                  server={server}
                  selected={server === selectedServer}
                  icon={Icons.Server}
                  after={(hover) => {
                    const busy = removeServerState.status === AsyncStatus.Loading;

                    if (!(hover || busy)) {
                      return undefined;
                    }
 
                    return (
                      <IconButton
                        onClick={() => removeServerCallback(server)}
                        variant="Background"
                        fill="None"
                        size="300"
                        radii="300"
                        disabled={busy}
                      >
                        {busy ? (
                          <Spinner variant="Secondary" fill="Solid" size="200" />
                        ) : (
                          <Icon size="50" src={Icons.Minus} />
                        )}
                      </IconButton>
                    );
                  }}
                />
              ))}
            {exploringUnlistedServer && selectedServer !== undefined && (
              <ExploreServerNavItem
                server={selectedServer}
                selected
                icon={Icons.Server}
                after={() => {
                  const busy = addServerState.status === AsyncStatus.Loading;

                  return (
                    <IconButton
                      onClick={() => addServerCallback(selectedServer, true)}
                      variant="Background"
                      fill="None"
                      size="300"
                      radii="300"
                      disabled={busy}
                    >
                      {busy ? (
                        <Spinner variant="Secondary" fill="Solid" size="200" />
                      ) : (
                        <Icon size="50" src={Icons.Bookmark} />
                      )}
                    </IconButton>
                  );
                }}
              />
            )}
            <UseStateProvider initial={false}>
              {(dialogOpen, setDialogOpen) => (
                <>
                  <NavItem variant="Background">
                    <NavButton onClick={() => setDialogOpen(true)}>
                      <NavItemContent>
                        <Box as="span" grow="Yes" alignItems="Center" gap="200">
                          <Avatar size="200" radii="400">
                            <Icon src={Icons.Plus} size="100" />
                          </Avatar>
                          <Box as="span" grow="Yes">
                            <Text as="span" size="Inherit" truncate>
                              Add Server
                            </Text>
                          </Box>
                        </Box>
                      </NavItemContent>
                    </NavButton>
                  </NavItem>
                  <AddExploreServerPrompt
                    onSubmit={addServerCallback}
                    open={dialogOpen}
                    requestClose={() => setDialogOpen(false)}
                  />
                </>
              )}
            </UseStateProvider>
          </NavCategory>
        </Box>
      </PageNavContent>
    </PageNav>
  );
}
