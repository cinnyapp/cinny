import { ImageUsage } from './types';
import { PackMetaReader } from './PackMetaReader';
import { PackAddress } from './PackAddress';

export function packAddressEqual(a1?: PackAddress, a2?: PackAddress): boolean {
  if (!a1 && !a2) return true;
  if (!a1 || !a2) return false;
  return a1.roomId === a2.roomId && a1.stateKey === a2.stateKey;
}

export function imageUsageEqual(u1: ImageUsage[], u2: ImageUsage[]) {
  return u1.length === u2.length && u1.every((u) => u2.includes(u));
}

export function packMetaEqual(a: PackMetaReader, b: PackMetaReader): boolean {
  return (
    a.name === b.name &&
    a.avatar === b.avatar &&
    a.attribution === b.attribution &&
    imageUsageEqual(a.usage, b.usage)
  );
}

export function getGlobalPackRoomToStateKey(content?: object): Record<string, string[]> {
  if (typeof content !== 'object') return {};

  if (!('rooms' in content) || typeof content.rooms !== 'object' || content.rooms === null)
    return {};

  const { rooms } = content;
  const rToKeys: Record<string, string[]> = {};

  Object.keys(rooms).forEach((roomId) => {
    const keys = rToKeys[roomId] ?? [];

    const stateKeys = (rooms as Record<string, unknown>)[roomId];
    if (typeof stateKeys !== 'object' || stateKeys === null) return;

    Object.keys(stateKeys).forEach((stateKey) => {
      const result = (stateKeys as Record<string, unknown>)[stateKey];
      if (typeof result !== 'object' || result === null) return;
      keys.push(stateKey);
    });

    rToKeys[roomId] = keys;
  });

  return rToKeys;
}
