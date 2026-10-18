import { MatrixEndpoint } from 'neurone/lib/api/MatrixEndpoint';

export type UnstablePutDelayedEventOK = { delay_id: string };

export const unstablePutDelayedEvent: MatrixEndpoint<{
  pathParams: { roomId: string; eventType: string; txnId: string };
  body:
    | { delay_ms: number; state_key?: string; content: object }
    | { delay_ms: number; 'org.matrix.msc4354.sticky_duration_ms': number; content: object };
}> = ({ pathParams, body }) => ({
  method: 'PUT',
  path: `/_matrix/client/unstable/org.matrix.msc4140/rooms/${encodeURIComponent(
    pathParams.roomId
  )}/delayed_event/${encodeURIComponent(pathParams.eventType)}/${encodeURIComponent(
    pathParams.txnId
  )}`,
  requireAuthentication: true,
  rateLimited: true,
  body: JSON.stringify(body),
});

export const unstablePostDelayedEvents: MatrixEndpoint<{
  pathParams: { delayId: string; action: 'send' | 'cancel' | 'restart' };
}> = ({ pathParams }) => ({
  method: 'POST',
  path: `/_matrix/client/unstable/org.matrix.msc4140/delayed_events/${encodeURIComponent(
    pathParams.delayId
  )}/${encodeURIComponent(pathParams.action)}`,
  requireAuthentication: true,
  rateLimited: true,
});
