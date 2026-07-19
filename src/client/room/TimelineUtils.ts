import {
  getContext,
  GetContextOK,
  getEvent,
  GetEventOK,
} from 'neurone/lib/api/matrix/client/v3/rooms';
import { ClientEvent, MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { MatrixRequest, parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';

export class TimelineUtils {
  private roomId: string;

  private request: MatrixRequest;

  constructor(roomId: string, request: MatrixRequest) {
    this.roomId = roomId;
    this.request = request;
  }

  public async generatePaginationToken(
    events: MessageEventWithoutRoomId[],
    dir: 'b' | 'f'
  ): Promise<string | undefined> {
    const event: MessageEventWithoutRoomId | undefined =
      events[dir === 'b' ? 0 : events.length - 1];
    if (!event) return undefined;

    const ctxResp = await this.request(
      getContext({
        pathParams: {
          roomId: this.roomId,
          eventId: event.event_id,
        },
        searchParams: {
          limit: 0,
        },
      })
    );
    const [err, result] = await parseMatrixResp<GetContextOK>(ctxResp);
    if (err) {
      throw new Error(printMatrixError(err));
    }
    return dir === 'b' ? result.start : result.end;
  }

  public async getEvent(eventId: string): Promise<ClientEvent | undefined> {
    const resp = await this.request(
      getEvent({
        pathParams: { roomId: this.roomId, eventId },
      })
    );

    const [err, event] = await parseMatrixResp<GetEventOK>(resp);
    if (err) throw new Error(printMatrixError(err));
    return event;
  }
}
