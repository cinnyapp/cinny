import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageEvent, StateEvent } from '../../../../types/matrix/room';
import { PermissionGroup } from '../../common-settings/permissions';

export const usePermissionGroups = (isCallRoom: boolean): PermissionGroup[] => {
  const { t } = useTranslation();
  const groups: PermissionGroup[] = useMemo(() => {
    const messagesGroup: PermissionGroup = {
      name: t('permissions.messages'),
      items: [
        {
          location: {
            key: MessageEvent.RoomMessage,
          },
          name: t('permissions.sendMessages'),
        },
        {
          location: {
            key: MessageEvent.Sticker,
          },
          name: t('permissions.sendStickers'),
        },
        {
          location: {
            key: MessageEvent.Reaction,
          },
          name: t('permissions.sendReactions'),
        },
        {
          location: {
            notification: true,
            key: 'room',
          },
          name: t('permissions.pingRoom'),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomPinnedEvents,
          },
          name: t('permissions.pinMessages'),
        },
        {
          location: {},
          name: t('permissions.otherMessageEvents'),
        },
      ],
    };

    const callSettingsGroup: PermissionGroup = {
      name: t('permissions.calls'),
      items: [
        {
          location: {
            state: true,
            key: StateEvent.GroupCallMemberPrefix,
          },
          name: t('permissions.joinCall'),
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
        {
          location: {
            action: true,
            key: 'redact',
          },
          name: t('permissions.deleteOthersMessages'),
        },
        {
          location: {
            key: MessageEvent.RoomRedaction,
          },
          name: t('permissions.deleteSelfMessages'),
        },
      ],
    };

    const roomOverviewGroup: PermissionGroup = {
      name: t('permissions.roomOverview'),
      items: [
        {
          location: {
            state: true,
            key: StateEvent.RoomAvatar,
          },
          name: t('permissions.roomAvatar'),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomName,
          },
          name: t('permissions.roomName'),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomTopic,
          },
          name: t('permissions.roomTopic'),
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
          name: t('permissions.changeRoomAccess'),
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
            key: StateEvent.RoomEncryption,
          },
          name: t('permissions.enableEncryption'),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomHistoryVisibility,
          },
          name: t('permissions.historyVisibility'),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomTombstone,
          },
          name: t('permissions.upgradeRoom'),
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
        {
          location: {
            state: true,
            key: 'im.vector.modular.widgets',
          },
          name: t('permissions.modifyWidgets'),
        },
      ],
    };

    return [
      messagesGroup,
      ...(isCallRoom ? [callSettingsGroup] : []),
      moderationGroup,
      roomOverviewGroup,
      roomSettingsGroup,
      otherSettingsGroup,
    ];
  }, [t, isCallRoom]);

  return groups;
};
