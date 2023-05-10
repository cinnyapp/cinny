import { MatrixClient, Room } from 'matrix-js-sdk';
import { useEffect, useState } from 'react';
import { getRelevantPacks, ImagePack } from './custom-emoji';

export const useRelevantEmojiPacks = (mx?: MatrixClient, rooms?: Room[]): ImagePack[] => {
  const [relevantPacks] = useState(() =>
    getRelevantPacks(mx, rooms).filter((pack) => pack.getEmojis().length > 0)
  );
  useEffect(() => {
    // TODO: listen emoji change event.
  });

  return relevantPacks;
};
