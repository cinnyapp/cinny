import { useCallback, useMemo } from 'react';
import { getEvent, GetEventOK } from 'neurone/lib/api/matrix/client/v3/rooms';
import { useQuery } from '@tanstack/react-query';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { ClientEvent, MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { useClient } from './useClient';

const useFetchEvent = (roomId: string, eventId: string) => {
  const ct = useClient();

  const fetchEventCallback = useCallback(async (): Promise<ClientEvent> => {
    const resp = await ct.requestAuthJSON(getEvent({ pathParams: { roomId, eventId } }));

    const [err, result] = await parseMatrixResp<GetEventOK>(resp);
    if (err) {
      throw new Error(printMatrixError(err));
    }

    return result;
  }, [ct, roomId, eventId]);

  return fetchEventCallback;
};

/**
 *
 * @param room
 * @param eventId
 * @returns `MessageEvent`, `undefined` means loading, `null` means failure
 */
export const useRoomEvent = (
  roomId: string,
  eventId: string,
  getLocally?: () => MessageEventWithoutRoomId | undefined
) => {
  const event = useMemo(() => {
    if (getLocally) return getLocally();
    return undefined;
  }, [getLocally]);

  const fetchEvent = useFetchEvent(roomId, eventId);

  const { data, error } = useQuery({
    enabled: event === undefined,
    queryKey: [roomId, eventId],
    queryFn: fetchEvent,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000, // 1hour
  });

  if (event) return event;
  if (data) return data;
  if (error) return null;

  return undefined;
};
