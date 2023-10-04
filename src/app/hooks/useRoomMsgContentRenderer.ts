import { ReactNode } from 'react';
import { MatrixEvent, MsgType } from 'matrix-js-sdk';

export type MsgContentRenderer<T extends unknown[]> = (
  eventId: string,
  mEvent: MatrixEvent,
  ...args: T
) => ReactNode;

export type RoomMsgContentRendererOpts<T extends unknown[]> = {
  renderText?: MsgContentRenderer<T>;
  renderEmote?: MsgContentRenderer<T>;
  renderNotice?: MsgContentRenderer<T>;
  renderImage?: MsgContentRenderer<T>;
  renderVideo?: MsgContentRenderer<T>;
  renderAudio?: MsgContentRenderer<T>;
  renderFile?: MsgContentRenderer<T>;
  renderLocation?: MsgContentRenderer<T>;
  renderBadEncrypted?: MsgContentRenderer<T>;
  renderUnsupported?: MsgContentRenderer<T>;
  renderBrokenFallback?: MsgContentRenderer<T>;
};

export type RenderRoomMsgContent<T extends unknown[]> = (
  eventId: string,
  mEvent: MatrixEvent,
  ...args: T
) => ReactNode;

export const useRoomMsgContentRenderer =
  <T extends unknown[]>({
    renderText,
    renderEmote,
    renderNotice,
    renderImage,
    renderVideo,
    renderAudio,
    renderFile,
    renderLocation,
    renderBadEncrypted,
    renderUnsupported,
    renderBrokenFallback,
  }: RoomMsgContentRendererOpts<T>): RenderRoomMsgContent<T> =>
  (eventId, mEvent, ...args) => {
    const msgType = mEvent.getContent().msgtype;

    let node: ReactNode = null;

    if (msgType === MsgType.Text && renderText) node = renderText(eventId, mEvent, ...args);
    else if (msgType === MsgType.Emote && renderEmote) node = renderEmote(eventId, mEvent, ...args);
    else if (msgType === MsgType.Notice && renderNotice)
      node = renderNotice(eventId, mEvent, ...args);
    else if (msgType === MsgType.Image && renderImage) node = renderImage(eventId, mEvent, ...args);
    else if (msgType === MsgType.Video && renderVideo) node = renderVideo(eventId, mEvent, ...args);
    else if (msgType === MsgType.Audio && renderAudio) node = renderAudio(eventId, mEvent, ...args);
    else if (msgType === MsgType.File && renderFile) node = renderFile(eventId, mEvent, ...args);
    else if (msgType === MsgType.Location && renderLocation)
      node = renderLocation(eventId, mEvent, ...args);
    else if (msgType === 'm.bad.encrypted' && renderBadEncrypted)
      node = renderBadEncrypted(eventId, mEvent, ...args);
    else if (renderUnsupported) {
      node = renderUnsupported(eventId, mEvent, ...args);
    }

    if (!node && renderBrokenFallback) node = renderBrokenFallback(eventId, mEvent, ...args);

    return node;
  };
