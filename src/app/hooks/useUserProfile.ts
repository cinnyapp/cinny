import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProfile, GetProfileOK } from 'neurone/lib/api/matrix/client/v3/profile';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { ObjectReader } from 'neurone/lib/utils';
import { useClient } from './useClient';

type PronounResponse = {
  grammatical_gender?: string;
  language?: string;
  summary?: string;
};

export type UserPronoun = {
  grammaticalGender?: string;
  language?: string;
  summary?: string;
};

export type UserProfile = {
  avatarUrl?: string;
  displayName?: string;
  bannerUrl?: string;
  timezone?: string;
  pronouns?: UserPronoun[];
};
export const useUserProfile = (userId: string): UserProfile | undefined => {
  const ct = useClient();

  const fetchProfile = useCallback(async (): Promise<UserProfile> => {
    const response = await ct.requestAuthJSON(
      getProfile({
        pathParams: { userId },
      })
    );

    const [, profile] = await parseMatrixResp<
      GetProfileOK & {
        'chat.commet.profile_banner'?: string;
        'm.banner_url'?: string;
        'm.tz'?: string;
        'io.fsky.nyx.pronouns': PronounResponse[];
        'm.pronouns': PronounResponse[];
      }
    >(response);

    const pronouns = profile?.['m.pronouns'] ?? profile?.['io.fsky.nyx.pronouns'];

    return {
      avatarUrl: profile?.avatar_url || undefined,
      displayName: profile?.displayname || undefined,
      bannerUrl:
        ObjectReader.string(profile, 'm.banner_url') ??
        ObjectReader.string(profile, 'chat.commet.profile_banner'),
      timezone: ObjectReader.string(profile, 'm.tz'),
      pronouns: pronouns?.map((p) => ({
        grammaticalGender: ObjectReader.string(p, 'grammatical_gender'),
        language: ObjectReader.string(p, 'language'),
        summary: ObjectReader.string(p, 'summary'),
      })),
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
