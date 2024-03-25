import { atom, useSetAtom } from 'jotai';
import { ClientEvent, IPushRule, IPushRules, MatrixClient, MatrixEvent } from 'matrix-js-sdk';
import { useEffect } from 'react';
import { MuteChanges } from '../../../types/matrix/room';
import { findMutedRule, isMutedRule } from '../../utils/room';

export type MutedRoomsUpdate =
  | {
      type: 'INITIALIZE';
      addRooms: string[];
    }
  | {
      type: 'UPDATE';
      addRooms: string[];
      removeRooms: string[];
    };

export const muteChangesAtom = atom<MuteChanges>({
  added: [],
  removed: [],
});

const baseMutedRoomsAtom = atom(new Set<string>());
export const mutedRoomsAtom = atom<Set<string>, [MutedRoomsUpdate], undefined>(
  (get) => get(baseMutedRoomsAtom),
  (get, set, action) => {
    const mutedRooms = new Set([...get(mutedRoomsAtom)]);
    if (action.type === 'INITIALIZE') {
      set(baseMutedRoomsAtom, new Set([...action.addRooms]));
      set(muteChangesAtom, {
        added: [...action.addRooms],
        removed: [],
      });
      return;
    }
    if (action.type === 'UPDATE') {
      action.removeRooms.forEach((roomId) => mutedRooms.delete(roomId));
      action.addRooms.forEach((roomId) => mutedRooms.add(roomId));
      set(baseMutedRoomsAtom, mutedRooms);
      set(muteChangesAtom, {
        added: [...action.addRooms],
        removed: [...action.removeRooms],
      });
    }
  }
);

export const useBindMutedRoomsAtom = (mx: MatrixClient, mutedAtom: typeof mutedRoomsAtom) => {
  const setMuted = useSetAtom(mutedAtom);

  useEffect(() => {
    const overrideRules = mx.getAccountData('m.push_rules')?.getContent<IPushRules>()
      ?.global?.override;
    if (overrideRules) {
      const mutedRooms = overrideRules.reduce<string[]>((rooms, rule) => {
        if (isMutedRule(rule)) rooms.push(rule.rule_id);
        return rooms;
      }, []);
      setMuted({
        type: 'INITIALIZE',
        addRooms: mutedRooms,
      });
    }
  }, [mx, setMuted]);

  useEffect(() => {
    const handlePushRules = (mEvent: MatrixEvent, oldMEvent?: MatrixEvent) => {
      if (mEvent.getType() === 'm.push_rules') {
        const override = mEvent?.getContent()?.global?.override as IPushRule[] | undefined;
        const oldOverride = oldMEvent?.getContent()?.global?.override as IPushRule[] | undefined;
        if (!override || !oldOverride) return;

        const isMuteToggled = (rule: IPushRule, otherOverride: IPushRule[]) => {
          const roomId = rule.rule_id;

          const isMuted = isMutedRule(rule);
          if (!isMuted) return false;
          const isOtherMuted = findMutedRule(otherOverride, roomId);
          if (isOtherMuted) return false;
          return true;
        };

        const mutedRules = override.filter((rule) => isMuteToggled(rule, oldOverride));
        const unMutedRules = oldOverride.filter((rule) => isMuteToggled(rule, override));

        setMuted({
          type: 'UPDATE',
          addRooms: mutedRules.map((rule) => rule.rule_id),
          removeRooms: unMutedRules.map((rule) => rule.rule_id),
        });
      }
    };
    mx.on(ClientEvent.AccountData, handlePushRules);
    return () => {
      mx.removeListener(ClientEvent.AccountData, handlePushRules);
    };
  }, [mx, setMuted]);
};
