import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StateEvent } from '../../../../types/matrix/room';
import { PermissionGroup } from '../../common-settings/permissions';

export const usePermissionGroups = (): PermissionGroup[] => {
  const { t } = useTranslation('spaceSettings');
  const groups: PermissionGroup[] = useMemo(() => {
    const messagesGroup: PermissionGroup = {
      name: t('groupManage', { defaultValue: 'Manage' }),
      items: [
        {
          location: {
            state: true,
            key: StateEvent.SpaceChild,
          },
          name: t('manageSpaceRooms', { defaultValue: 'Manage space rooms' }),
        },
        {
          location: {},
          name: t('messageEvents', { defaultValue: 'Message Events' }),
        },
      ],
    };

    const moderationGroup: PermissionGroup = {
      name: t('groupModeration', { defaultValue: 'Moderation' }),
      items: [
        {
          location: {
            action: true,
            key: 'invite',
          },
          name: t('invite', { defaultValue: 'Invite' }),
        },
        {
          location: {
            action: true,
            key: 'kick',
          },
          name: t('kick', { defaultValue: 'Kick' }),
        },
        {
          location: {
            action: true,
            key: 'ban',
          },
          name: t('ban', { defaultValue: 'Ban' }),
        },
      ],
    };

    const roomOverviewGroup: PermissionGroup = {
      name: t('groupSpaceOverview', { defaultValue: 'Space Overview' }),
      items: [
        {
          location: {
            state: true,
            key: StateEvent.RoomAvatar,
          },
          name: t('spaceAvatar', { defaultValue: 'Space Avatar' }),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomName,
          },
          name: t('spaceName', { defaultValue: 'Space Name' }),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomTopic,
          },
          name: t('spaceTopic', { defaultValue: 'Space Topic' }),
        },
      ],
    };

    const roomSettingsGroup: PermissionGroup = {
      name: t('groupSettings', { defaultValue: 'Settings' }),
      items: [
        {
          location: {
            state: true,
            key: StateEvent.RoomJoinRules,
          },
          name: t('changeSpaceAccess', { defaultValue: 'Change Space Access' }),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomCanonicalAlias,
          },
          name: t('publishAddress', { defaultValue: 'Publish Address' }),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomPowerLevels,
          },
          name: t('changeAllPermission', { defaultValue: 'Change All Permission' }),
        },
        {
          location: {
            state: true,
            key: StateEvent.PowerLevelTags,
          },
          name: t('editPowerLevels', { defaultValue: 'Edit Power Levels' }),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomTombstone,
          },
          name: t('upgradeSpace', { defaultValue: 'Upgrade Space' }),
        },
        {
          location: {
            state: true,
          },
          name: t('otherSettings', { defaultValue: 'Other Settings' }),
        },
      ],
    };

    const otherSettingsGroup: PermissionGroup = {
      name: t('groupOther', { defaultValue: 'Other' }),
      items: [
        {
          location: {
            state: true,
            key: StateEvent.PoniesRoomEmotes,
          },
          name: t('manageEmojisStickers', { defaultValue: 'Manage Emojis & Stickers' }),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomServerAcl,
          },
          name: t('changeServerAcls', { defaultValue: 'Change Server ACLs' }),
        },
      ],
    };

    return [
      messagesGroup,
      moderationGroup,
      roomOverviewGroup,
      roomSettingsGroup,
      otherSettingsGroup,
    ];
  }, [t]);

  return groups;
};
