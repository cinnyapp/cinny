import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import {
  Route,
  RouterProvider,
  createBrowserRouter,
  createHashRouter,
  createRoutesFromElements,
  redirect,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { ClientConfigLoader } from '../components/ClientConfigLoader';
import { ClientConfig, ClientConfigProvider } from '../hooks/useClientConfig';
import { AuthLayout, Login, Register, ResetPassword, authLayoutLoader } from './auth';
import {
  DIRECT_PATH,
  EXPLORE_PATH,
  HOME_PATH,
  LOGIN_PATH,
  INBOX_PATH,
  REGISTER_PATH,
  RESET_PASSWORD_PATH,
  ROOT_PATH,
  SPACE_PATH,
  _CREATE_PATH,
  _FEATURED_PATH,
  _INVITES_PATH,
  _JOIN_PATH,
  _LOBBY_PATH,
  _NOTIFICATIONS_PATH,
  _ROOM_PATH,
  _SEARCH_PATH,
  _SERVER_PATH,
} from './paths';
import { isAuthenticated } from '../../client/state/auth';
import {
  getAbsolutePathFromHref,
  getHomePath,
  getLoginPath,
  getOriginBaseUrl,
  getSpaceLobbyPath,
} from './pathUtils';
import { ConfigConfigError, ConfigConfigLoading } from './ConfigConfig';
import { FeatureCheck } from './FeatureCheck';
import { ClientLayout, ClientRoot } from './client';
import { Home, HomeRouteRoomProvider, HomeSearch } from './client/home';
import { Direct, DirectRouteRoomProvider } from './client/direct';
import { RouteSpaceProvider, Space, SpaceRouteRoomProvider, SpaceSearch } from './client/space';
import { Explore, FeaturedRooms, PublicRooms } from './client/explore';
import { Notifications, Inbox, Invites } from './client/inbox';
import { setAfterLoginRedirectPath } from './afterLoginRedirectPath';
import { Room } from '../features/room';
import { Lobby } from '../features/lobby';
import { WelcomePage } from './client/WelcomePage';

const queryClient = new QueryClient();

const createRouter = (clientConfig: ClientConfig) => {
  const { hashRouter } = clientConfig;

  const routes = createRoutesFromElements(
    <Route>
      <Route
        path={ROOT_PATH}
        loader={() => {
          if (isAuthenticated()) return redirect(getHomePath());

          const afterLoginPath = getAbsolutePathFromHref(getOriginBaseUrl(), window.location.href);
          if (afterLoginPath) setAfterLoginRedirectPath(afterLoginPath);
          return redirect(getLoginPath());
        }}
      />
      <Route loader={authLayoutLoader} element={<AuthLayout />}>
        <Route path={LOGIN_PATH} element={<Login />} />
        <Route path={REGISTER_PATH} element={<Register />} />
        <Route path={RESET_PASSWORD_PATH} element={<ResetPassword />} />
      </Route>

      <Route
        loader={() => {
          if (!isAuthenticated()) {
            const afterLoginPath = getAbsolutePathFromHref(
              getOriginBaseUrl(),
              window.location.href
            );
            if (afterLoginPath) setAfterLoginRedirectPath(afterLoginPath);
            return redirect(getLoginPath());
          }
          return null;
        }}
        element={<ClientRoot />}
      >
        <Route element={<ClientLayout />}>
          <Route path={HOME_PATH} element={<Home />}>
            <Route index element={<WelcomePage />} />
            <Route path={_CREATE_PATH} element={<p>create</p>} />
            <Route path={_JOIN_PATH} element={<p>join</p>} />
            <Route path={_SEARCH_PATH} element={<HomeSearch />} />
            <Route
              path={_ROOM_PATH}
              element={
                <HomeRouteRoomProvider>
                  <Room />
                </HomeRouteRoomProvider>
              }
            />
          </Route>
          <Route path={DIRECT_PATH} element={<Direct />}>
            <Route index element={<WelcomePage />} />
            <Route path={_CREATE_PATH} element={<p>create</p>} />
            <Route
              path={_ROOM_PATH}
              element={
                <DirectRouteRoomProvider>
                  <Room />
                </DirectRouteRoomProvider>
              }
            />
          </Route>
          <Route path={SPACE_PATH} element={<RouteSpaceProvider />}>
            <Route element={<Space />}>
              <Route
                index
                loader={({ params }) => {
                  const { spaceIdOrAlias } = params;
                  if (spaceIdOrAlias) {
                    return redirect(getSpaceLobbyPath(spaceIdOrAlias));
                  }
                  return null;
                }}
                element={<WelcomePage />}
              />
              <Route path={_LOBBY_PATH} element={<Lobby />} />
              <Route path={_SEARCH_PATH} element={<SpaceSearch />} />
              <Route
                path={_ROOM_PATH}
                element={
                  <SpaceRouteRoomProvider>
                    <Room />
                  </SpaceRouteRoomProvider>
                }
              />
            </Route>
          </Route>
          <Route path={EXPLORE_PATH} element={<Explore />}>
            <Route index element={<WelcomePage />} />
            <Route path={_FEATURED_PATH} element={<FeaturedRooms />} />
            <Route path={_SERVER_PATH} element={<PublicRooms />} />
          </Route>
          <Route path={INBOX_PATH} element={<Inbox />}>
            <Route index element={<WelcomePage />} />
            <Route path={_NOTIFICATIONS_PATH} element={<Notifications />} />
            <Route path={_INVITES_PATH} element={<Invites />} />
          </Route>
        </Route>
      </Route>
      <Route path="/*" element={<p>Page not found</p>} />
    </Route>
  );

  if (hashRouter?.enabled) {
    return createHashRouter(routes, { basename: hashRouter.basename });
  }
  return createBrowserRouter(routes, {
    basename: import.meta.env.BASE_URL,
  });
};

// TODO: app crash boundary
function App() {
  return (
    <FeatureCheck>
      <ClientConfigLoader
        fallback={() => <ConfigConfigLoading />}
        error={(err, retry, ignore) => (
          <ConfigConfigError error={err} retry={retry} ignore={ignore} />
        )}
      >
        {(clientConfig) => (
          <ClientConfigProvider value={clientConfig}>
            <QueryClientProvider client={queryClient}>
              <JotaiProvider>
                <RouterProvider router={createRouter(clientConfig)} />
              </JotaiProvider>
              <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
          </ClientConfigProvider>
        )}
      </ClientConfigLoader>
    </FeatureCheck>
  );
}

export default App;
