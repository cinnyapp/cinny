import { ComputedObservableValue, ObservableValue } from 'neurone/lib/utils/observable';
import { MatrixRequest } from 'neurone/lib/matrix-request';
import { HistoryVisibility, Machine } from 'neurone/lib/crypto/machine';
import { ObjectReader } from 'neurone/lib/utils';
import { Disposer } from 'neurone/lib/utils/disposable';
import {
  MessageEventWithoutRoomId,
  RoomSummary,
  StateEventWithoutRoomId,
} from 'neurone/lib/api/types';
import {
  InviteRoomStateObject,
  JoinRoomStateObject,
  KnockRoomStateObject,
  LeaveRoomStateObject,
  sessionValue,
} from './storage/collections';
import { Storage } from './storage';
import { SyncContext, SyncValue } from './sync';
import { Session } from '../app/state/sessions';
import { JoinRule, SpaceChildContent, StateEventType } from '../types/matrix/room';
import { GetTxnId } from './txn';
import { Timeline } from './room';
import { AccountDataType } from '../types/matrix/accountData';
import { DecryptionManager } from './decryption';

export type StateContext = {
  join: {
    create: ObservableValue<JoinRoomStateObject[]>;
    encryption: ObservableValue<JoinRoomStateObject[]>;
    tombstone: ObservableValue<JoinRoomStateObject[]>;
    spaceChild: ObservableValue<JoinRoomStateObject[]>;
    canonicalAlias: ObservableValue<JoinRoomStateObject[]>;
    name: ObservableValue<JoinRoomStateObject[]>;
    topic: ObservableValue<JoinRoomStateObject[]>;
    avatar: ObservableValue<JoinRoomStateObject[]>;
    joinRules: ObservableValue<JoinRoomStateObject[]>;
    historyVisibility: ObservableValue<JoinRoomStateObject[]>;
  };
  invite: {
    create: ObservableValue<InviteRoomStateObject[]>;
    encryption: ObservableValue<InviteRoomStateObject[]>;
    canonicalAlias: ObservableValue<InviteRoomStateObject[]>;
    name: ObservableValue<InviteRoomStateObject[]>;
    topic: ObservableValue<InviteRoomStateObject[]>;
    avatar: ObservableValue<InviteRoomStateObject[]>;
    joinRules: ObservableValue<InviteRoomStateObject[]>;
  };
  knock: {
    create: ObservableValue<KnockRoomStateObject[]>;
    encryption: ObservableValue<KnockRoomStateObject[]>;
    canonicalAlias: ObservableValue<KnockRoomStateObject[]>;
    name: ObservableValue<KnockRoomStateObject[]>;
    topic: ObservableValue<KnockRoomStateObject[]>;
    avatar: ObservableValue<KnockRoomStateObject[]>;
    joinRules: ObservableValue<KnockRoomStateObject[]>;
  };
  leave: {
    create: ObservableValue<LeaveRoomStateObject[]>;
    encryption: ObservableValue<LeaveRoomStateObject[]>;
    canonicalAlias: ObservableValue<LeaveRoomStateObject[]>;
    name: ObservableValue<LeaveRoomStateObject[]>;
    topic: ObservableValue<LeaveRoomStateObject[]>;
    avatar: ObservableValue<LeaveRoomStateObject[]>;
    joinRules: ObservableValue<LeaveRoomStateObject[]>;
  };
};

export type RoomsContext = {
  join: ObservableValue<string[]>;
  invite: ObservableValue<string[]>;
  knock: ObservableValue<string[]>;
  leave: ObservableValue<string[]>;
};

export type ClientContext = {
  session: Session;
  storage: Storage;
  machine: Machine;
  state: StateContext;
  rooms: RoomsContext;
  decryption: DecryptionManager;

  directRoomToUser: ObservableValue<Map<string, string>>;
  directRooms: ObservableValue<Set<string>>;
  spaceRooms: ObservableValue<Set<string>>;
  encryptedRooms: ObservableValue<Set<string>>;

  roomToParents: ObservableValue<Map<string, Set<string>>>;
  roomToChildEvents: ObservableValue<Map<string, StateEventWithoutRoomId<SpaceChildContent>[]>>;
  roomToSummary: ObservableValue<Map<string, RoomSummary>>;
  roomToAlias: ObservableValue<Map<string, string>>;
  roomToName: ObservableValue<Map<string, string>>;
  roomToTopic: ObservableValue<Map<string, string>>;
  roomToAvatar: ObservableValue<Map<string, string>>;
  roomToHistoryVisibility: ObservableValue<Map<string, HistoryVisibility>>;
  roomToJoinRule: ObservableValue<Map<string, JoinRule>>;
  roomToType: ObservableValue<Map<string, string | undefined>>;
  roomToReplacement: ObservableValue<Map<string, string>>;
  roomToCreators: ObservableValue<Map<string, Set<string>>>;
  roomToVersion: ObservableValue<Map<string, string>>;
  roomToLatestEvent: ObservableValue<Map<string, MessageEventWithoutRoomId>>;
  roomToTimeline: ObservableValue<Map<string, Timeline>>;

  pendingMemberRooms: ObservableValue<string[]>;
  sync: SyncContext;
  requestAuthJSON: MatrixRequest;
  getTxnId: GetTxnId;
  logout: () => Promise<void>;
  clearCacheAndReload: () => Promise<void>;
};

type RoomStateObject =
  | JoinRoomStateObject
  | InviteRoomStateObject
  | KnockRoomStateObject
  | LeaveRoomStateObject;

export async function createStateContext(
  storage: Storage,
  disposer: Disposer
): Promise<StateContext> {
  const { joinRoomState, inviteRoomState, leaveRoomState, knockRoomState } = storage;

  const joinCreate = await joinRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomCreate
  );
  const inviteCreate = await inviteRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomCreate
  );
  const knockCreate = await knockRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomCreate
  );
  const leaveCreate = await leaveRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomCreate
  );
  disposer.collect(joinCreate, inviteCreate, knockCreate, leaveCreate);

  const joinEncryption = await joinRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomEncryption
  );
  const inviteEncryption = await inviteRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomEncryption
  );
  const knockEncryption = await knockRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomEncryption
  );
  const leaveEncryption = await leaveRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomEncryption
  );
  disposer.collect(joinEncryption, inviteEncryption, knockEncryption, leaveEncryption);

  const joinTombstone = await storage.joinRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomTombstone
  );
  disposer.collect(joinTombstone);

  const joinSpaceChild = await storage.joinRoomState.observableRead.queryIndex(
    'type',
    StateEventType.SpaceChild
  );
  disposer.collect(joinSpaceChild);

  const joinCanonicalAlias = await storage.joinRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomCanonicalAlias
  );
  const inviteCanonicalAlias = await storage.inviteRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomCanonicalAlias
  );
  const knockCanonicalAlias = await storage.knockRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomCanonicalAlias
  );
  const leaveCanonicalAlias = await storage.leaveRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomCanonicalAlias
  );

  disposer.collect(
    joinCanonicalAlias,
    inviteCanonicalAlias,
    knockCanonicalAlias,
    leaveCanonicalAlias
  );

  const joinName = await storage.joinRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomName
  );
  const inviteName = await storage.inviteRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomName
  );
  const knockName = await storage.knockRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomName
  );
  const leaveName = await storage.leaveRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomName
  );
  disposer.collect(joinName, inviteName, knockName, leaveName);

  const joinTopic = await storage.joinRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomTopic
  );
  const inviteTopic = await storage.inviteRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomTopic
  );
  const knockTopic = await storage.knockRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomTopic
  );
  const leaveTopic = await storage.leaveRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomTopic
  );
  disposer.collect(joinTopic, inviteTopic, knockTopic, leaveTopic);

  const joinAvatar = await storage.joinRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomAvatar
  );
  const inviteAvatar = await storage.inviteRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomAvatar
  );
  const knockAvatar = await storage.knockRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomAvatar
  );
  const leaveAvatar = await storage.leaveRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomAvatar
  );
  disposer.collect(joinAvatar, inviteAvatar, knockAvatar, leaveAvatar);

  const joinJoinRules = await storage.joinRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomJoinRules
  );
  const inviteJoinRules = await storage.inviteRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomJoinRules
  );
  const knockJoinRules = await storage.knockRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomJoinRules
  );
  const leaveJoinRules = await storage.leaveRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomJoinRules
  );
  disposer.collect(joinJoinRules, inviteJoinRules, knockJoinRules, leaveJoinRules);

  const joinHistoryVisibility = await storage.joinRoomState.observableRead.queryIndex(
    'type',
    StateEventType.RoomHistoryVisibility
  );
  disposer.collect(joinHistoryVisibility);

  return {
    join: {
      create: joinCreate,
      encryption: joinEncryption,
      tombstone: joinTombstone,
      spaceChild: joinSpaceChild,
      canonicalAlias: joinCanonicalAlias,
      name: joinName,
      topic: joinTopic,
      avatar: joinAvatar,
      joinRules: joinJoinRules,
      historyVisibility: joinHistoryVisibility,
    },
    invite: {
      create: inviteCreate,
      encryption: inviteEncryption,
      canonicalAlias: inviteCanonicalAlias,
      name: inviteName,
      topic: inviteTopic,
      avatar: inviteAvatar,
      joinRules: inviteJoinRules,
    },
    knock: {
      create: knockCreate,
      encryption: knockEncryption,
      canonicalAlias: knockCanonicalAlias,
      name: knockName,
      topic: knockTopic,
      avatar: knockAvatar,
      joinRules: knockJoinRules,
    },
    leave: {
      create: leaveCreate,
      encryption: leaveEncryption,
      canonicalAlias: leaveCanonicalAlias,
      name: leaveName,
      topic: leaveTopic,
      avatar: leaveAvatar,
      joinRules: leaveJoinRules,
    },
  };
}

export const createRoomContext = async (
  state: StateContext,
  disposer: Disposer
): Promise<{
  rooms: RoomsContext;
  spaceRooms: ObservableValue<Set<string>>;
  roomToCreators: ObservableValue<Map<string, Set<string>>>;
  roomToVersion: ObservableValue<Map<string, string>>;
}> => {
  const join: ObservableValue<string[]> = new ComputedObservableValue(
    () => state.join.create.read.map((obj) => obj.roomId),
    [state.join.create]
  );
  disposer.collect(join);

  const invite: ObservableValue<string[]> = new ComputedObservableValue(
    () => state.invite.create.read.map((obj) => obj.roomId),
    [state.invite.create]
  );
  disposer.collect(invite);

  const knock: ObservableValue<string[]> = new ComputedObservableValue(
    () => state.knock.create.read.map((obj) => obj.roomId),
    [state.knock.create]
  );
  disposer.collect(knock);

  const leave: ObservableValue<string[]> = new ComputedObservableValue(
    () => state.leave.create.read.map((obj) => obj.roomId),
    [state.leave.create]
  );
  disposer.collect(leave);

  const spacesObservable: ObservableValue<Set<string>> = new ComputedObservableValue(() => {
    const spaces = new Set<string>();

    const addToSpaces = (roomId: string, content: object) => {
      if ('type' in content && typeof content.type === 'string' && content.type === 'm.space') {
        spaces.add(roomId);
      }
    };

    state.join.create.read.forEach((obj) => addToSpaces(obj.roomId, obj.event.content));
    state.invite.create.read.forEach((obj) => addToSpaces(obj.roomId, obj.event.content));
    state.knock.create.read.forEach((obj) => addToSpaces(obj.roomId, obj.event.content));
    state.leave.create.read.forEach((obj) => addToSpaces(obj.roomId, obj.event.content));

    return spaces;
  }, [state.join.create, state.invite.create, state.knock.create, state.leave.create]);
  disposer.collect(spacesObservable);

  const roomToCreatorsObservable: ObservableValue<Map<string, Set<string>>> =
    new ComputedObservableValue(() => {
      const roomToCreators = new Map<string, Set<string>>();

      state.join.create.read.forEach((obj) => {
        const creators = new Set<string>();
        const { sender, content } = obj.event;
        creators.add(sender);

        if ('additional_creators' in content && Array.isArray(content.additional_creators)) {
          content.additional_creators.forEach((userId) => {
            if (typeof userId === 'string') {
              creators.add(userId);
            }
          });
        }

        roomToCreators.set(obj.roomId, creators);
      });

      return roomToCreators;
    }, [state.join.create]);
  disposer.collect(roomToCreatorsObservable);

  const roomToVersionObservable: ObservableValue<Map<string, string>> =
    new ComputedObservableValue(() => {
      const roomToVersion = new Map<string, string>();

      state.join.create.read.forEach((obj) => {
        const { content } = obj.event;

        if ('room_version' in content && typeof content.room_version === 'string') {
          roomToVersion.set(obj.roomId, content.room_version);
        }
      });

      return roomToVersion;
    }, [state.join.create]);
  disposer.collect(roomToVersionObservable);

  const roomsContext: RoomsContext = {
    join,
    invite,
    knock,
    leave,
  };

  return {
    rooms: roomsContext,
    spaceRooms: spacesObservable,
    roomToCreators: roomToCreatorsObservable,
    roomToVersion: roomToVersionObservable,
  };
};

export const createEncryptedRoomsObservable = (
  state: StateContext,
  disposer: Disposer
): ObservableValue<Set<string>> => {
  const encryptedRoomsObservable: ObservableValue<Set<string>> = new ComputedObservableValue(() => {
    const encryptedRooms = new Set<string>();

    state.join.encryption.read.forEach((obj) => encryptedRooms.add(obj.roomId));
    state.invite.encryption.read.forEach((obj) => encryptedRooms.add(obj.roomId));
    state.knock.encryption.read.forEach((obj) => encryptedRooms.add(obj.roomId));
    state.leave.encryption.read.forEach((obj) => encryptedRooms.add(obj.roomId));

    return encryptedRooms;
  }, [
    state.join.encryption,
    state.invite.encryption,
    state.knock.encryption,
    state.leave.encryption,
  ]);

  disposer.collect(encryptedRoomsObservable);

  return encryptedRoomsObservable;
};

export const createDirectRoomToUserObservable = async (
  storage: Storage,
  disposer: Disposer
): Promise<ObservableValue<Map<string, string>>> => {
  const mDirectObj = await storage.accountData.observableRead.get(AccountDataType.Direct);

  const roomToUserObservable = new ComputedObservableValue(() => {
    const roomToUser = new Map<string, string>();
    const userIdToRooms = mDirectObj.read?.event.content;

    if (typeof userIdToRooms !== 'object' || userIdToRooms === null) {
      return roomToUser;
    }

    Object.entries(userIdToRooms).forEach(([userId, roomIds]) => {
      if (!Array.isArray(roomIds)) return;

      roomIds.forEach((roomId) => {
        if (typeof roomId === 'string') {
          roomToUser.set(roomId, userId);
        }
      });
    });

    return roomToUser;
  }, [mDirectObj]);

  disposer.collect(mDirectObj, roomToUserObservable);

  return roomToUserObservable;
};

export const createDirectRoomsObservable = (
  roomToUserObservable: ObservableValue<Map<string, string>>,
  disposer: Disposer
): ObservableValue<Set<string>> => {
  const directRoomsObservable = new ComputedObservableValue(
    () => new Set(roomToUserObservable.read?.keys() ?? []),
    [roomToUserObservable]
  );

  disposer.collect(directRoomsObservable);

  return directRoomsObservable;
};

export const createRoomToReplacementObservable = (
  state: StateContext,
  disposer: Disposer
): ObservableValue<Map<string, string>> => {
  const roomToReplacementObservable: ObservableValue<Map<string, string>> =
    new ComputedObservableValue(() => {
      const roomToReplacement = new Map<string, string>();

      state.join.tombstone.read.forEach((obj) => {
        const { content } = obj.event ?? {};
        if ('replacement_room' in content && typeof content.replacement_room === 'string') {
          roomToReplacement.set(obj.roomId, content.replacement_room);
        }
      });

      return roomToReplacement;
    }, [state.join.tombstone]);

  disposer.collect(roomToReplacementObservable);

  return roomToReplacementObservable;
};

export const createSpaceMapping = (
  state: StateContext,
  disposer: Disposer
): {
  roomToParents: ObservableValue<Map<string, Set<string>>>;
  roomToChildEvents: ObservableValue<Map<string, StateEventWithoutRoomId<SpaceChildContent>[]>>;
} => {
  const roomToParentsObservable: ObservableValue<Map<string, Set<string>>> =
    new ComputedObservableValue(() => {
      const roomToParents = new Map<string, Set<string>>();

      state.join.spaceChild.read.forEach((childEventObj) => {
        const { event, roomId: parentId } = childEventObj;
        const roomId = event.state_key;
        if ('via' in event.content && Array.isArray(event.content.via)) {
          const parents = roomToParents.get(roomId) ?? new Set<string>();
          parents.add(parentId);
          roomToParents.set(roomId, parents);
        }
      });

      return roomToParents;
    }, [state.join.spaceChild]);

  const roomToChildEventsObservable: ObservableValue<
    Map<string, StateEventWithoutRoomId<SpaceChildContent>[]>
  > = new ComputedObservableValue(() => {
    const roomToChildEvents = new Map<string, StateEventWithoutRoomId<SpaceChildContent>[]>();

    state.join.spaceChild.read.forEach((childEventObj) => {
      const { event, roomId: parentId } = childEventObj;

      if ('via' in event.content && Array.isArray(event.content.via)) {
        const children = roomToChildEvents.get(parentId) ?? [];
        children.push(event as StateEventWithoutRoomId<SpaceChildContent>);
        roomToChildEvents.set(parentId, children);
      }
    });

    return roomToChildEvents;
  }, [state.join.spaceChild]);

  disposer.collect(roomToParentsObservable, roomToChildEventsObservable);

  return {
    roomToParents: roomToParentsObservable,
    roomToChildEvents: roomToChildEventsObservable,
  };
};

export const createRoomToSummaryObservable = async (
  storage: Storage,
  disposer: Disposer
): Promise<ObservableValue<Map<string, RoomSummary>>> => {
  const summariesObservable = await storage.joinRoomSummary.observableRead.getAll();
  const roomToSummaryObservable: ObservableValue<Map<string, RoomSummary>> =
    new ComputedObservableValue(() => {
      const roomToSummary = new Map<string, RoomSummary>();

      summariesObservable.read.forEach((obj) => {
        roomToSummary.set(obj.id, obj.summary);
      });

      return roomToSummary;
    }, [summariesObservable]);

  disposer.collect(summariesObservable, roomToSummaryObservable);
  return roomToSummaryObservable;
};

export const createRoomToAliasObservable = (
  state: StateContext,
  disposer: Disposer
): ObservableValue<Map<string, string>> => {
  const roomToAliasObservable: ObservableValue<Map<string, string>> =
    new ComputedObservableValue(() => {
      const roomToAlias = new Map<string, string>();

      const addAlias = (obj: RoomStateObject) => {
        const { content, state_key: stateKey } = obj.event;
        if (
          stateKey === '' &&
          'alias' in content &&
          typeof content.alias === 'string' &&
          content.alias
        ) {
          roomToAlias.set(obj.roomId, content.alias);
        }
      };

      state.join.canonicalAlias.read.forEach(addAlias);
      state.invite.canonicalAlias.read.forEach(addAlias);
      state.knock.canonicalAlias.read.forEach(addAlias);
      state.leave.canonicalAlias.read.forEach(addAlias);

      return roomToAlias;
    }, [
      state.join.canonicalAlias,
      state.invite.canonicalAlias,
      state.knock.canonicalAlias,
      state.leave.canonicalAlias,
    ]);

  disposer.collect(roomToAliasObservable);
  return roomToAliasObservable;
};

export const createRoomToNameObservable = (
  state: StateContext,
  disposer: Disposer
): ObservableValue<Map<string, string>> => {
  const roomToNameObservable: ObservableValue<Map<string, string>> =
    new ComputedObservableValue(() => {
      const roomToName = new Map<string, string>();

      const addName = (obj: RoomStateObject) => {
        const { content, state_key: stateKey } = obj.event;
        if (
          stateKey === '' &&
          'name' in content &&
          typeof content.name === 'string' &&
          content.name
        ) {
          roomToName.set(obj.roomId, content.name);
        }
      };
      state.join.name.read.forEach(addName);
      state.invite.name.read.forEach(addName);
      state.knock.name.read.forEach(addName);
      state.leave.name.read.forEach(addName);

      return roomToName;
    }, [state.join.name, state.invite.name, state.knock.name, state.leave.name]);

  disposer.collect(roomToNameObservable);
  return roomToNameObservable;
};

export const createRoomToTopicObservable = (
  state: StateContext,
  disposer: Disposer
): ObservableValue<Map<string, string>> => {
  const roomToTopicObservable: ObservableValue<Map<string, string>> =
    new ComputedObservableValue(() => {
      const roomToTopic = new Map<string, string>();

      const addName = (obj: RoomStateObject) => {
        const { content, state_key: stateKey } = obj.event;
        const topic = ObjectReader.string(content, 'topic');
        if (topic && stateKey === '') {
          roomToTopic.set(obj.roomId, topic);
        }
      };
      state.join.topic.read.forEach(addName);
      state.invite.topic.read.forEach(addName);
      state.knock.topic.read.forEach(addName);
      state.leave.topic.read.forEach(addName);

      return roomToTopic;
    }, [state.join.topic, state.invite.topic, state.knock.topic, state.leave.topic]);

  disposer.collect(roomToTopicObservable);
  return roomToTopicObservable;
};

export const createRoomToAvatarObservable = (
  state: StateContext,
  disposer: Disposer
): ObservableValue<Map<string, string>> => {
  const roomToAvatarObservable: ObservableValue<Map<string, string>> =
    new ComputedObservableValue(() => {
      const roomToAvatar = new Map<string, string>();
      const addAvatar = (obj: RoomStateObject) => {
        const { content, state_key: stateKey } = obj.event;
        if (
          stateKey === '' &&
          'url' in content &&
          typeof content.url === 'string' &&
          content.url.startsWith('mxc://')
        ) {
          roomToAvatar.set(obj.roomId, content.url);
        }
      };
      state.join.avatar.read.forEach(addAvatar);
      state.invite.avatar.read.forEach(addAvatar);
      state.knock.avatar.read.forEach(addAvatar);
      state.leave.avatar.read.forEach(addAvatar);

      return roomToAvatar;
    }, [state.join.avatar, state.invite.avatar, state.knock.avatar, state.leave.avatar]);

  disposer.collect(roomToAvatarObservable);
  return roomToAvatarObservable;
};

export const createRoomToHistoryVisibilityObservable = (
  state: StateContext,
  disposer: Disposer
): ObservableValue<Map<string, HistoryVisibility>> => {
  const roomToHistoryVisibilityObservable: ObservableValue<Map<string, HistoryVisibility>> =
    new ComputedObservableValue(() => {
      const roomToHistoryVisibility = new Map<string, HistoryVisibility>();

      const addHistoryVisibility = (obj: RoomStateObject) => {
        const { content, state_key: stateKey } = obj.event;
        if (stateKey !== '') return;
        const historyVisibility = ObjectReader.string(content, 'history_visibility');
        if (historyVisibility) {
          roomToHistoryVisibility.set(obj.roomId, historyVisibility as HistoryVisibility);
        }
      };

      state.join.historyVisibility.read.forEach(addHistoryVisibility);

      return roomToHistoryVisibility;
    }, [state.join.historyVisibility]);

  disposer.collect(roomToHistoryVisibilityObservable);
  return roomToHistoryVisibilityObservable;
};

export const createRoomToJoinRuleObservable = (
  state: StateContext,
  disposer: Disposer
): ObservableValue<Map<string, JoinRule>> => {
  const roomToJoinRuleObservable: ObservableValue<Map<string, JoinRule>> =
    new ComputedObservableValue(() => {
      const roomToJoinRule = new Map<string, JoinRule>();

      const addJoinRule = (obj: RoomStateObject) => {
        const { content, state_key: stateKey } = obj.event;
        if (stateKey === '' && 'join_rule' in content && typeof content.join_rule === 'string') {
          roomToJoinRule.set(obj.roomId, content.join_rule as JoinRule);
        }
      };

      state.join.joinRules.read.forEach(addJoinRule);
      state.invite.joinRules.read.forEach(addJoinRule);
      state.knock.joinRules.read.forEach(addJoinRule);
      state.leave.joinRules.read.forEach(addJoinRule);

      return roomToJoinRule;
    }, [
      state.join.joinRules,
      state.invite.joinRules,
      state.knock.joinRules,
      state.leave.joinRules,
    ]);

  disposer.collect(roomToJoinRuleObservable);
  return roomToJoinRuleObservable;
};

export const createRoomToTypeObservable = (
  state: StateContext,
  disposer: Disposer
): ObservableValue<Map<string, string | undefined>> => {
  const roomToTypeObservable: ObservableValue<Map<string, string | undefined>> =
    new ComputedObservableValue(() => {
      const roomToJoinRule = new Map<string, string | undefined>();

      const addType = (obj: RoomStateObject) => {
        const { content } = obj.event;
        const type = ObjectReader.string(content, 'type');
        if (type) {
          roomToJoinRule.set(obj.roomId, type);
        }
      };

      state.join.create.read.forEach(addType);
      state.invite.create.read.forEach(addType);
      state.knock.create.read.forEach(addType);
      state.leave.create.read.forEach(addType);

      return roomToJoinRule;
    }, [state.join.create, state.invite.create, state.knock.create, state.leave.create]);

  disposer.collect(roomToTypeObservable);
  return roomToTypeObservable;
};

export const createRoomToLatestEventObservable = async (
  storage: Storage,
  disposer: Disposer
): Promise<ObservableValue<Map<string, MessageEventWithoutRoomId>>> => {
  const roomLatestEventObjects = await storage.joinRoomLatestEvent.observableRead.getAll();

  const roomToLatestEventObservable: ObservableValue<Map<string, MessageEventWithoutRoomId>> =
    new ComputedObservableValue(() => {
      const roomToLatestEvent = new Map<string, MessageEventWithoutRoomId>();
      roomLatestEventObjects.read.map((obj) => roomToLatestEvent.set(obj.id, obj.event));
      return roomToLatestEvent;
    }, [roomLatestEventObjects]);

  disposer.collect(roomLatestEventObjects, roomToLatestEventObservable);

  return roomToLatestEventObservable;
};

export const createLogoutObservable = (
  syncObservable: ObservableValue<SyncValue>,
  disposer: Disposer
): ObservableValue<boolean> => {
  const LOGOUT_PUBLISHER_KEY = 'LOGOUT_PUBLISHER_KEY';
  const logoutObservable: ObservableValue<boolean> = new ObservableValue(
    false,
    LOGOUT_PUBLISHER_KEY
  );

  const unsubscribeSync = syncObservable.subscribe((value) => {
    if (value === undefined) return;
    const [error] = value;
    if (error && !(error instanceof Error)) {
      const { errcode } = error.data;
      if (errcode === 'M_UNKNOWN_TOKEN') {
        logoutObservable.publish(LOGOUT_PUBLISHER_KEY, true);
        unsubscribeSync();
      }
    }
  });

  logoutObservable.onDispose(LOGOUT_PUBLISHER_KEY, () => {
    unsubscribeSync();
  });

  disposer.collect(logoutObservable);

  return logoutObservable;
};

export const createSyncTokenObservable = async (
  storage: Storage,
  disposer: Disposer
): Promise<ObservableValue<string | undefined>> => {
  const syncTokenObj = await storage.sessionValue.observableRead.get(sessionValue.syncToken.id);

  const syncTokenObservable: ObservableValue<string | undefined> =
    new ComputedObservableValue(() => {
      const syncToken = sessionValue.syncToken.parse(syncTokenObj.read);
      return syncToken;
    }, [syncTokenObj]);

  disposer.collect(syncTokenObj, syncTokenObservable);
  return syncTokenObservable;
};

export const createPendingMemberRoomObservable = async (
  storage: Storage,
  disposer: Disposer
): Promise<ObservableValue<string[]>> => {
  const pendingMemberRoomsObj = await storage.sessionValue.observableRead.get(
    sessionValue.pendingMemberRooms.id
  );

  const pendingMemberRoomsObservable: ObservableValue<string[]> =
    new ComputedObservableValue(() => {
      const rooms = sessionValue.pendingMemberRooms.parse(pendingMemberRoomsObj.read);
      return rooms ?? [];
    }, [pendingMemberRoomsObj]);

  disposer.collect(pendingMemberRoomsObj, pendingMemberRoomsObservable);
  return pendingMemberRoomsObservable;
};
