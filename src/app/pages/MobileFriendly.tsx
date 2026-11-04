/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { ReactNode } from 'react';
import { useMatch } from 'react-router-dom';
import { ScreenSize, useScreenSizeContext } from '../hooks/useScreenSize';
import { DIRECT_PATH, EXPLORE_PATH, HOME_PATH, INBOX_PATH, SPACE_PATH } from './paths';

type MobileFriendlyClientNavProps = {
  children: ReactNode;
};
export function MobileFriendlyClientNav({ children }: MobileFriendlyClientNavProps) {
  const screenSize = useScreenSizeContext();
  const homeMatch = useMatch({ path: HOME_PATH, caseSensitive: true, end: true });
  const directMatch = useMatch({ path: DIRECT_PATH, caseSensitive: true, end: true });
  const spaceMatch = useMatch({ path: SPACE_PATH, caseSensitive: true, end: true });
  const exploreMatch = useMatch({ path: EXPLORE_PATH, caseSensitive: true, end: true });
  const inboxMatch = useMatch({ path: INBOX_PATH, caseSensitive: true, end: true });

  if (
    screenSize === ScreenSize.Mobile &&
    !(homeMatch || directMatch || spaceMatch || exploreMatch || inboxMatch)
  ) {
    return null;
  }

  return children;
}

type MobileFriendlyPageNavProps = {
  path: string;
  children: ReactNode;
};
export function MobileFriendlyPageNav({ path, children }: MobileFriendlyPageNavProps) {
  const screenSize = useScreenSizeContext();
  const exactPath = useMatch({
    path,
    caseSensitive: true,
    end: true,
  });

  if (screenSize === ScreenSize.Mobile && !exactPath) {
    return null;
  }

  return children;
}
