import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProfile, GetProfileOK } from 'neurone/lib/api/matrix/client/v3/profile';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { useClient } from './useClient';

export type UserProfile = {
  avatarUrl?: string;
  displayName?: string;
};
export const useUserProfile = (userId: string): UserProfile | undefined => {
  const ct = useClient();

  const fetchProfile = useCallback(async (): Promise<UserProfile> => {
    const response = await ct.requestAuthJSON(
      getProfile({
        pathParams: { userId },
      })
    );

    const [, profile] = await parseMatrixResp<GetProfileOK>(response);
    return {
      avatarUrl: profile?.avatar_url || undefined,
      displayName: profile?.displayname || undefined,
    };
  }, [ct, userId]);

  const { data } = useQuery({
    queryKey: ['profile', userId],
    queryFn: fetchProfile,
    staleTime: 0,
    gcTime: Infinity,
    refetchOnMount: 'always',
  });

  return data;
};
