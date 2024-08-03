import React from 'react';
import {
  Outlet,
  Route,
  createBrowserRouter,
  createHashRouter,
  createRoutesFromElements,
  redirect,
} from 'react-router-dom';

import { ClientConfig } from '../hooks/useClientConfig';
import { AuthLayout, Login, Register, ResetPassword } from './auth';
import {
  DIRECT_PATH,
  EXPLORE_PATH,
  HOME_PATH,
  LOGIN_PATH,
  INBOX_PATH,
  REGISTER_PATH,
  RESET_PASSWORD_PATH,
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
  getAppPathFromHref,
  getExploreFeaturedPath,
  getHomePath,
  getInboxNotificationsPath,
  getLoginPath,
  getOriginBaseUrl,
  getSpaceLobbyPath,
} from './pathUtils';
import { ClientBindAtoms, ClientLayout, ClientRoot } from './client';
import { Home, HomeRouteRoomProvider, HomeSearch } from './client/home';
import { Direct, DirectCreate, DirectRouteRoomProvider } from './client/direct';
import { RouteSpaceProvider, Space, SpaceRouteRoomProvider, SpaceSearch } from './client/space';
import { Explore, FeaturedRooms, PublicRooms } from './client/explore';
import { Notifications, Inbox, Invites } from './client/inbox';
import { setAfterLoginRedirectPath } from './afterLoginRedirectPath';
import { Room } from '../features/room';
import { Lobby } from '../features/lobby';
import { WelcomePage } from './client/WelcomePage';
import { SidebarNav } from './client/SidebarNav';
import { PageRoot } from '../components/page';
import { ScreenSize } from '../hooks/useScreenSize';
import { MobileFriendlyPageNav, MobileFriendlyClientNav } from './MobileFriendly';
import { ClientInitStorageAtom } from './client/ClientInitStorageAtom';
import { ClientNonUIFeatures } from './client/ClientNonUIFeatures';

export const createRouter = (clientConfig: ClientConfig, screenSize: ScreenSize) => {
  const { hashRouter } = clientConfig;
  const mobile = screenSize === ScreenSize.Mobile;

  const routes = createRoutesFromElements(
    <Route>
      <Route
        index
        loader={() => {
          if (isAuthenticated()) return redirect(getHomePath());
          const afterLoginPath = getAppPathFromHref(getOriginBaseUrl(), window.location.href);
          if (afterLoginPath) setAfterLoginRedirectPath(afterLoginPath);
          return redirect(getLoginPath());
        }}
      />
      <Route
        loader={() => {
          if (isAuthenticated()) {
            return redirect(getHomePath());
          }

          return null;
        }}
        element={<AuthLayout />}
      >
        <Route path={LOGIN_PATH} element={<Login />} />
        <Route path={REGISTER_PATH} element={<Register />} />
        <Route path={RESET_PASSWORD_PATH} element={<ResetPassword />} />
      </Route>

      <Route
        loader={() => {
          if (!isAuthenticated()) {
            const afterLoginPath = getAppPathFromHref(
              getOriginBaseUrl(hashRouter),
              window.location.href
            );
            if (afterLoginPath) setAfterLoginRedirectPath(afterLoginPath);
            return redirect(getLoginPath());
          }
          return null;
        }}
        element={
          <ClientRoot>
            <ClientInitStorageAtom>
              <ClientBindAtoms>
                <ClientNonUIFeatures>
                  <ClientLayout
                    nav={
                      <MobileFriendlyClientNav>
                        <SidebarNav />
                      </MobileFriendlyClientNav>
                    }
                  >
                    <Outlet />
                  </ClientLayout>
                </ClientNonUIFeatures>
              </ClientBindAtoms>
            </ClientInitStorageAtom>
          </ClientRoot>
        }
      >
        <Route
          path={HOME_PATH}
          element={
            <PageRoot
              nav={
                <MobileFriendlyPageNav path={HOME_PATH}>
                  <Home />
                </MobileFriendlyPageNav>
              }
            >
              <Outlet />
            </PageRoot>
          }
        >
          {mobile ? null : <Route index element={<WelcomePage />} />}
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
        <Route
          path={DIRECT_PATH}
          element={
            <PageRoot
              nav={
                <MobileFriendlyPageNav path={DIRECT_PATH}>
                  <Direct />
                </MobileFriendlyPageNav>
              }
            >
              <Outlet />
            </PageRoot>
          }
        >
          {mobile ? null : <Route index element={<WelcomePage />} />}
          <Route path={_CREATE_PATH} element={<DirectCreate />} />
          <Route
            path={_ROOM_PATH}
            element={
              <DirectRouteRoomProvider>
                <Room />
              </DirectRouteRoomProvider>
            }
          />
        </Route>
        <Route
          path={SPACE_PATH}
          element={
            <RouteSpaceProvider>
              <PageRoot
                nav={
                  <MobileFriendlyPageNav path={SPACE_PATH}>
                    <Space />
                  </MobileFriendlyPageNav>
                }
              >
                <Outlet />
              </PageRoot>
            </RouteSpaceProvider>
          }
        >
          {mobile ? null : (
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
          )}
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
        <Route
          path={EXPLORE_PATH}
          element={
            <PageRoot
              nav={
                <MobileFriendlyPageNav path={EXPLORE_PATH}>
                  <Explore />
                </MobileFriendlyPageNav>
              }
            >
              <Outlet />
            </PageRoot>
          }
        >
          {mobile ? null : (
            <Route
              index
              loader={() => redirect(getExploreFeaturedPath())}
              element={<WelcomePage />}
            />
          )}
          <Route path={_FEATURED_PATH} element={<FeaturedRooms />} />
          <Route path={_SERVER_PATH} element={<PublicRooms />} />
        </Route>
        <Route
          path={INBOX_PATH}
          element={
            <PageRoot
              nav={
                <MobileFriendlyPageNav path={INBOX_PATH}>
                  <Inbox />
                </MobileFriendlyPageNav>
              }
            >
              <Outlet />
            </PageRoot>
          }
        >
          {mobile ? null : (
            <Route
              index
              loader={() => redirect(getInboxNotificationsPath())}
              element={<WelcomePage />}
            />
          )}
          <Route path={_NOTIFICATIONS_PATH} element={<Notifications />} />
          <Route path={_INVITES_PATH} element={<Invites />} />
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
