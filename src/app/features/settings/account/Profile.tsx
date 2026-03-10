import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Box, Text, Button, config, Spinner, Line } from 'folds';
import { UserEvent, ValidatedAuthMetadata } from 'matrix-js-sdk';
import { SequenceCard } from '../../../components/sequence-card';
import { SettingTile } from '../../../components/setting-tile';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getMxIdServer, mxcUrlToHttp } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { UserHero, UserHeroName } from '../../../components/user-profile/UserHero';
import {
  ExtendedProfile,
  profileEditsAllowed,
  useExtendedProfile,
} from '../../../hooks/useExtendedProfile';
import { ProfileFieldContext, ProfileFieldElementProps } from './fields/ProfileFieldContext';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { CutoutCard } from '../../../components/cutout-card';
import { ServerChip, ShareChip, TimezoneChip } from '../../../components/user-profile/UserChips';
import { SequenceCardStyle } from '../styles.css';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { useAuthMetadata } from '../../../hooks/useAuthMetadata';
import { useAccountManagementActions } from '../../../hooks/useAccountManagement';
import { withSearchParam } from '../../../pages/pathUtils';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { ProfileAvatar } from './fields/ProfileAvatar';
import { ProfileTextField } from './fields/ProfileTextField';
import { ProfilePronouns } from './fields/ProfilePronouns';
import { ProfileTimezone } from './fields/ProfileTimezone';

function IdentityProviderSettings({ authMetadata }: { authMetadata: ValidatedAuthMetadata }) {
  const accountManagementActions = useAccountManagementActions();

  const openProviderProfileSettings = useCallback(() => {
    const authUrl = authMetadata?.account_management_uri ?? authMetadata?.issuer;
    if (!authUrl) return;

    window.open(
      withSearchParam(authUrl, {
        action: accountManagementActions.profile,
      }),
      '_blank'
    );
  }, [authMetadata, accountManagementActions]);

  return (
    <CutoutCard style={{ padding: config.space.S200 }} variant="Surface">
      <SettingTile
        after={
          <Button
            size="300"
            variant="Secondary"
            fill="Soft"
            radii="300"
            outlined
            onClick={openProviderProfileSettings}
          >
            <Text size="B300">Open</Text>
          </Button>
        }
      >
        <Text size="T200">Change profile settings in your homeserver&apos;s account dashboard.</Text>
      </SettingTile>
    </CutoutCard>
  );
}

/// Context props which are passed to every field element.
/// Right now this is only a flag for if the profile is being saved.
export type FieldContext = { busy: boolean };

/// Field editor elements for the pre-MSC4133 profile fields. This should only
/// ever contain keys for `displayname` and `avatar_url`.
const LEGACY_FIELD_ELEMENTS = {
  avatar_url: ProfileAvatar,
  displayname: (props: ProfileFieldElementProps<'displayname', FieldContext>) => (
    <ProfileTextField label="Display Name" {...props} />
  ),
};

/// Field editor elements for MSC4133 extended profile fields.
/// These will appear in the UI in the order they are defined in this map.
const EXTENDED_FIELD_ELEMENTS = {
  'io.fsky.nyx.pronouns': ProfilePronouns,
  'us.cloke.msc4175.tz': ProfileTimezone,
};

export function Profile() {
  const mx = useMatrixClient();
  const userId = mx.getUserId() as string;
  const server = getMxIdServer(userId);
  const authMetadata = useAuthMetadata();
  const accountManagementActions = useAccountManagementActions();
  const useAuthentication = useMediaAuthentication();
  const capabilities = useCapabilities();

  const [extendedProfile, refreshExtendedProfile] = useExtendedProfile(userId);
  const extendedProfileSupported = extendedProfile !== null;
  const legacyProfile = useUserProfile(userId);

  // next-gen auth identity providers may provide profile settings if they want
  const profileEditableThroughIDP =
    authMetadata !== undefined &&
    authMetadata.account_management_actions_supported?.includes(accountManagementActions.profile);

  const [fieldElementConstructors, profileEditableThroughClient] = useMemo(() => {
    const entries = Object.entries({
      ...LEGACY_FIELD_ELEMENTS,
      // don't show the MSC4133 elements if the HS doesn't support them
      ...(extendedProfileSupported ? EXTENDED_FIELD_ELEMENTS : {}),
    }).filter(([key]) => 
      // don't show fields if the HS blocks them with capabilities
      profileEditsAllowed(key, capabilities, extendedProfileSupported)
    );
    return [Object.fromEntries(entries), entries.length > 0];
  }, [capabilities, extendedProfileSupported]);

  const [fieldDefaults, setFieldDefaults] = useState<ExtendedProfile>({
    displayname: legacyProfile.displayName,
    avatar_url: legacyProfile.avatarUrl,
  });

  // this updates the field defaults when the extended profile data is (re)loaded.
  // it has to be a layout effect to prevent flickering on saves.
  // if MSC4133 isn't supported by the HS this does nothing
  useLayoutEffect(() => {
    // `extendedProfile` includes the old dn/av fields, so
    // we don't have to add those here
    if (extendedProfile) {
      setFieldDefaults(extendedProfile);
    }
  }, [setFieldDefaults, extendedProfile]);

  const [saveState, handleSave] = useAsyncCallback(
    useCallback(
      async (fields: ExtendedProfile) => {
        if (extendedProfileSupported) {
          await Promise.all(
            Object.entries(fields).map(async ([key, value]) => {
              if (value === undefined) {
                await mx.deleteExtendedProfileProperty(key);
              } else {
                await mx.setExtendedProfileProperty(key, value);
              }
            })
          );
          
          // calling this will trigger the layout effect to update the defaults
          // once the profile request completes
          await refreshExtendedProfile();

          // synthesize a profile update for ourselves to update our name and avatar in the rest
          // of the UI. code copied from matrix-js-sdk
          const user = mx.getUser(userId);
          if (user) {
            user.displayName = fields.displayname;
            user.avatarUrl = fields.avatar_url;
            user.emit(UserEvent.DisplayName, user.events.presence, user);
            user.emit(UserEvent.AvatarUrl, user.events.presence, user);
          }
        } else {
          await mx.setDisplayName(fields.displayname ?? '');
          await mx.setAvatarUrl(fields.avatar_url ?? '');
          // layout effect does nothing because `extendedProfile` is undefined
          // so we have to update the defaults explicitly here
          setFieldDefaults(fields);
        }
      },
      [mx, userId, refreshExtendedProfile, extendedProfileSupported, setFieldDefaults]
    )
  );

  const saving = saveState.status === AsyncStatus.Loading;
  const loadingExtendedProfile = extendedProfile === undefined;
  const busy = saving || loadingExtendedProfile;

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Profile</Text>
      <SequenceCard
        variant="Surface"
        outlined
        direction="Column"
        style={{
          overflow: 'hidden',
        }}
      >
        <ProfileFieldContext
          fieldDefaults={fieldDefaults}
          fieldElements={fieldElementConstructors}
          context={{ busy }}
        >
          {(reset, hasChanges, fields, fieldElements) => {
            const heroAvatarUrl =
              (fields.avatar_url && mxcUrlToHttp(mx, fields.avatar_url, useAuthentication)) ??
              undefined;
            return (
              <>
                <UserHero userId={userId} avatarUrl={heroAvatarUrl} />
                <Box direction="Column" gap="400" style={{ padding: config.space.S400 }}>
                  <Box gap="400" alignItems="Start">
                    <UserHeroName
                      userId={userId}
                      displayName={fields.displayname as string}
                      extendedProfile={fields}
                    />
                  </Box>
                  <Box alignItems="Center" gap="200" wrap="Wrap">
                    {server && <ServerChip server={server} />}
                    <ShareChip userId={userId} />
                    {fields['us.cloke.msc4175.tz'] && (
                      <TimezoneChip timezone={fields['us.cloke.msc4175.tz']} />
                    )}
                  </Box>
                </Box>
                <Line />
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                  radii="0"
                >
                  {profileEditableThroughIDP && (
                    <IdentityProviderSettings authMetadata={authMetadata} />
                  )}
                  {profileEditableThroughClient && (
                    <>
                      <Box gap="300" direction="Column">
                        {fieldElements}
                      </Box>
                      <Box gap="300" alignItems="Center">
                        <Button
                          type="submit"
                          size="300"
                          variant={!busy && hasChanges ? 'Success' : 'Secondary'}
                          fill={!busy && hasChanges ? 'Solid' : 'Soft'}
                          outlined
                          radii="300"
                          disabled={!hasChanges || busy}
                          onClick={() => handleSave(fields)}
                        >
                          <Text size="B300">Save</Text>
                        </Button>
                        <Button
                          type="reset"
                          size="300"
                          variant="Secondary"
                          fill="Soft"
                          outlined
                          radii="300"
                          onClick={reset}
                          disabled={!hasChanges || busy}
                        >
                          <Text size="B300">Cancel</Text>
                        </Button>
                        {saving && <Spinner size="300" />}
                      </Box>
                    </>
                  )}
                  {!(profileEditableThroughClient || profileEditableThroughIDP) && (
                    <CutoutCard style={{ padding: config.space.S200 }} variant="Critical">
                      <SettingTile>
                        <Box direction="Column" gap="200">
                          <Box gap="200" justifyContent="SpaceBetween">
                            <Text size="L400">Profile Editing Disabled</Text>
                          </Box>
                          <Box direction="Column">
                            <Text size="T200">
                              Your homeserver does not allow you to edit your profile.
                            </Text>
                          </Box>
                        </Box>
                      </SettingTile>
                    </CutoutCard>
                  )}
                </SequenceCard>
              </>
            );
          }}
        </ProfileFieldContext>
      </SequenceCard>
    </Box>
  );
}
