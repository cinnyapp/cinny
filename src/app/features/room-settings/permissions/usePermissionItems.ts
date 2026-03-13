import { useMemo } from 'react';
import { MessageEvent, StateEvent } from '../../../../types/matrix/room';
import { PermissionGroup } from '../../common-settings/permissions';

export const usePermissionGroups = (isCallRoom: boolean): PermissionGroup[] => {
  const groups: PermissionGroup[] = useMemo(() => {
    const messagesGroup: PermissionGroup = {
      name: 'Messages',
      items: [
        {
          location: {
            key: MessageEvent.RoomMessage,
          },
          name: 'Send Messages',
        },
        {
          location: {
            key: MessageEvent.Sticker,
          },
          name: 'Send Stickers',
        },
        {
          location: {
            key: MessageEvent.Reaction,
          },
          name: 'Send Reactions',
        },
        {
          location: {
            notification: true,
            key: 'room',
          },
          name: 'Ping @room',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomPinnedEvents,
          },
          name: 'Pin Messages',
        },
        {
          location: {},
          name: 'Other Message Events',
        },
      ],
    };

    const callSettingsGroup: PermissionGroup = {
      name: 'Calls',
      items: [
        {
          location: {
            state: true,
            key: StateEvent.GroupCallMemberPrefix,
          },
          name: 'Join Call',
        },
      ],
    };

    const moderationGroup: PermissionGroup = {
      name: 'Moderation',
      items: [
        {
          location: {
            action: true,
            key: 'invite',
          },
          name: 'Invite',
        },
        {
          location: {
            action: true,
            key: 'kick',
          },
          name: 'Kick',
        },
        {
          location: {
            action: true,
            key: 'ban',
          },
          name: 'Ban',
        },
        {
          location: {
            action: true,
            key: 'redact',
          },
          name: 'Delete Others Messages',
        },
        {
          location: {
            key: MessageEvent.RoomRedaction,
          },
          name: 'Delete Self Messages',
        },
      ],
    };

    const roomOverviewGroup: PermissionGroup = {
      name: 'Room Overview',
      items: [
        {
          location: {
            state: true,
            key: StateEvent.RoomAvatar,
          },
          name: 'Room Avatar',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomName,
          },
          name: 'Room Name',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomTopic,
          },
          name: 'Room Topic',
        },
      ],
    };

    const roomSettingsGroup: PermissionGroup = {
      name: 'Settings',
      items: [
        {
          location: {
            state: true,
            key: StateEvent.RoomJoinRules,
          },
          name: 'Change Room Access',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomCanonicalAlias,
          },
          name: 'Publish Address',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomPowerLevels,
          },
          name: 'Change All Permission',
        },
        {
          location: {
            state: true,
            key: StateEvent.PowerLevelTags,
          },
          name: 'Edit Power Levels',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomEncryption,
          },
          name: 'Enable Encryption',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomHistoryVisibility,
          },
          name: 'History Visibility',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomTombstone,
          },
          name: 'Upgrade Room',
        },
        {
          location: {
            state: true,
          },
          name: 'Other Settings',
        },
      ],
    };

    const otherSettingsGroup: PermissionGroup = {
      name: 'Other',
      items: [
        {
          location: {
            state: true,
            key: StateEvent.PoniesRoomEmotes,
          },
          name: 'Manage Emojis & Stickers',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomServerAcl,
          },
          name: 'Change Server ACLs',
        },
        {
          location: {
            state: true,
            key: 'im.vector.modular.widgets',
          },
          name: 'Modify Widgets',
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
  }, [isCallRoom]);

  return groups;
};
