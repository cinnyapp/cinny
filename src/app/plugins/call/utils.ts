import {
  type Capability,
  EventDirection,
  MatrixCapabilities,
  WidgetEventCapability,
} from 'matrix-widget-api';
import { EventType } from 'matrix-js-sdk';

export function getCallCapabilities(
  roomId: string,
  userId: string,
  deviceId: string
): Set<Capability> {
  const capabilities: Set<Capability> = new Set();

  capabilities.add(MatrixCapabilities.Screenshots);
  capabilities.add(MatrixCapabilities.AlwaysOnScreen);
  capabilities.add(MatrixCapabilities.MSC3846TurnServers);
  capabilities.add(MatrixCapabilities.MSC4157SendDelayedEvent);
  capabilities.add(MatrixCapabilities.MSC4157UpdateDelayedEvent);
  capabilities.add(`org.matrix.msc2762.timeline:${roomId}`);
  capabilities.add(`org.matrix.msc2762.state:${roomId}`);

  capabilities.add(
    WidgetEventCapability.forStateEvent(EventDirection.Receive, EventType.RoomMember).raw
  );
  capabilities.add(
    WidgetEventCapability.forStateEvent(EventDirection.Receive, 'org.matrix.msc3401.call').raw
  );
  capabilities.add(
    WidgetEventCapability.forStateEvent(EventDirection.Receive, EventType.RoomEncryption).raw
  );
  capabilities.add(
    WidgetEventCapability.forStateEvent(EventDirection.Receive, EventType.RoomName).raw
  );

  capabilities.add(
    WidgetEventCapability.forStateEvent(
      EventDirection.Send,
      'org.matrix.msc3401.call.member',
      userId
    ).raw
  );
  capabilities.add(
    WidgetEventCapability.forStateEvent(
      EventDirection.Send,
      'org.matrix.msc3401.call.member',
      `_${userId}_${deviceId}_m.call`
    ).raw
  );
  capabilities.add(
    WidgetEventCapability.forStateEvent(
      EventDirection.Send,
      'org.matrix.msc3401.call.member',
      `${userId}_${deviceId}_m.call`
    ).raw
  );
  capabilities.add(
    WidgetEventCapability.forStateEvent(
      EventDirection.Send,
      'org.matrix.msc3401.call.member',
      `_${userId}_${deviceId}`
    ).raw
  );
  capabilities.add(
    WidgetEventCapability.forStateEvent(
      EventDirection.Send,
      'org.matrix.msc3401.call.member',
      `${userId}_${deviceId}`
    ).raw
  );

  capabilities.add(
    WidgetEventCapability.forStateEvent(EventDirection.Receive, 'org.matrix.msc3401.call.member')
      .raw
  );
  capabilities.add(
    WidgetEventCapability.forStateEvent(EventDirection.Receive, EventType.RoomCreate).raw
  );

  capabilities.add(
    WidgetEventCapability.forRoomEvent(
      EventDirection.Receive,
      'org.matrix.msc4075.rtc.notification'
    ).raw
  );

  [
    'io.element.call.encryption_keys',
    'org.matrix.rageshake_request',
    EventType.Reaction,
    EventType.RoomRedaction,
    'io.element.call.reaction',
    'org.matrix.msc4310.rtc.decline',
  ].forEach((type) => {
    capabilities.add(WidgetEventCapability.forRoomEvent(EventDirection.Send, type).raw);
    capabilities.add(WidgetEventCapability.forRoomEvent(EventDirection.Receive, type).raw);
  });

  [
    EventType.CallInvite,
    EventType.CallCandidates,
    EventType.CallAnswer,
    EventType.CallHangup,
    EventType.CallReject,
    EventType.CallSelectAnswer,
    EventType.CallNegotiate,
    EventType.CallSDPStreamMetadataChanged,
    EventType.CallSDPStreamMetadataChangedPrefix,
    EventType.CallReplaces,
    EventType.CallEncryptionKeysPrefix,
  ].forEach((type) => {
    capabilities.add(WidgetEventCapability.forToDeviceEvent(EventDirection.Send, type).raw);
    capabilities.add(WidgetEventCapability.forToDeviceEvent(EventDirection.Receive, type).raw);
  });

  return capabilities;
}
