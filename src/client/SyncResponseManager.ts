import { GetSyncOK, JoinRoom } from 'neurone/lib/api/matrix/client/v3/sync';
import { ObservableValue } from 'neurone/lib/utils/observable';
import { EncryptionSyncChanges } from 'neurone/lib/crypto/machine';
import { Disposable, Disposer } from 'neurone/lib/utils/disposable';
import { roomState } from 'neurone/lib/utils/sync/v3/join';
import { ObjectReader } from 'neurone/lib/utils';
import to from 'await-to-js';
import { ClientContext } from './context';
import { writeSync } from './syncWriter';
import { sessionValue } from './storage/collections';
import { syncLatestEvent } from './syncLatestEvent';
import { SyncValue } from './sync';

export class SyncResponseManager implements Disposable {
  private firstSync = true;

  private readonly ct: ClientContext;

  private readonly syncTokenObservable: ObservableValue<string | undefined>;

  private readonly onWriteComplete: () => void;

  private readonly onSyncToken: (token: string) => void;

  private readonly disposer = new Disposer();

  constructor(
    ct: ClientContext,
    syncTokenObservable: ObservableValue<string | undefined>,
    onWriteComplete: () => void,
    onSyncToken: (token: string) => void
  ) {
    this.ct = ct;
    this.syncTokenObservable = syncTokenObservable;
    this.onWriteComplete = onWriteComplete;
    this.onSyncToken = onSyncToken;

    this.disposer.collect(
      this.syncTokenObservable.subscribe(this.handleSyncToken.bind(this)),
      this.ct.sync.observable.subscribe(this.handleSync.bind(this))
    );
  }

  private handleSyncToken = (sinceToken?: string) => {
    if (sinceToken === undefined) return;
    if (this.firstSync) {
      // We will call onSyncToken explicitly
      // after syncLatestEvent completes to prevent race
      return;
    }
    this.onSyncToken(sinceToken);
  };

  private async handleSync(syncValue: SyncValue) {
    const [, response] = syncValue ?? [];
    if (!response) return;

    // TODO: make it error safe or we can miss saving since token.
    // resulting in staled sync loop
    await this.beforeWrite(response);
    await writeSync(this.ct, response);
    await this.afterWrite(response.next_batch);
  }

  private async beforeWrite(data: GetSyncOK) {
    const encryptionChanges: EncryptionSyncChanges = {
      toDeviceEvents: data.to_device?.events,
      deviceLists: data.device_lists,
      oneTimeKeysCounts: data.device_one_time_keys_count,
      unusedFallbackKeys: data.device_unused_fallback_key_types,
    };

    await this.ct.machine.syncChanges.receive(encryptionChanges);
    // TODO: room key bundle detection from to device events;

    const encryptedRooms = this.filterEncryptedRoomResponse(data.rooms?.join ?? {});
    const users = this.filterUsersToTrack(encryptedRooms);
    await this.ct.machine.userTracker.track(users);

    await this.ct.machine.outgoingRequests.processAll();
  }

  private async afterWrite(nextBatch: string) {
    this.onWriteComplete();

    await this.ct.machine.outgoingRequests.processAll();

    const currentSyncToken = this.syncTokenObservable.read;
    this.ct.storage.sessionValue.write.put({
      id: sessionValue.syncToken.id,
      value: nextBatch,
    });

    if (this.firstSync) {
      const [err] = await to(syncLatestEvent(this.ct, currentSyncToken));
      if (err) console.error(err);
      this.firstSync = false;
      this.onSyncToken(nextBatch);
    }
  }

  private filterEncryptedRoomResponse(join: Record<string, JoinRoom>): Array<[string, JoinRoom]> {
    const rooms = Object.entries(join).filter(([roomId, room]) => {
      const encrypted = roomState(room).some((event) => event.type === 'm.room.encryption');

      return encrypted || this.ct.encryptedRooms.read.has(roomId);
    });

    return rooms;
  }

  private filterUsersToTrack(rooms: Array<[string, JoinRoom]>): string[] {
    const userIds = new Set<string>();

    rooms.forEach(([roomId, room]) => {
      roomState(room)
        .filter((event) => event.type === 'm.room.member')
        .forEach((event) => {
          const membership = ObjectReader.string(event.content, 'membership');

          const encryptForInvited = this.ct.roomToHistoryVisibility.read.get(roomId) !== 'joined';

          if (membership === 'join' || (membership === 'invite' && encryptForInvited)) {
            userIds.add(event.state_key);
          }
        });
    });

    return Array.from(userIds);
  }

  dispose(): void {
    this.disposer.run();
  }
}
