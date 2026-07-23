import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProfile, GetProfileOK } from 'neurone/lib/api/matrix/client/v3/profile';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { ObjectReader } from 'neurone/lib/utils';
import { useClient } from './useClient';

export type UserPronoun = {
  grammaticalGender?: string;
  language?: string;
  summary?: string;
};

export type UserBiography = {
  body: string;
  formattedBody?: string;
};

export type UserProfile = {
  avatarUrl?: string;
  displayName?: string;
  bannerUrl?: string;
  timezone?: string;
  pronouns?: UserPronoun[];
  biography?: UserBiography;
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
        'chat.commet.profile_banner'?: unknown;
        'm.banner_url'?: unknown;
        'm.tz'?: unknown;
        'io.fsky.nyx.pronouns': unknown;
        'm.pronouns': unknown;
        'm.biography': unknown;
        'gay.fomx.biography': unknown;
      }
    >(response);

    const pronouns = profile?.['m.pronouns'] ?? profile?.['io.fsky.nyx.pronouns'];
    const bio = profile?.['m.biography'] ?? profile?.['gay.fomx.biography'];
    const bioText = ObjectReader.array(bio, 'm.text');

    const plainBio = bioText?.find((i) => ObjectReader.string(i, 'mimetype') !== 'text/html');
    const htmlBio = bioText?.find((i) => ObjectReader.string(i, 'mimetype') === 'text/html');
    const bioBody = ObjectReader.string(plainBio, 'body') ?? ObjectReader.string(htmlBio, 'body');

    return {
      avatarUrl: profile?.avatar_url || undefined,
      displayName: profile?.displayname || undefined,
      bannerUrl:
        ObjectReader.string(profile, 'm.banner_url') ??
        ObjectReader.string(profile, 'chat.commet.profile_banner'),
      timezone: ObjectReader.string(profile, 'm.tz'),
      pronouns: Array.isArray(pronouns)
        ? pronouns?.map((p) => ({
            grammaticalGender: ObjectReader.string(p, 'grammatical_gender'),
            language: ObjectReader.string(p, 'language'),
            summary: ObjectReader.string(p, 'summary'),
          }))
        : undefined,
      biography: bioBody
        ? {
            body: bioBody,
            formattedBody: ObjectReader.string(htmlBio, 'body'),
          }
        : undefined,
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
