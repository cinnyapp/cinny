import { useCallback, useEffect, useMemo } from 'react';
import { ObjectReader } from 'neurone/lib/utils';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { getAliases, putStateEvent, GetAliasesOK } from 'neurone/lib/api/matrix/client/v3/rooms';
import { deleteRoom, putRoom } from 'neurone/lib/api/matrix/client/v3/directory';
import { AsyncState, useAsyncCallback } from './useAsyncCallback';
import { useAlive } from './useAlive';
import { useClient } from './useClient';
import { useObservableValue } from './useObservableValue';
import { RoomCanonicalAliasContent, StateEventType } from '../../types/matrix/room';

export const usePublishedAliases = (roomId: string): [string | undefined, string[]] => {
  const ct = useClient();
  const canonicalAliasEvents = useObservableValue(ct.state.join.canonicalAlias);
  const content = canonicalAliasEvents.find((state) => state.roomId === roomId)?.event.content;

  const alias = ObjectReader.string(content, 'alias');
  const altAliases = ObjectReader.array(content, 'alt_aliases')?.filter(
    (a): a is string => typeof a === 'string'
  );

  const publishedAliases = useMemo(() => {
    const aliases: string[] = [];
    if (alias) aliases.push(alias);
    if (altAliases) aliases.push(...altAliases);
    return aliases;
  }, [alias, altAliases]);

  return [alias, publishedAliases];
};

export const useSetMainAlias = (
  roomId: string,
  publishedAliases: string[]
): ((alias: string | undefined) => Promise<void>) => {
  const ct = useClient();

  const mainAlias = useCallback(
    async (alias: string | undefined) => {
      const content: RoomCanonicalAliasContent = {
        alias,
        alt_aliases: publishedAliases.filter((a) => a !== alias),
      };

      const resp = await ct.requestAuthJSON(
        putStateEvent({
          pathParams: { roomId, eventType: StateEventType.RoomCanonicalAlias, stateKey: '' },
          body: content,
        })
      );
      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(err.data.error ?? err.data.errcode);
    },
    [ct, roomId, publishedAliases]
  );

  return mainAlias;
};

export const usePublishUnpublishAliases = (
  roomId: string,
  publishedAliases: string[],
  canonicalAlias?: string
): {
  publishAliases: (aliases: string[]) => Promise<void>;
  unpublishAliases: (aliases: string[]) => Promise<void>;
} => {
  const ct = useClient();

  const publishAliases = useCallback(
    async (aliases: string[]) => {
      const altAliases = publishedAliases.filter((a) => a !== canonicalAlias);

      aliases.forEach((alias) => {
        if (!altAliases.includes(alias)) {
          altAliases.push(alias);
        }
      });

      const content: RoomCanonicalAliasContent = {
        alias: canonicalAlias,
        alt_aliases: altAliases,
      };

      const resp = await ct.requestAuthJSON(
        putStateEvent({
          pathParams: { roomId, eventType: StateEventType.RoomCanonicalAlias, stateKey: '' },
          body: content,
        })
      );
      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(err.data.error ?? err.data.errcode);
    },
    [ct, roomId, publishedAliases, canonicalAlias]
  );

  const unpublishAliases = useCallback(
    async (aliases: string[]) => {
      const altAliases: string[] = publishedAliases.filter((alias) => !aliases.includes(alias));

      const content: RoomCanonicalAliasContent = {
        alias: canonicalAlias,
        alt_aliases: altAliases,
      };

      const resp = await ct.requestAuthJSON(
        putStateEvent({
          pathParams: { roomId, eventType: StateEventType.RoomCanonicalAlias, stateKey: '' },
          body: content,
        })
      );
      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(err.data.error ?? err.data.errcode);
    },
    [ct, roomId, publishedAliases, canonicalAlias]
  );

  return {
    publishAliases,
    unpublishAliases,
  };
};

export const useLocalAliases = (
  roomId: string
): {
  localAliasesState: AsyncState<string[], unknown>;
  addLocalAlias: (alias: string) => Promise<void>;
  removeLocalAlias: (alias: string) => Promise<void>;
} => {
  const ct = useClient();
  const alive = useAlive();

  const [aliasesState, loadAliases] = useAsyncCallback<string[], unknown, []>(
    useCallback(async () => {
      const resp = await ct.requestAuthJSON(getAliases({ pathParams: { roomId } }));
      const [err, result] = await parseMatrixResp<GetAliasesOK>(resp);
      if (err) throw new Error(err.data.error ?? err.data.errcode);
      return result.aliases;
    }, [ct, roomId])
  );

  useEffect(() => {
    loadAliases();
  }, [loadAliases]);

  const addLocalAlias = useCallback(
    async (alias: string) => {
      const resp = await ct.requestAuthJSON(
        putRoom({
          pathParams: { roomAlias: alias },
          body: { room_id: roomId },
        })
      );

      const [err] = await parseMatrixResp(resp);
      if (err) {
        if (err.status === 409) {
          throw new Error('Address is already in use!');
        }
        throw new Error(err.data.error ?? err.data.errcode);
      }

      if (alive()) await loadAliases();
    },
    [ct, roomId, loadAliases, alive]
  );

  const removeLocalAlias = useCallback(
    async (alias: string) => {
      const resp = await ct.requestAuthJSON(deleteRoom({ pathParams: { roomAlias: alias } }));

      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(err.data.error ?? err.data.errcode);

      if (alive()) await loadAliases();
    },
    [ct, loadAliases, alive]
  );

  return {
    localAliasesState: aliasesState,
    addLocalAlias,
    removeLocalAlias,
  };
};
