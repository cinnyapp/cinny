export enum Membership {
  Invite = 'invite',
  Knock = 'knock',
  Join = 'join',
  Leave = 'leave',
  Ban = 'ban',
}

export type IMemberContent = {
  avatar_url?: string;
  displayname?: string;
  membership?: Membership;
  reason?: string;
  is_direct?: boolean;
};

export enum StateEvent {
  RoomCanonicalAlias = 'm.room.canonical_alias',
  RoomCreate = 'm.room.create',
  RoomJoinRules = 'm.room.join_rules',
  RoomMember = 'm.room.member',
  RoomThirdPartyInvite = 'm.room.third_party_invite',
  RoomPowerLevels = 'm.room.power_levels',
  RoomName = 'm.room.name',
  RoomTopic = 'm.room.topic',
  RoomAvatar = 'm.room.avatar',
  RoomPinnedEvents = 'm.room.pinned_events',
  RoomEncryption = 'm.room.encryption',
  RoomHistoryVisibility = 'm.room.history_visibility',
  RoomGuestAccess = 'm.room.guest_access',
  RoomServerAcl = 'm.room.server_acl',
  RoomTombstone = 'm.room.tombstone',

  SpaceChild = 'm.space.child',
  SpaceParent = 'm.space.parent',

  PoniesRoomEmotes = 'im.ponies.room_emotes',
}

export enum MessageEvent {
  RoomMessage = 'm.room.message',
  RoomMessageEncrypted = 'm.room.encrypted',
  Sticker = 'm.sticker',
  RoomRedaction = 'm.room.redaction',
  Reaction = 'm.reaction',
}

export enum RoomType {
  Space = 'm.space',
}

export type MSpaceChildContent = {
  via: string[];
  suggested?: boolean;
  order?: string;
};

export enum NotificationType {
  Default = 'default',
  AllMessages = 'all_messages',
  MentionsAndKeywords = 'mentions_and_keywords',
  Mute = 'mute',
}

export type IRoomCreateContent = {
  creator?: string;
  ['m.federate']?: boolean;
  room_version: string;
  type?: string;
  predecessor?: {
    event_id: string;
    room_id: string;
  };
};

export type GetContentCallback = <T>() => T;

export type RoomToParents = Map<string, Set<string>>;
export type Unread = {
  total: number;
  highlight: number;
  from: Set<string> | null;
};
export type RoomToUnread = Map<string, Unread>;
export type UnreadInfo = {
  roomId: string;
  total: number;
  highlight: number;
};

export type MuteChanges = {
  added: string[];
  removed: string[];
};
