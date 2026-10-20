/* Bundled by scripts/test-media-errors.mjs (esbuild) - not part of the app. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { EventEmitter } from 'events';
import { MatrixClientProvider } from '../../src/app/hooks/useMatrixClient';
import { useCallSession } from '../../src/app/hooks/useCall';

export { act };
export * from '../../src/app/utils/mediaAuth';
export * from '../../src/app/utils/previewUrls';
export * from '../../src/app/utils/urlPreviewCache';
export * from '../../src/app/utils/authMetadataProbe';
export * from '../../src/app/utils/callSessionSubscription';
export { URL_REG } from '../../src/app/utils/regex';

/** A stand-in client: just enough of `mx.matrixRTC` for useCallSession. */
export const makeFakeClient = () => {
  const matrixRTC = new EventEmitter() as EventEmitter & {
    getRoomSession: (room: { roomId: string }) => { roomId: string; n: number };
  };
  const counter: Record<string, number> = {};
  matrixRTC.getRoomSession = (room) => {
    counter[room.roomId] = (counter[room.roomId] ?? 0) + 1;
    return { roomId: room.roomId, n: counter[room.roomId] };
  };
  return { matrixRTC } as unknown as { matrixRTC: typeof matrixRTC };
};

function Row({ room, seen }: { room: { roomId: string }; seen: Record<string, number> }) {
  const session = useCallSession(room as never) as unknown as { n: number };
  // eslint-disable-next-line no-param-reassign
  seen[room.roomId] = session.n;
  return <div data-room={room.roomId}>{session.n}</div>;
}

export const mountRows = (mx: unknown, count: number) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const seen: Record<string, number> = {};
  const rooms = Array.from({ length: count }, (_, i) => ({ roomId: `!r${i}:test` }));
  act(() => {
    root.render(
      <MatrixClientProvider value={mx as never}>
        {rooms.map((room) => (
          <Row key={room.roomId} room={room} seen={seen} />
        ))}
      </MatrixClientProvider>
    );
  });
  return {
    seen,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};
