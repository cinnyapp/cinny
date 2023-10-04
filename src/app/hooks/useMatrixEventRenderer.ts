import { ReactNode } from 'react';
import { MatrixEvent } from 'matrix-js-sdk';
import { MessageEvent, StateEvent } from '../../types/matrix/room';

export type EventRenderer<T extends unknown[]> = (
  eventId: string,
  mEvent: MatrixEvent,
  ...args: T
) => ReactNode;

export type EventRendererOpts<T extends unknown[]> = {
  renderRoomMessage?: EventRenderer<T>;
  renderRoomEncrypted?: EventRenderer<T>;
  renderSticker?: EventRenderer<T>;
  renderRoomMember?: EventRenderer<T>;
  renderRoomName?: EventRenderer<T>;
  renderRoomTopic?: EventRenderer<T>;
  renderRoomAvatar?: EventRenderer<T>;
  renderStateEvent?: EventRenderer<T>;
  renderEvent?: EventRenderer<T>;
};

export type RenderMatrixEvent<T extends unknown[]> = (
  eventId: string,
  mEvent: MatrixEvent,
  ...args: T
) => ReactNode;

export const useMatrixEventRenderer =
  <T extends unknown[]>({
    renderRoomMessage,
    renderRoomEncrypted,
    renderSticker,
    renderRoomMember,
    renderRoomName,
    renderRoomTopic,
    renderRoomAvatar,
    renderStateEvent,
    renderEvent,
  }: EventRendererOpts<T>): RenderMatrixEvent<T> =>
  (eventId, mEvent, ...args) => {
    const eventType = mEvent.getWireType();

    if (eventType === MessageEvent.RoomMessage && renderRoomMessage) {
      return renderRoomMessage(eventId, mEvent, ...args);
    }

    if (eventType === MessageEvent.RoomMessageEncrypted && renderRoomEncrypted) {
      return renderRoomEncrypted(eventId, mEvent, ...args);
    }

    if (eventType === MessageEvent.Sticker && renderSticker) {
      return renderSticker(eventId, mEvent, ...args);
    }

    if (eventType === StateEvent.RoomMember && renderRoomMember) {
      return renderRoomMember(eventId, mEvent, ...args);
    }

    if (eventType === StateEvent.RoomName && renderRoomName) {
      return renderRoomName(eventId, mEvent, ...args);
    }

    if (eventType === StateEvent.RoomTopic && renderRoomTopic) {
      return renderRoomTopic(eventId, mEvent, ...args);
    }

    if (eventType === StateEvent.RoomAvatar && renderRoomAvatar) {
      return renderRoomAvatar(eventId, mEvent, ...args);
    }

    if (typeof mEvent.getStateKey() === 'string' && renderStateEvent) {
      return renderStateEvent(eventId, mEvent, ...args);
    }

    if (typeof mEvent.getStateKey() !== 'string' && renderEvent) {
      return renderEvent(eventId, mEvent, ...args);
    }
    return null;
  };
