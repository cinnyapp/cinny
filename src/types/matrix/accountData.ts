export enum AccountDataEvent {
  PushRules = 'm.push_rules',
  Direct = 'm.direct',
  IgnoredUserList = 'm.ignored_user_list',

  CinnySpaces = 'in.cinny.spaces',

  ElementRecentEmoji = 'io.element.recent_emoji',

  PoniesUserEmotes = 'im.ponies.user_emotes',
  PoniesEmoteRooms = 'im.ponies.emote_rooms',

  SecretStorageDefaultKey = 'm.secret_storage.default_key',

  CrossSigningMaster = 'm.cross_signing.master',
  CrossSigningSelf = 'm.cross_signing.self',
  CrossSigningUser = 'm.cross_signing.user',
  MegolmBackupV1 = 'm.megolm_backup.v1',
}
export enum AccountDataType {
  PushRules = 'm.push_rules',
  Direct = 'm.direct',
  IgnoredUserList = 'm.ignored_user_list',

  CinnySpaces = 'in.cinny.spaces',

  ElementRecentEmoji = 'io.element.recent_emoji',

  PoniesUserEmotes = 'im.ponies.user_emotes',
  PoniesEmoteRooms = 'im.ponies.emote_rooms',

  SecretStorageDefaultKey = 'm.secret_storage.default_key',

  CrossSigningMaster = 'm.cross_signing.master',
  CrossSigningSelf = 'm.cross_signing.self',
  CrossSigningUser = 'm.cross_signing.user',
  MegolmBackupV1 = 'm.megolm_backup.v1',
}

export type MDirectContent = Record<string, string[]>;

export type SecretStorageDefaultKeyContent = {
  key: string;
};

export type SecretStoragePassphraseContent = {
  algorithm: string;
  salt: string;
  iterations: number;
  bits?: number;
};

export type SecretStorageKeyContent = {
  name?: string;
  algorithm: string;
  iv?: string;
  mac?: string;
  passphrase?: SecretStoragePassphraseContent;
};

export type SecretContent = {
  iv: string;
  ciphertext: string;
  mac: string;
};

export type SecretAccountData = {
  encrypted: Record<string, SecretContent>;
};

export enum PushRuleId {
  Master = '.m.rule.master',
  IsUserMention = '.m.rule.is_user_mention',
  IsRoomMention = '.m.rule.is_room_mention',
  ContainsDisplayName = '.m.rule.contains_display_name',
  ContainsUserName = '.m.rule.contains_user_name',
  AtRoomNotification = '.m.rule.roomnotif',
  DM = '.m.rule.room_one_to_one',
  EncryptedDM = '.m.rule.encrypted_room_one_to_one',
  Message = '.m.rule.message',
  EncryptedMessage = '.m.rule.encrypted',
  InviteToSelf = '.m.rule.invite_for_me',
  MemberEvent = '.m.rule.member_event',
  IncomingCall = '.m.rule.call',
  SuppressNotices = '.m.rule.suppress_notices',
  Tombstone = '.m.rule.tombstone',
  PollStart = '.m.rule.poll_start',
  PollStartUnstable = '.org.matrix.msc3930.rule.poll_start',
  PollEnd = '.m.rule.poll_end',
  PollEndUnstable = '.org.matrix.msc3930.rule.poll_end',
  PollStartOneToOne = '.m.rule.poll_start_one_to_one',
  PollStartOneToOneUnstable = '.org.matrix.msc3930.rule.poll_start_one_to_one',
  PollEndOneToOne = '.m.rule.poll_end_one_to_one',
  PollEndOneToOneUnstable = '.org.matrix.msc3930.rule.poll_end_one_to_one',
}
export enum ConditionKind {
  EventMatch = 'event_match',
  EventPropertyIs = 'event_property_is',
  EventPropertyContains = 'event_property_contains',
  ContainsDisplayName = 'contains_display_name',
  RoomMemberCount = 'room_member_count',
  SenderNotificationPermission = 'sender_notification_permission',
  CallStarted = 'call_started',
  CallStartedPrefix = 'org.matrix.msc3914.call_started',
}
