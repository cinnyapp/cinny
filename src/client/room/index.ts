import { ObservableValue } from 'neurone/lib/utils/observable';
import { Disposer } from 'neurone/lib/utils/disposable';
import { JoinRoom } from 'neurone/lib/api/matrix/client/v3/sync';
import { MatrixRequest } from 'neurone/lib/matrix-request';
import { Timeline } from './Timeline';
import { SyncValue } from '../sync';

export * from './Timeline';
export * from './TimelineView';

export const createTimelines = (
  joinedRooms: ObservableValue<string[]>,
  syncObservable: ObservableValue<SyncValue>,
  request: MatrixRequest,
  disposer: Disposer
): ObservableValue<Map<string, Timeline>> => {
  const publishKey: string = crypto.randomUUID();

  const roomToTimeline = new ObservableValue<Map<string, Timeline>>(new Map(), publishKey);

  const initTimelineForRooms = (roomIds: string[]) => {
    const nextTimelines = new Map(roomToTimeline.read);
    roomIds.forEach((rId) => {
      if (nextTimelines.has(rId)) return;
      nextTimelines.set(rId, new Timeline(rId, publishKey, request));
    });
    roomToTimeline.publish(publishKey, nextTimelines);
  };

  const pushTimelines = (timelines: Timeline[]) => {
    if (timelines.length === 0) return;

    const nextTimelines = new Map(roomToTimeline.read);
    timelines.forEach((t) => {
      if (nextTimelines.has(t.roomId)) return;
      nextTimelines.set(t.roomId, t);
    });
    roomToTimeline.publish(publishKey, nextTimelines);
  };

  const deleteTimelines = (roomIds: string[]) => {
    const nextTimelines = new Map(roomToTimeline.read);

    roomIds.forEach((rId) => {
      const timeline = nextTimelines.get(rId);
      if (timeline) {
        timeline.dispose?.();
        nextTimelines.delete(rId);
      }
    });

    roomToTimeline.publish(publishKey, nextTimelines);
  };

  initTimelineForRooms(joinedRooms.read);

  disposer.collect(
    joinedRooms.subscribe((rooms) => {
      initTimelineForRooms(rooms);
      const removedRooms = Array.from(roomToTimeline.read.keys()).filter((r) => !rooms.includes(r));
      deleteTimelines(removedRooms);
    })
  );

  const writeToTimelines = (join: Record<string, JoinRoom>) => {
    const joinRooms = Object.keys(join);
    const unknownTimeline: Timeline[] = [];

    joinRooms.forEach((roomId) => {
      const joinRoom = join[roomId];
      const timeline = roomToTimeline.read.get(roomId);
      if (!timeline) {
        const nT = new Timeline(roomId, publishKey, request);
        nT.onSync.publish(publishKey, joinRoom);
        unknownTimeline.push(nT);
        return;
      }
      timeline.onSync.publish(publishKey, joinRoom);
    });

    pushTimelines(unknownTimeline);
  };

  disposer.collect(
    syncObservable.subscribe((value) => {
      const [, result] = value ?? [];
      const join = result?.rooms?.join;

      if (join) {
        writeToTimelines(join);
      }
    })
  );

  return roomToTimeline;
};
