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
  NOTIFICATIONS_PATH,
  REGISTER_PATH,
  RESET_PASSWORD_PATH,
  ROOT_PATH,
  SPACE_PATH,
  _CREATE_PATH,
  _FEATURED_PATH,
  _INVITES_PATH,
  _JOIN_PATH,
  _LOBBY_PATH,
  _MESSAGES_PATH,
  _ROOM_PATH,
  _SEARCH_PATH,
  _SERVER_PATH,
} from './paths';
import { isAuthenticated } from '../../client/state/auth';
import { getAbsolutePathFromHref, getHomePath, getLoginPath } from './pathUtils';
import { ConfigConfigError, ConfigConfigLoading } from './ConfigConfig';
import { FeatureCheck } from './FeatureCheck';
import { ClientLayout, ClientRoot } from './client';
import { Home } from './client/home';
import { RoomViewer } from '../organisms/room/Room';
import { Direct } from './client/direct';
import { SpaceViewer } from './client/space';
import { Explore, ExploreRedirect, FeaturedRooms, PublicRooms } from './client/explore';
import { Notifications } from './client/notifications';
import { setAfterLoginRedirectPath } from './afterLoginRedirectPath';

const queryClient = new QueryClient();

const createRouter = (clientConfig: ClientConfig) => {
  const { hashRouter } = clientConfig;

  const routes = createRoutesFromElements(
    <Route>
      <Route
        path={ROOT_PATH}
        loader={() => {
          if (isAuthenticated()) return redirect(getHomePath());

          const afterLoginPath = getAbsolutePathFromHref(window.location.href);
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
            const afterLoginPath = getAbsolutePathFromHref(window.location.href);
            if (afterLoginPath) setAfterLoginRedirectPath(afterLoginPath);
            return redirect(getLoginPath());
          }
          return null;
        }}
        element={<ClientRoot />}
      >
        <Route element={<ClientLayout />}>
          <Route path={HOME_PATH} element={<Home />}>
            <Route index element={<p>welcome</p>} />
            <Route path={_CREATE_PATH} element={<p>create</p>} />
            <Route path={_JOIN_PATH} element={<p>join</p>} />
            <Route path={_SEARCH_PATH} element={<p>search</p>} />
            <Route path={_ROOM_PATH} element={<RoomViewer />} />
          </Route>
          <Route path={DIRECT_PATH} element={<Direct />}>
            <Route index element={<p>welcome</p>} />
            <Route path={_CREATE_PATH} element={<p>create</p>} />
            <Route path={_ROOM_PATH} element={<RoomViewer />} />
          </Route>
          <Route path={NOTIFICATIONS_PATH} element={<Notifications />}>
            <Route index element={<p>welcome</p>} />
            <Route path={_MESSAGES_PATH} element={<p>messages</p>} />
            <Route path={_INVITES_PATH} element={<p>invites</p>} />
          </Route>
          <Route path={SPACE_PATH} element={<SpaceViewer />}>
            <Route index element={<p>welcome</p>} />
            <Route path={_LOBBY_PATH} element={<p>lobby</p>} />
            <Route path={_SEARCH_PATH} element={<p>search</p>} />
            <Route path={_ROOM_PATH} element={<RoomViewer />} />
          </Route>
          <Route path={EXPLORE_PATH} element={<Explore />}>
            <Route index element={<ExploreRedirect />} />
            <Route path={_FEATURED_PATH} element={<FeaturedRooms />} />
            <Route path={_SERVER_PATH} element={<PublicRooms />} />
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
