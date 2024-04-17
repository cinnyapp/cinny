import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { useLocation } from 'react-router-dom';
import { navToActivePathAtom } from '../state/navToActivePath';

export const useNavToActivePathMapper = (navId: string) => {
  const location = useLocation();
  const setNavToActivePath = useSetAtom(navToActivePathAtom);

  useEffect(() => {
    const { pathname, search, hash } = location;
    setNavToActivePath({
      type: 'PUT',
      navId,
      path: { pathname, search, hash },
    });
  }, [location, setNavToActivePath, navId]);
};
