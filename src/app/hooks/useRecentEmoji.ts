import { useCallback, useMemo } from 'react';
import { PendingObservableResult } from 'neurone/lib/utils/observable';
import { getRecentEmojis } from '../plugins/recent-emoji';
import { AccountDataType } from '../../types/matrix/accountData';
import { IEmoji } from '../plugins/emoji';
import {
  useComputedPendingObservableResult,
  useObservableValuePromise,
} from './useObservableValue';
import { useClient } from './useClient';

export const useRecentEmoji = (limit?: number): PendingObservableResult<IEmoji[]> => {
  const ct = useClient();
  const recentEmojiObjResult = useObservableValuePromise(
    useMemo(
      () => ct.storage.accountData.observableRead.get(AccountDataType.ElementRecentEmoji),
      [ct]
    )
  );

  return useComputedPendingObservableResult(
    recentEmojiObjResult,
    useCallback(
      (recentEmojiObj) => (recentEmojiObj ? getRecentEmojis(recentEmojiObj.event, limit) : []),
      [limit]
    )
  );
};
