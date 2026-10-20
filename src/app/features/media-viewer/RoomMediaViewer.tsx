import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { GalleryItem } from './galleryWalker';
import { getRoomWalker, itemFromLocalEvent, peekRoomWalker } from './roomWalker';
import { formatViewerDate, MediaViewer, useStableIndex, ViewerItem } from './MediaViewer';
import * as css from './MediaViewer.css';

export const toViewerItem = (room: Room, it: GalleryItem): ViewerItem => {
  const name = getMemberDisplayName(room, it.sender) ?? getMxIdLocalPart(it.sender) ?? it.sender;
  const caption = it.filename && it.body && it.body !== it.filename ? it.body : undefined;
  return {
    ...it,
    title: name,
    subtitle: formatViewerDate(it.ts),
    caption,
    link: `https://matrix.to/#/${encodeURIComponent(room.roomId)}/${encodeURIComponent(
      it.eventId
    )}`,
  };
};

type RoomMediaViewerProps = {
  room: Room;
  eventId: string;
  walkerKey?: string;
  onClose: () => void;
};

/** "All pictures and videos in this chat", opened on the one that was tapped. */
export function RoomMediaViewer({ room, eventId, walkerKey, onClose }: RoomMediaViewerProps) {
  const mx = useMatrixClient();
  const [includeStickers, setIncludeStickers] = useState(false);

  const walker = useMemo(() => {
    if (walkerKey && !includeStickers) {
      const w = peekRoomWalker(walkerKey);
      if (w && w.has(eventId)) return w;
    }
    return getRoomWalker(mx, room, 'media', includeStickers, '', eventId).walker;
    // the anchor only matters for the first walker of a given kind
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mx, room, includeStickers, walkerKey]);

  const snap = useSyncExternalStore(walker.subscribe, walker.getSnapshot);

  const { index, setIndex, currentId, setCurrentId } = useStableIndex(snap.items, eventId);
  const lastTs = useRef<number>();
  if (index >= 0) lastTs.current = snap.items[index]?.ts;

  useEffect(() => {
    const anchor = currentId ?? eventId;
    if (!walker.has(anchor)) {
      const local = itemFromLocalEvent(room, anchor, includeStickers);
      if (local) walker.seed(local);
    }
    walker.init(anchor).then(() => walker.refreshNewest());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walker]);

  // The current item vanished (stickers switched off): jump to the nearest one.
  useEffect(() => {
    if (index !== -1 || !snap.initialized || snap.items.length === 0) return;
    const ts = lastTs.current;
    if (ts === undefined) {
      setCurrentId(snap.items[snap.items.length - 1].eventId);
      return;
    }
    let best = snap.items[0];
    snap.items.forEach((it) => {
      if (Math.abs(it.ts - ts) < Math.abs(best.ts - ts)) best = it;
    });
    setCurrentId(best.eventId);
  }, [index, snap.initialized, snap.items, setCurrentId]);

  const items = useMemo(() => snap.items.map((it) => toViewerItem(room, it)), [room, snap.items]);

  const onNearEdge = useMemo(() => (i: number) => walker.ensureAround(i, 4), [walker]);

  let banner: string | undefined;
  if (snap.error) banner = `Could not load more pictures (${snap.error}).`;

  return (
    <MediaViewer
      items={index >= 0 ? items : []}
      index={Math.max(0, index)}
      onIndexChange={setIndex}
      onClose={onClose}
      onNearEdge={onNearEdge}
      moreBefore={!snap.atStart}
      moreAfter={!snap.atEnd}
      loading={!snap.initialized || snap.loadingOlder || snap.loadingNewer}
      label="Pictures and videos in this chat"
      banner={banner}
      emptyText="No pictures or videos found in this chat."
      toolbarExtra={
        <button
          type="button"
          className={`${css.Chip} ${css.HideOnNarrow}`}
          aria-pressed={includeStickers}
          onClick={() => setIncludeStickers((v) => !v)}
          title="Include stickers"
          data-media-stickers
        >
          Stickers
        </button>
      }
    />
  );
}
