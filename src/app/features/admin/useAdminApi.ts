import { useEffect, useMemo, useState } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AdminRole, NO_ADMIN_ROLE, createAdminApi } from './adminApi';

export const useAdminApi = () => {
  const mx = useMatrixClient();
  return useMemo(() => createAdminApi(() => mx.getAccessToken()), [mx]);
};

// No role until the server confirms one (and on any error), so the admin UI stays hidden for
// everyone else.
export const useAdminRole = (): AdminRole => {
  const api = useAdminApi();
  const [role, setRole] = useState<AdminRole>(NO_ADMIN_ROLE);

  useEffect(() => {
    let current = true;
    api
      .role()
      .then((value) => {
        if (current) setRole(value);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [api]);

  return role;
};
