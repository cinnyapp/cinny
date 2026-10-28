import { useEffect, useMemo, useState } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { createAdminApi } from './adminApi';

export const useAdminApi = () => {
  const mx = useMatrixClient();
  return useMemo(() => createAdminApi(() => mx.getAccessToken()), [mx]);
};

// False until the server confirms we're an admin (and on any error), so the admin UI stays
// hidden for everyone else.
export const useIsServerAdmin = (): boolean => {
  const api = useAdminApi();
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    let current = true;
    api
      .isAdmin()
      .then((value) => {
        if (current) setAdmin(value);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [api]);

  return admin;
};
