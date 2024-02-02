import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import {
  Outlet,
  Route,
  RouterProvider,
  createBrowserRouter,
  createHashRouter,
  createRoutesFromElements,
  redirect,
} from 'react-router-dom';

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
  _LOBBY_PATH,
  _ROOM_PATH,
  _SEARCH_PATH,
} from './paths';
import { isAuthenticated } from '../../client/state/auth';
import { getHomePath, getLoginPath } from './pathUtils';
import { ConfigConfigError, ConfigConfigLoading } from './ConfigConfig';
import { FeatureCheck } from './FeatureCheck';
import Client from '../templates/client/Client';
import { ClientLayout, ClientRoot } from './client';

const createRouter = (clientConfig: ClientConfig) => {
  const { hashRouter } = clientConfig;

  const routes = createRoutesFromElements(
    <Route>
      <Route
        path={ROOT_PATH}
        loader={() => {
          if (isAuthenticated()) return redirect(getHomePath());
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
          if (!isAuthenticated()) return redirect(getLoginPath());
          return null;
        }}
        element={<ClientLayout />}
      >
        <Route element={<ClientRoot />}>
          <Route path={HOME_PATH} element={<Outlet />}>
            <Route index element={<Client />} />
            <Route path={_SEARCH_PATH} element={<p>search</p>} />
            <Route path={_ROOM_PATH} element={<p>room</p>} />
          </Route>
          <Route path={DIRECT_PATH} element={<Outlet />}>
            <Route index element={<Client />} />
            <Route path={_CREATE_PATH} element={<p>create</p>} />
            <Route path={_ROOM_PATH} element={<p>room</p>} />
          </Route>
          <Route path={NOTIFICATIONS_PATH} element={<p>notifications</p>} />
          <Route path={SPACE_PATH} element={<Outlet />}>
            <Route index element={<Client />} />
            <Route path={_LOBBY_PATH} element={<p>lobby</p>} />
            <Route path={_SEARCH_PATH} element={<p>search</p>} />
            <Route path={_ROOM_PATH} element={<p>room</p>} />
          </Route>
          <Route path={EXPLORE_PATH} element={<p>explore</p>} />
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
            <JotaiProvider>
              <RouterProvider router={createRouter(clientConfig)} />
            </JotaiProvider>
          </ClientConfigProvider>
        )}
      </ClientConfigLoader>
    </FeatureCheck>
  );
}

export default App;
