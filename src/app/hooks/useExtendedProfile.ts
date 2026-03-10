import { useCallback } from 'react';
import z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Capabilities } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';
import { useSpecVersions } from './useSpecVersions';
import { IProfileFieldsCapability } from '../../types/matrix/common';

const extendedProfile = z.looseObject({
  displayname: z.string().optional(),
  avatar_url: z.string().optional(),
  'io.fsky.nyx.pronouns': z
    .object({
      language: z.string(),
      summary: z.string(),
    })
    .array()
    .optional()
    .catch(undefined),
  'us.cloke.msc4175.tz': z.string().optional().catch(undefined),
});

export type ExtendedProfile = z.infer<typeof extendedProfile>;

export function useExtendedProfileSupported(): boolean {
  const { versions, unstable_features: unstableFeatures } = useSpecVersions();

  return unstableFeatures?.['uk.tcpip.msc4133'] || versions.includes('v1.15');
}

/// Returns the user's MSC4133 extended profile, if our homeserver supports it.
/// This will return `undefined` while the request is in flight and `null` if the HS lacks support.
export function useExtendedProfile(
  userId: string
): [ExtendedProfile | undefined | null, () => Promise<void>] {
  const mx = useMatrixClient();
  const extendedProfileSupported = useExtendedProfileSupported();
  const { data, refetch } = useQuery({
    queryKey: ['extended-profile', userId],
    queryFn: useCallback(async () => {
      if (extendedProfileSupported) {
        return extendedProfile.parse(await mx.getExtendedProfile(userId));
      }
      return null;
    }, [mx, userId, extendedProfileSupported]),
    refetchOnMount: false,
  });

  return [
    data,
    async () => {
      await refetch();
    },
  ];
}

const LEGACY_FIELDS = ['displayname', 'avatar_url'];

/// Returns whether the given profile field may be edited by the user.
export function profileEditsAllowed(
  field: string,
  capabilities: Capabilities,
  extendedProfileSupported: boolean
): boolean {
  if (LEGACY_FIELDS.includes(field)) {
    // this field might have a pre-msc4133 capability. check that first
    if (capabilities[`m.set_${field}`]?.enabled === false) {
      return false;
    }

    if (!extendedProfileSupported) {
      // the homeserver only supports legacy fields
      return true;
    }
  }

  if (extendedProfileSupported) {
    // the homeserver has msc4133 support
    const extendedProfileCapability = capabilities[
      'uk.tcpip.msc4133.profile_fields'
    ] as IProfileFieldsCapability;

    if (extendedProfileCapability === undefined) {
      // the capability is missing, assume modification is allowed
      return true;
    }

    if (!extendedProfileCapability.enabled) {
      // the capability is set to disable profile modifications
      return false;
    }

    if (
      extendedProfileCapability.allowed !== undefined &&
      !extendedProfileCapability.allowed.includes(field)
    ) {
      // the capability includes an allowlist and `field` isn't in it
      return false;
    }

    if (extendedProfileCapability.disallowed?.includes(field)) {
      // the capability includes an blocklist and `field` is in it
      return false;
    }

    // the capability is enabled and `field` isn't blocked
    return true;
  }

  // `field` is an extended profile key and the homeserver lacks msc4133 support
  return false;
}
