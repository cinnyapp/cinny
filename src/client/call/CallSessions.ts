import { Disposable, Disposer } from 'neurone/lib/utils/disposable';
import { ObservableValue } from 'neurone/lib/utils/observable';
import { Storage } from '../storage';
import { JoinRoomStateObject, JoinRoomStickyObject } from '../storage/collections';
import { CallSession } from './CallSession';
import { RTC_MEMBER_EVENT_TYPE, RTC_SLOT_EVENT_TYPE } from './rtcMember';
import { SyncValue } from '../sync';
import { rContent, rEvent } from '../reader';

export class CallSessions implements Disposable {
  private readonly storage: Storage;

  private readonly syncObservable: ObservableValue<SyncValue>;

  private readonly disposer = new Disposer();

  private readonly roomToSessions = new Map<string, CallSession>();

  constructor(storage: Storage, syncObservable: ObservableValue<SyncValue>) {
    this.storage = storage;
    this.syncObservable = syncObservable;

    this.start();
  }

  private async start() {
    const callMemberStateEvents = await this.storage.joinRoomState.observableRead.queryIndex(
      'type',
      'org.matrix.msc3401.call.member'
    );

    const rtcSlotEvents = await this.storage.joinRoomState.observableRead.queryIndex(
      'type',
      RTC_SLOT_EVENT_TYPE
    );

    const rtcMemberEvents = await this.storage.joinRoomSticky.observableRead.queryIndex(
      'type',
      RTC_MEMBER_EVENT_TYPE
    );

    // Slots first, so sessions know whether the slot is open before members arrive.
    this.handleRtcSlots(rtcSlotEvents.read);
    this.handleCallMembers(callMemberStateEvents.read);
    this.handleRtcMembers(rtcMemberEvents.read);

    this.disposer.collect(
      callMemberStateEvents.subscribe((objs) => this.handleCallMembers(objs)),
      callMemberStateEvents,
      rtcSlotEvents.subscribe((objs) => this.handleRtcSlots(objs)),
      rtcSlotEvents,
      rtcMemberEvents.subscribe((objs) => this.handleRtcMembers(objs)),
      rtcMemberEvents,
      this.syncObservable.subscribe((value) => this.handleSync(value))
    );
  }

  private handleSync(syncValue: SyncValue): void {
    const [, result] = syncValue ?? [];
    Object.keys(result?.rooms?.join ?? {}).forEach((roomId) => {
      const joinRoom = result?.rooms?.join?.[roomId];
      if (!joinRoom) return;
      const redactionEvents = joinRoom.timeline?.events.filter(
        (event) => event.type === 'm.room.redaction'
      );
      if (!redactionEvents || redactionEvents.length === 0) return;

      const eventIds = redactionEvents.map(
        (event) => rEvent.redacts(event) ?? rContent.redacts(event.content)
      );

      const session = this.roomToSessions.get(roomId);
      session?.handleRedactions(eventIds.filter((id) => typeof id === 'string'));
    });
  }

  /**
   * Groups events per room and hands them to the matching session.
   * Rooms that already have a session but no events are given an empty list,
   * otherwise their members would never clear.
   */
  private dispatch<T extends { roomId: string }>(
    objs: T[],
    apply: (session: CallSession, events: T[]) => Promise<void>
  ) {
    const byRoom = new Map<string, T[]>();
    objs.forEach((obj) => {
      const list = byRoom.get(obj.roomId) ?? [];
      list.push(obj);
      byRoom.set(obj.roomId, list);
    });

    // Existing sessions whose room has NO events in this update get an empty list
    this.roomToSessions.forEach((_, roomId) => {
      if (!byRoom.has(roomId)) byRoom.set(roomId, []);
    });

    byRoom.forEach((events, roomId) => {
      apply(this.getSession(roomId), events).catch((e) => console.error(e));
    });
  }

  private handleCallMembers(objs: JoinRoomStateObject[]): void {
    this.dispatch(objs, (s, e) => s.handleCallMemberChange(e));
  }

  private handleRtcSlots(objs: JoinRoomStateObject[]): void {
    this.dispatch(objs, (s, e) => s.handleRtcSlotChange(e));
  }

  private handleRtcMembers(objs: JoinRoomStickyObject[]): void {
    this.dispatch(objs, (s, e) => s.handleRtcMemberChange(e));
  }

  public getSession(roomId: string): CallSession {
    let session = this.roomToSessions.get(roomId);
    if (!session) {
      session = new CallSession(roomId, this.storage);
      this.roomToSessions.set(roomId, session);
    }
    return session;
  }

  dispose(): void {
    this.roomToSessions.forEach((s) => s.dispose());
    this.roomToSessions.clear();
    this.disposer.run();
  }
}
