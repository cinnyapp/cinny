import { ReactNode, useCallback } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import {
  getDirectPath,
  getExplorePath,
  getHomePath,
  getInboxPath,
  getSpacePath,
} from '../pages/pathUtils';
import { DIRECT_PATH, EXPLORE_PATH, HOME_PATH, INBOX_PATH, SPACE_PATH } from '../pages/paths';

type BackRouteHandlerProps = {
  children: (onBack: () => void) => ReactNode;
};
export function BackRouteHandler({ children }: BackRouteHandlerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = useCallback(() => {
    if (
      matchPath(
        {
          path: HOME_PATH,
          caseSensitive: true,
          end: false,
        },
        location.pathname
      )
    ) {
      navigate(getHomePath());
      return;
    }
    if (
      matchPath(
        {
          path: DIRECT_PATH,
          caseSensitive: true,
          end: false,
        },
        location.pathname
      )
    ) {
      navigate(getDirectPath());
      return;
    }
    const spaceMatch = matchPath(
      {
        path: SPACE_PATH,
        caseSensitive: true,
        end: false,
      },
      location.pathname
    );
    if (spaceMatch?.params.spaceIdOrAlias) {
      navigate(getSpacePath(spaceMatch.params.spaceIdOrAlias));
      return;
    }
    if (
      matchPath(
        {
          path: EXPLORE_PATH,
          caseSensitive: true,
          end: false,
        },
        location.pathname
      )
    ) {
      navigate(getExplorePath());
      return;
    }
    if (
      matchPath(
        {
          path: INBOX_PATH,
          caseSensitive: true,
          end: false,
        },
        location.pathname
      )
    ) {
      navigate(getInboxPath());
    }
  }, [navigate, location]);

  return children(goBack);
}
