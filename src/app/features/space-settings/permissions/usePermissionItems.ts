import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StateEvent } from '../../../../types/matrix/room';
import { PermissionGroup } from '../../common-settings/permissions';

export const usePermissionGroups = (): PermissionGroup[] => {
  const { t } = useTranslation();
  const groups: PermissionGroup[] = useMemo(() => {
    const messagesGroup: PermissionGroup = {
      name: t('permissions.manage'),
      items: [
        {
          location: {
            state: true,
            key: StateEvent.SpaceChild,
          },
          name: t('permissions.manageSpaceRooms'),
        },
        {
          location: {},
          name: t('permissions.messageEvents'),
        },
      ],
    };

    const moderationGroup: PermissionGroup = {
      name: t('permissions.moderation'),
      items: [
        {
          location: {
            action: true,
            key: 'invite',
          },
          name: t('permissions.invite'),
        },
        {
          location: {
            action: true,
            key: 'kick',
          },
          name: t('permissions.kick'),
        },
        {
          location: {
            action: true,
            key: 'ban',
          },
          name: t('permissions.ban'),
        },
      ],
    };

    const roomOverviewGroup: PermissionGroup = {
      name: t('permissions.spaceOverview'),
      items: [
        {
          location: {
            state: true,
            key: StateEvent.RoomAvatar,
          },
          name: t('permissions.spaceAvatar'),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomName,
          },
          name: t('permissions.spaceName'),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomTopic,
          },
          name: t('permissions.spaceTopic'),
        },
      ],
    };

    const roomSettingsGroup: PermissionGroup = {
      name: t('permissions.settings'),
      items: [
        {
          location: {
            state: true,
            key: StateEvent.RoomJoinRules,
          },
          name: t('permissions.changeSpaceAccess'),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomCanonicalAlias,
          },
          name: t('permissions.publishAddress'),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomPowerLevels,
          },
          name: t('permissions.changeAllPermission'),
        },
        {
          location: {
            state: true,
            key: StateEvent.PowerLevelTags,
          },
          name: t('permissions.editPowerLevels'),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomTombstone,
          },
          name: t('permissions.upgradeSpace'),
        },
        {
          location: {
            state: true,
          },
          name: t('permissions.otherSettings'),
        },
      ],
    };

    const otherSettingsGroup: PermissionGroup = {
      name: t('permissions.other'),
      items: [
        {
          location: {
            state: true,
            key: StateEvent.PoniesRoomEmotes,
          },
          name: t('permissions.manageEmojisStickers'),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomServerAcl,
          },
          name: t('permissions.changeServerAcls'),
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
