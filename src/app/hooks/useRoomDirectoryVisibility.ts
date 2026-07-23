import {
  getListRoom,
  GetListRoomOK,
  putListRoom,
} from 'neurone/lib/api/matrix/client/v3/directory';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { useCallback, useEffect } from 'react';
import { useAsyncCallback } from './useAsyncCallback';
import { useClient } from './useClient';

export const useRoomDirectoryVisibility = (roomId: string) => {
  const ct = useClient();

  const [visibilityState, loadVisibility] = useAsyncCallback(
    useCallback(async () => {
      const resp = await ct.requestAuthJSON(getListRoom({ pathParams: { roomId } }));
      const [err, result] = await parseMatrixResp<GetListRoomOK>(resp);
      if (err) throw new Error(err.data.error ?? err.data.errcode);
      return result?.visibility === 'public';
    }, [ct, roomId])
  );

  useEffect(() => {
    loadVisibility();
  }, [loadVisibility]);

  const setVisibility = useCallback(
    async (visible: boolean) => {
      const resp = await ct.requestAuthJSON(
        putListRoom({
          pathParams: { roomId },
          body: { visibility: visible ? 'public' : 'private' },
        })
      );
      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(err.data.error ?? err.data.errcode);
      await loadVisibility();
    },
    [ct, roomId, loadVisibility]
  );

  return {
    visibilityState,
    setVisibility,
  };
};
