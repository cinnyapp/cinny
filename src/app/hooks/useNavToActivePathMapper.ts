/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { useLocation } from 'react-router-dom';
import { useNavToActivePathAtom } from '../state/hooks/navToActivePath';

export const useNavToActivePathMapper = (navId: string) => {
  const location = useLocation();
  const setNavToActivePath = useSetAtom(useNavToActivePathAtom());

  useEffect(() => {
    const { pathname, search, hash } = location;
    setNavToActivePath({
      type: 'PUT',
      navId,
      path: { pathname, search, hash },
    });
  }, [location, setNavToActivePath, navId]);
};
