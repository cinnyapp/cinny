import produce from 'immer';
import { atom } from 'jotai';
import { MatrixClient } from 'matrix-js-sdk';

type RoomInfo = {
  roomId: string;
  timestamp: number;
};
type TabToRoom = Map<string, RoomInfo>;

type TabToRoomAction = {
  type: 'PUT';
  tabInfo: { tabId: string; roomInfo: RoomInfo };
};

const baseTabToRoom = atom<TabToRoom>(new Map());
export const tabToRoomAtom = atom<TabToRoom, TabToRoomAction>(
  (get) => get(baseTabToRoom),
  (get, set, action) => {
    if (action.type === 'PUT') {
      set(
        baseTabToRoom,
        produce(get(baseTabToRoom), (draft) => {
          draft.set(action.tabInfo.tabId, action.tabInfo.roomInfo);
        })
      );
    }
  }
);

export const useBindTabToRoomAtom = (mx: MatrixClient) => {
  console.log(mx);
  // TODO:
};
