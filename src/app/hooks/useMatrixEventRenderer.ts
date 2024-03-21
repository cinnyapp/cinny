import { ReactNode } from 'react';
import { MessageEvent, StateEvent } from '../../types/matrix/room';

export type EventRenderer<T extends unknown[]> = (...args: T) => ReactNode;

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
  eventType: string,
  isStateEvent: boolean,
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
  (eventType, isStateEvent, ...args) => {
    if (eventType === MessageEvent.RoomMessage && renderRoomMessage) {
      return renderRoomMessage(...args);
    }

    if (eventType === MessageEvent.RoomMessageEncrypted && renderRoomEncrypted) {
      return renderRoomEncrypted(...args);
    }

    if (eventType === MessageEvent.Sticker && renderSticker) {
      return renderSticker(...args);
    }

    if (eventType === StateEvent.RoomMember && renderRoomMember) {
      return renderRoomMember(...args);
    }

    if (eventType === StateEvent.RoomName && renderRoomName) {
      return renderRoomName(...args);
    }

    if (eventType === StateEvent.RoomTopic && renderRoomTopic) {
      return renderRoomTopic(...args);
    }

    if (eventType === StateEvent.RoomAvatar && renderRoomAvatar) {
      return renderRoomAvatar(...args);
    }

    if (isStateEvent && renderStateEvent) {
      return renderStateEvent(...args);
    }

    if (!isStateEvent && renderEvent) {
      return renderEvent(...args);
    }
    return null;
  };
