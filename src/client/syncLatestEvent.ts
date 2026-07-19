import { getSync, GetSyncOK } from 'neurone/lib/api/matrix/client/v3/sync';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { getLatestEventSyncFilter } from './filter';
import { writeJoinRoomLatestEvent } from './syncWriter/utils';
import { ClientContext } from './context';

export const syncLatestEvent = async (ct: ClientContext, since?: string) => {
  const resp = await ct.requestAuthJSON(
    getSync({
      searchParams: {
        filter: JSON.stringify(getLatestEventSyncFilter()),
        since,
      },
    })
  );
  const [error, syncData] = await parseMatrixResp<GetSyncOK>(resp);
  if (error) {
    console.error(printMatrixError(error));
    return;
  }
  const { join } = syncData.rooms ?? {};
  if (join) {
    const joinRooms = Object.keys(join);

    await writeJoinRoomLatestEvent(ct, joinRooms, join);
  }
};
