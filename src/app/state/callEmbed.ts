import { atom } from 'jotai';
import { CallEmbed } from '../plugins/call';

const baseCallEmbedAtom = atom<CallEmbed | undefined>(undefined);

export const callEmbedAtom = atom<CallEmbed | undefined, [CallEmbed | undefined], void>(
  (get) => get(baseCallEmbedAtom),
  (get, set, callEmbed) => {
    const prevCallEmbed = get(baseCallEmbedAtom);
    if (callEmbed === prevCallEmbed) return;

    if (prevCallEmbed) {
      prevCallEmbed.dispose();
    }

    set(baseCallEmbedAtom, callEmbed);
  }
);

export const callChatAtom = atom<boolean>(false);
