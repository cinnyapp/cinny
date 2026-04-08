import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageEvent, StateEvent } from '../../../../types/matrix/room';
import { PermissionGroup } from '../../common-settings/permissions';

export const usePermissionGroups = (isCallRoom: boolean): PermissionGroup[] => {
  const { t } = useTranslation('roomSettings');
  const groups: PermissionGroup[] = useMemo(() => {
    const messagesGroup: PermissionGroup = {
      name: t('groupMessages', { defaultValue: 'Messages' }),
      items: [
        {
          location: {
            key: MessageEvent.RoomMessage,
          },
          name: t('sendMessages', { defaultValue: 'Send Messages' }),
        },
        {
          location: {
            key: MessageEvent.Sticker,
          },
          name: t('sendStickers', { defaultValue: 'Send Stickers' }),
        },
        {
          location: {
            key: MessageEvent.Reaction,
          },
          name: t('sendReactions', { defaultValue: 'Send Reactions' }),
        },
        {
          location: {
            notification: true,
            key: 'room',
          },
          name: t('pingRoom', { defaultValue: 'Ping @room' }),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomPinnedEvents,
          },
          name: t('pinMessages', { defaultValue: 'Pin Messages' }),
        },
        {
          location: {},
          name: t('otherMessageEvents', { defaultValue: 'Other Message Events' }),
        },
      ],
    };

    const callSettingsGroup: PermissionGroup = {
      name: t('groupCalls', { defaultValue: 'Calls' }),
      items: [
        {
          location: {
            state: true,
            key: StateEvent.GroupCallMemberPrefix,
          },
          name: t('joinCall', { defaultValue: 'Join Call' }),
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
        {
          location: {
            action: true,
            key: 'redact',
          },
          name: t('deleteOthersMessages', { defaultValue: 'Delete Others Messages' }),
        },
        {
          location: {
            key: MessageEvent.RoomRedaction,
          },
          name: t('deleteSelfMessages', { defaultValue: 'Delete Self Messages' }),
        },
      ],
    };

    const roomOverviewGroup: PermissionGroup = {
      name: t('groupRoomOverview', { defaultValue: 'Room Overview' }),
      items: [
        {
          location: {
            state: true,
            key: StateEvent.RoomAvatar,
          },
          name: t('roomAvatar', { defaultValue: 'Room Avatar' }),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomName,
          },
          name: t('roomName', { defaultValue: 'Room Name' }),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomTopic,
          },
          name: t('roomTopic', { defaultValue: 'Room Topic' }),
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
          name: t('changeRoomAccess', { defaultValue: 'Change Room Access' }),
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
            key: StateEvent.RoomEncryption,
          },
          name: t('enableEncryption', { defaultValue: 'Enable Encryption' }),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomHistoryVisibility,
          },
          name: t('historyVisibility', { defaultValue: 'History Visibility' }),
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomTombstone,
          },
          name: t('upgradeRoom', { defaultValue: 'Upgrade Room' }),
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
        {
          location: {
            state: true,
            key: 'im.vector.modular.widgets',
          },
          name: t('modifyWidgets', { defaultValue: 'Modify Widgets' }),
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
  }, [isCallRoom, t]);

  return groups;
};
