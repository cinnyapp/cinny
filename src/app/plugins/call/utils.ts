import {
  type Capability,
  EventDirection,
  MatrixCapabilities,
  WidgetEventCapability,
} from 'matrix-widget-api';
import { CallEventType, MessageEvent, StateEventType } from '../../../types/matrix/room';

export function getCallCapabilities(
  roomId: string,
  userId: string,
  deviceId: string
): Set<Capability> {
  const capabilities: Set<Capability> = new Set();

  capabilities.add(MatrixCapabilities.Screenshots);
  capabilities.add(MatrixCapabilities.AlwaysOnScreen);
  capabilities.add(MatrixCapabilities.MSC4039UploadFile);
  capabilities.add(MatrixCapabilities.MSC4039DownloadFile);
  capabilities.add(MatrixCapabilities.MSC3846TurnServers);
  capabilities.add(MatrixCapabilities.MSC4157SendDelayedEvent);
  capabilities.add(MatrixCapabilities.MSC4157UpdateDelayedEvent);
  capabilities.add(MatrixCapabilities.MSC4407SendStickyEvent);
  capabilities.add(MatrixCapabilities.MSC4407ReceiveStickyEvent);
  capabilities.add(MatrixCapabilities.MSC4515RtcTransports);
  capabilities.add(`org.matrix.msc2762.timeline:${roomId}`);
  capabilities.add(`org.matrix.msc2762.state:${roomId}`);

  capabilities.add(
    WidgetEventCapability.forStateEvent(EventDirection.Receive, StateEventType.RoomMember).raw
  );
  capabilities.add(
    WidgetEventCapability.forStateEvent(EventDirection.Receive, 'org.matrix.msc3401.call').raw
  );
  capabilities.add(
    WidgetEventCapability.forStateEvent(EventDirection.Receive, StateEventType.RoomEncryption).raw
  );
  capabilities.add(
    WidgetEventCapability.forStateEvent(EventDirection.Receive, StateEventType.RoomName).raw
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
    WidgetEventCapability.forStateEvent(EventDirection.Receive, StateEventType.RoomCreate).raw
  );

  [
    'io.element.call.encryption_keys',
    'org.matrix.rageshake_request',
    MessageEvent.Reaction,
    MessageEvent.RoomRedaction,
    'io.element.call.reaction',
    'org.matrix.msc4075.rtc.notification',
    'org.matrix.msc4310.rtc.decline',
    'org.matrix.msc4143.rtc.member',
    'org.matrix.msc4075.call.notify',
  ].forEach((type) => {
    capabilities.add(WidgetEventCapability.forRoomEvent(EventDirection.Send, type).raw);
    capabilities.add(WidgetEventCapability.forRoomEvent(EventDirection.Receive, type).raw);
  });

  [
    CallEventType.CallInvite,
    CallEventType.CallCandidates,
    CallEventType.CallAnswer,
    CallEventType.CallHangup,
    CallEventType.CallReject,
    CallEventType.CallSelectAnswer,
    CallEventType.CallNegotiate,
    CallEventType.CallSDPStreamMetadataChanged,
    CallEventType.CallSDPStreamMetadataChangedPrefix,
    CallEventType.CallReplaces,
    CallEventType.CallEncryptionKeysPrefix,
  ].forEach((type) => {
    capabilities.add(WidgetEventCapability.forToDeviceEvent(EventDirection.Send, type).raw);
    capabilities.add(WidgetEventCapability.forToDeviceEvent(EventDirection.Receive, type).raw);
  });

  return capabilities;
}
