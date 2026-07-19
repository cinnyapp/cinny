import {
  CreateRoomStateEvent,
  postCreateRoom,
  PostCreateRoomBody,
  PostCreateRoomOK,
} from 'neurone/lib/api/matrix/client/v3/createRoom';
import { MatrixResponseResult, parseMatrixResp } from 'neurone/lib/matrix-request';
import { putStateEvent } from 'neurone/lib/api/matrix/client/v3/rooms';
import { CreateRoomKind } from './CreateRoomKindSelector';
import { JoinRulesContent, RoomType, StateEvent, StateEventType } from '../../../types/matrix/room';
import { getMxIdServer } from '../../utils/matrix';
import { ClientContext } from '../../../client/context';
import { getViaServers } from '../../plugins/via-servers';
import { getJoinRoomStateId } from '../../../client/storage/collections';

const createRoomCreationContent = (
  type: RoomType | undefined,
  allowFederation: boolean,
  additionalCreators: string[] | undefined
): object => {
  const content: Record<string, any> = {};
  if (typeof type === 'string') {
    content.type = type;
  }
  if (allowFederation === false) {
    content['m.federate'] = false;
  }
  if (Array.isArray(additionalCreators)) {
    content.additional_creators = additionalCreators;
  }

  return content;
};

const createRoomJoinRulesState = (
  kind: CreateRoomKind,
  parentId: string | undefined,
  knock: boolean
) => {
  let content: JoinRulesContent = {
    join_rule: knock ? 'knock' : 'invite',
  };

  if (kind === CreateRoomKind.Public) {
    content = {
      join_rule: 'public',
    };
  }

  if (kind === CreateRoomKind.Restricted && parentId) {
    content = {
      join_rule: knock ? 'knock_restricted' : 'restricted',
      allow: [
        {
          type: [StateEventType.RoomMember],
          room_id: parentId,
        },
      ],
    };
  }

  return {
    type: StateEvent.RoomJoinRules,
    state_key: '',
    content,
  };
};

const createRoomParentState = (parentId: string, via: string[]) => ({
  type: StateEvent.SpaceParent,
  state_key: parentId,
  content: {
    canonical: true,
    via,
  },
});

export const createRoomEncryptionState = () => ({
  type: 'm.room.encryption',
  state_key: '',
  content: {
    algorithm: 'm.megolm.v1.aes-sha2',
  },
});

export type CreateRoomData = {
  version: string;
  type?: RoomType;
  parentId?: string;
  kind: CreateRoomKind;
  name: string;
  topic?: string;
  aliasLocalPart?: string;
  encryption?: boolean;
  knock: boolean;
  allowFederation: boolean;
  additionalCreators?: string[];
};
export const createRoom = async (
  ct: ClientContext,
  data: CreateRoomData
): Promise<MatrixResponseResult<string>> => {
  const initialState: CreateRoomStateEvent[] = [];

  if (data.encryption) {
    initialState.push(createRoomEncryptionState());
  }

  if (data.parentId) {
    const creators = ct.roomToCreators.read.get(data.parentId);
    const powerLevelsObj = await ct.storage.joinRoomState.read.get(
      getJoinRoomStateId(data.parentId, StateEventType.RoomPowerLevels, '')
    );
    const powerLevelsContent = powerLevelsObj?.event.content;
    const via = getViaServers(creators, powerLevelsContent);
    initialState.push(createRoomParentState(data.parentId, via));
  }

  initialState.push(createRoomJoinRulesState(data.kind, data.parentId, data.knock));

  const body: PostCreateRoomBody = {
    room_version: data.version,
    name: data.name,
    topic: data.topic,
    room_alias_name: data.aliasLocalPart,
    creation_content: createRoomCreationContent(
      data.type,
      data.allowFederation,
      data.additionalCreators
    ),
    initial_state: initialState,
  };

  const response = await ct.requestAuthJSON(postCreateRoom({ body }));

  const [err, result] = await parseMatrixResp<PostCreateRoomOK>(response);

  if (err) {
    return [err, undefined];
  }

  if (data.parentId) {
    const resp = await ct.requestAuthJSON(
      putStateEvent({
        pathParams: {
          roomId: data.parentId,
          eventType: StateEventType.SpaceChild,
          stateKey: result.room_id,
        },
        body: {
          auto_join: false,
          suggested: false,
          via: [getMxIdServer(ct.session.userId) ?? ''],
        },
      })
    );
    await parseMatrixResp(resp);
  }

  return [undefined, result.room_id];
};
