/**
 * Room settings → "Media, files & links": every picture/video of the chat in a
 * grid (newest first, grouped by month, infinite scroll), plus the chat's
 * files and links. Tapping a tile opens the same full-screen viewer.
 */
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Box, Chip, Icon, IconButton, Icons, Scroll, Spinner, Text, color, config } from 'folds';
import { Room } from 'matrix-js-sdk';
import { Page, PageContent, PageHeader } from '../../components/page';
import { useRoom } from '../../hooks/useRoom';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { DownloadFile } from '../../components/message';
import { bytesToSize } from '../../utils/common';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { GalleryCategory, GalleryItem, GalleryWalker } from './galleryWalker';
import { getRoomWalker } from './roomWalker';
import { thumbnailUrl, useResolvedSrc } from './mediaSrc';
import { useOpenMediaViewer } from './state';
import { formatViewerDate } from './MediaViewer';

const monthLabel = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const senderName = (room: Room, userId: string) =>
  getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;

function useInView<T extends Element>(rootMargin = '200px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true);
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin]);
  return { ref, inView };
}

/** Calls `onVisible` whenever the sentinel scrolls into view. */
function LoadMore({
  onVisible,
  busy,
  done,
}: {
  onVisible: () => void;
  busy: boolean;
  done: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onVisible);
  cb.current = onVisible;
  useEffect(() => {
    const el = ref.current;
    if (!el || done) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) cb.current();
      },
      { rootMargin: '400px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [done, busy]);
  return (
    <div
      ref={ref}
      style={{ padding: config.space.S400, display: 'flex', justifyContent: 'center' }}
    >
      {busy && <Spinner variant="Secondary" size="200" />}
    </div>
  );
}

function GridTile({ item, onOpen }: { item: GalleryItem; onOpen: () => void }) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const { ref, inView } = useInView<HTMLButtonElement>();
  const { src } = useResolvedSrc(
    () => (inView ? thumbnailUrl(mx, item, 240, useAuthentication) : undefined),
    [inView, mx, item.eventId, useAuthentication]
  );
  const [failed, setFailed] = useState(false);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label={`${item.kind === 'video' ? 'Video' : 'Picture'}, ${formatViewerDate(item.ts)}`}
      data-media-tile={item.eventId}
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        maxWidth: '100%',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: config.radii.R300,
        backgroundColor: color.SurfaceVariant.Container,
        color: color.SurfaceVariant.OnContainer,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          draggable={false}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Icon size="300" src={item.kind === 'video' ? Icons.Vlc : Icons.Photo} />
      )}
      {item.kind === 'video' && (
        <span
          style={{
            position: 'absolute',
            right: 6,
            bottom: 6,
            color: 'white',
            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.9))',
            display: 'flex',
          }}
        >
          <Icon size="100" src={Icons.Play} filled />
        </span>
      )}
    </button>
  );
}

function useWalker(room: Room, category: GalleryCategory) {
  const mx = useMatrixClient();
  const { walker, key } = useMemo(
    () => getRoomWalker(mx, room, category, false, ':grid'),
    [mx, room, category]
  );
  const snap = useSyncExternalStore(walker.subscribe, walker.getSnapshot);
  useEffect(() => {
    walker.init();
  }, [walker]);
  return { walker, key, snap };
}

function Footer({ walker, empty }: { walker: GalleryWalker; empty: string }) {
  const snap = useSyncExternalStore(walker.subscribe, walker.getSnapshot);
  return (
    <>
      {snap.error && (
        <Text size="T300" style={{ color: color.Critical.Main }}>
          Could not load more: {snap.error}
        </Text>
      )}
      {snap.atStart && snap.items.length === 0 && !snap.error && (
        <Text size="T300" priority="300">
          {empty}
        </Text>
      )}
      <LoadMore
        onVisible={() => walker.loadOlder()}
        busy={!snap.initialized || snap.loadingOlder}
        done={snap.atStart || !!snap.error}
      />
      {snap.atStart && snap.items.length > 0 && (
        <Text size="T200" priority="300" align="Center">
          That is everything since the start of this chat.
        </Text>
      )}
    </>
  );
}

function MediaGrid({ room }: { room: Room }) {
  const { walker, key, snap } = useWalker(room, 'media');
  const open = useOpenMediaViewer();
  const groups = useMemo(() => {
    const out: { label: string; items: GalleryItem[] }[] = [];
    [...snap.items].reverse().forEach((it) => {
      const label = monthLabel(it.ts);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(it);
      else out.push({ label, items: [it] });
    });
    return out;
  }, [snap.items]);
  return (
    <Box direction="Column" gap="400">
      {groups.map((g) => (
        <Box key={g.label} direction="Column" gap="200">
          <Text size="L400">{g.label}</Text>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
              gap: config.space.S100,
            }}
          >
            {g.items.map((it) => (
              <GridTile
                key={it.eventId}
                item={it}
                onOpen={() =>
                  open({ mode: 'room', roomId: room.roomId, eventId: it.eventId, walkerKey: key })
                }
              />
            ))}
          </div>
        </Box>
      ))}
      <Footer walker={walker} empty="No pictures or videos in this chat yet." />
    </Box>
  );
}

function FileList({ room }: { room: Room }) {
  const { walker, snap } = useWalker(room, 'files');
  const items = useMemo(() => [...snap.items].reverse(), [snap.items]);
  return (
    <Box direction="Column" gap="200">
      {items.map((it) => (
        <Box
          key={it.eventId}
          alignItems="Center"
          gap="300"
          style={{
            padding: config.space.S200,
            borderRadius: config.radii.R300,
            backgroundColor: color.SurfaceVariant.Container,
          }}
          data-media-file={it.eventId}
        >
          <Icon size="200" src={it.kind === 'audio' ? Icons.VolumeHigh : Icons.File} />
          <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
            <Text size="T300" truncate>
              {it.filename || it.body || 'File'}
            </Text>
            <Text size="T200" priority="300" truncate>
              {[
                it.size ? bytesToSize(it.size) : undefined,
                senderName(room, it.sender),
                formatViewerDate(it.ts),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Box>
          {it.mxc && (
            <Box shrink="No">
              <DownloadFile
                body={it.filename || it.body || 'file'}
                mimeType={it.mimeType ?? 'application/octet-stream'}
                url={it.mxc}
                info={{ size: it.size, mimetype: it.mimeType } as any}
                encInfo={it.encInfo as any}
              />
            </Box>
          )}
        </Box>
      ))}
      <Footer walker={walker} empty="No files in this chat yet." />
    </Box>
  );
}

function LinkList({ room }: { room: Room }) {
  const { walker, snap } = useWalker(room, 'links');
  const rows = useMemo(
    () =>
      [...snap.items]
        .reverse()
        .flatMap((it) => (it.links ?? []).map((url) => ({ url, it, key: `${it.eventId}|${url}` }))),
    [snap.items]
  );
  return (
    <Box direction="Column" gap="200">
      {rows.map(({ url, it, key }) => {
        let host = url;
        try {
          host = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          // keep the raw url
        }
        return (
          <Box
            key={key}
            direction="Column"
            style={{
              padding: config.space.S200,
              borderRadius: config.radii.R300,
              backgroundColor: color.SurfaceVariant.Container,
              minWidth: 0,
            }}
          >
            <Text size="T300" truncate>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {host}
              </a>
            </Text>
            <Text size="T200" priority="300" truncate title={url}>
              {url}
            </Text>
            <Text size="T200" priority="300" truncate>
              {senderName(room, it.sender)} · {formatViewerDate(it.ts)}
            </Text>
          </Box>
        );
      })}
      <Footer walker={walker} empty="No links in this chat yet." />
    </Box>
  );
}

type Tab = 'media' | 'files' | 'links';

export function RoomMediaPage({ requestClose }: { requestClose: () => void }) {
  const room = useRoom();
  const [tab, setTab] = useState<Tab>('media');
  const tabs: { id: Tab; label: string; icon: typeof Icons.Photo }[] = [
    { id: 'media', label: 'Media', icon: Icons.Photo },
    { id: 'files', label: 'Files', icon: Icons.File },
    { id: 'links', label: 'Links', icon: Icons.Link },
  ];
  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Media, files & links
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface" aria-label="Close">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="400">
              <Box gap="200" role="tablist" wrap="Wrap">
                {tabs.map((t) => (
                  <Chip
                    key={t.id}
                    role="tab"
                    aria-selected={tab === t.id}
                    variant={tab === t.id ? 'Primary' : 'Secondary'}
                    radii="Pill"
                    size="400"
                    outlined={tab !== t.id}
                    before={<Icon size="50" src={t.icon} />}
                    onClick={() => setTab(t.id)}
                    data-media-tab={t.id}
                  >
                    <Text size="B300">{t.label}</Text>
                  </Chip>
                ))}
              </Box>
              {tab === 'media' && <MediaGrid room={room} />}
              {tab === 'files' && <FileList room={room} />}
              {tab === 'links' && <LinkList room={room} />}
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
