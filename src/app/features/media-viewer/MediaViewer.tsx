/**
 * Full-screen picture / video viewer shared by the chat gallery and the
 * profile-picture history.
 *
 *  - ← / → buttons, keyboard arrows, swipe; swipe down or Esc / phone "back"
 *    closes (a history entry is pushed while open, so the back button closes
 *    the viewer instead of leaving the chat).
 *  - Wheel / pinch / double-tap zoom, drag to pan while zoomed.
 *  - Bottom filmstrip (virtualised), counter "12 / 87", sender + date.
 *  - Only the current item and its two neighbours are ever fetched full-size.
 */
import React, {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import FileSaver from 'file-saver';
import { Icon, Icons, Spinner } from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import FocusTrap from '../../components/focus-trap';
import { SafeBoundary } from '../../components/error-boundary';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { downloadMedia } from '../../utils/matrix';
import { GalleryItem } from './galleryWalker';
import {
  clearFullSizeCache,
  fullSizeUrl,
  preloadItem,
  thumbnailUrl,
  useMediaFallback,
  useResolvedSrc,
} from './mediaSrc';
import { describeMediaFailure } from '../../utils/mediaAuth';
import * as css from './MediaViewer.css';

export type ViewerItem = GalleryItem & {
  /** First line of the caption (the sender, or "Anna — profile picture"). */
  title: string;
  /** Second line (the date, or "Set 3 Mar 2026"). */
  subtitle?: string;
  /** Message text shown under the picture. */
  caption?: string;
  /** Link to the message, for Copy / Share. */
  link?: string;
};

export type MediaViewerProps = {
  items: ViewerItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Called with the current index so the owner can page in more items. */
  onNearEdge?: (index: number) => void;
  moreBefore?: boolean;
  moreAfter?: boolean;
  loading?: boolean;
  label: string;
  banner?: ReactNode;
  toolbarExtra?: ReactNode;
  roundThumbs?: boolean;
  /** Shown when the list is empty (still loading or nothing found). */
  emptyText?: string;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Transform = { z: number; x: number; y: number };
const IDENTITY: Transform = { z: 1, x: 0, y: 0 };

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
export const formatViewerDate = fmtDate;

const safeName = (item: ViewerItem) => {
  const n = item.filename || item.body;
  if (n && /\.[a-z0-9]{2,5}$/i.test(n)) return n;
  const ext = (item.mimeType?.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg').split(';')[0];
  return `${n || item.kind}-${item.eventId.slice(1, 9)}.${ext}`;
};

function useItemBlob() {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  return useCallback(
    async (item: ViewerItem): Promise<Blob> => {
      const v = fullSizeUrl(mx, item, useAuthentication);
      const url = typeof v === 'string' ? v : await v;
      if (!url) throw new Error('No media');
      if (url.startsWith('blob:')) return (await fetch(url)).blob();
      return downloadMedia(url);
    },
    [mx, useAuthentication]
  );
}

function ViewerThumb({
  item,
  active,
  round,
  style,
  onSelect,
}: {
  item: ViewerItem;
  active: boolean;
  round?: boolean;
  style: React.CSSProperties;
  onSelect: () => void;
}) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const resolved = useResolvedSrc(
    () => thumbnailUrl(mx, item, 96, useAuthentication),
    [mx, item.eventId, item.mxc, useAuthentication]
  );
  const { src, onError, failureKind } = useMediaFallback(resolved.src);
  const failed = !!failureKind;
  return (
    <button
      type="button"
      className={classNames(css.Thumb, round && css.ThumbRound, active && css.ThumbActive)}
      style={style}
      onClick={onSelect}
      aria-label={`${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}`}
      aria-current={active ? 'true' : undefined}
      data-media-thumb={item.eventId}
    >
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" draggable={false} onError={onError} />
      ) : (
        <Icon size="200" src={item.kind === 'video' ? Icons.Vlc : Icons.Photo} />
      )}
      {item.kind === 'video' && (
        <span className={css.ThumbBadge}>
          <Icon size="50" src={Icons.Play} filled />
        </span>
      )}
    </button>
  );
}

function Filmstrip({
  items,
  index,
  round,
  onSelect,
  onNearEdge,
}: {
  items: ViewerItem[];
  index: number;
  round?: boolean;
  onSelect: (i: number) => void;
  onNearEdge?: (i: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const SLOT = 62;
  const virtualizer = useVirtualizer({
    count: items.length,
    horizontal: true,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => SLOT,
    overscan: 8,
    paddingStart: 8,
    paddingEnd: 8,
  });
  const currentKey = items[index]?.eventId;

  useLayoutEffect(() => {
    if (index >= 0 && index < items.length) virtualizer.scrollToIndex(index, { align: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, items.length]);

  const virtualItems = virtualizer.getVirtualItems();
  const first = virtualItems[0]?.index;
  const last = virtualItems[virtualItems.length - 1]?.index;
  useEffect(() => {
    if (!onNearEdge || first === undefined || last === undefined) return;
    if (first <= 2) onNearEdge(0);
    if (last >= items.length - 3) onNearEdge(items.length - 1);
  }, [first, last, items.length, onNearEdge]);

  return (
    <div className={css.Filmstrip} ref={scrollRef} data-media-filmstrip>
      <div style={{ width: virtualizer.getTotalSize(), height: '100%', position: 'relative' }}>
        {virtualItems.map((v) => {
          const item = items[v.index];
          return (
            <ViewerThumb
              key={item.eventId}
              item={item}
              round={round}
              active={v.index === index}
              style={{ left: v.start + 3 }}
              onSelect={() => onSelect(v.index)}
            />
          );
        })}
      </div>
    </div>
  );
}

function Slide({
  item,
  transform,
  dragX,
  animate,
  onLoaded,
}: {
  item: ViewerItem;
  transform: Transform;
  dragX: number;
  animate: boolean;
  onLoaded: (w: number, h: number) => void;
}) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const resolved = useResolvedSrc(
    () => fullSizeUrl(mx, item, useAuthentication),
    [mx, item.eventId, item.mxc, useAuthentication]
  );
  const thumb = useResolvedSrc(
    () => thumbnailUrl(mx, item, 320, useAuthentication),
    [mx, item.eventId, item.mxc, useAuthentication]
  );
  const media = useMediaFallback(resolved.src);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setLoaded(false);
  }, [item.eventId, item.mxc]);

  const failureKind = media.failureKind ?? (resolved.error ? resolved.failureKind : undefined);
  const broken = !!failureKind || !!resolved.error;
  const slideStyle: React.CSSProperties = {
    transform: dragX ? `translateX(${dragX}px)` : undefined,
    transition: animate ? 'transform 180ms ease-out' : undefined,
  };
  const mediaStyle: React.CSSProperties = {
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.z})`,
    transition: animate ? 'transform 180ms ease-out' : undefined,
  };

  if (broken) {
    const when = item.subtitle || (item.ts ? fmtDate(item.ts) : '');
    return (
      <div className={css.Slide} style={slideStyle}>
        <div className={css.Placeholder} data-media-placeholder>
          <Icon size="600" src={item.kind === 'video' ? Icons.Vlc : Icons.Photo} />
          <div className={css.PlaceholderTitle}>
            {item.kind === 'video'
              ? 'This video is not available'
              : 'This picture is not available'}
          </div>
          <div>
            {describeMediaFailure(
              failureKind ?? 'network',
              item.kind === 'video' ? 'video' : 'picture'
            )}
            {when ? ` ${when}.` : ''}
          </div>
          <button
            type="button"
            className={css.Chip}
            onClick={() => {
              media.reset();
              setAttempt((a) => a + 1);
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={css.Slide} style={slideStyle}>
      {!loaded && thumb.src && item.kind !== 'video' && (
        <img
          className={css.Media}
          src={thumb.src}
          alt=""
          draggable={false}
          style={{ ...mediaStyle, position: 'absolute', filter: 'blur(6px)', opacity: 0.7 }}
          width={item.width}
          height={item.height}
        />
      )}
      {media.src && item.kind === 'video' && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          key={`${item.eventId}-${attempt}`}
          className={css.Video}
          src={media.src}
          poster={thumb.src}
          controls
          autoPlay
          playsInline
          preload="metadata"
          onLoadedMetadata={() => setLoaded(true)}
          onError={(e) => {
            // poster failures fire `error` without a MediaError: ignore those
            if (e.currentTarget.error) media.onError();
          }}
          data-media-current={item.eventId}
        />
      )}
      {media.src && item.kind !== 'video' && (
        <img
          key={`${item.eventId}-${attempt}`}
          className={css.Media}
          src={media.src}
          alt={item.body || item.title}
          draggable={false}
          style={{ ...mediaStyle, opacity: loaded ? 1 : 0 }}
          onLoad={(e) => {
            setLoaded(true);
            onLoaded(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
          }}
          onError={media.onError}
          data-media-current={item.eventId}
        />
      )}
      {(resolved.loading || (!loaded && item.kind !== 'video')) && (
        <div className={css.Spinner}>
          <Spinner variant="Secondary" size="400" />
        </div>
      )}
    </div>
  );
}

export function MediaViewer({
  items,
  index,
  onIndexChange,
  onClose,
  onNearEdge,
  moreBefore,
  moreAfter,
  loading,
  label,
  banner,
  toolbarExtra,
  roundThumbs,
  emptyText,
}: MediaViewerProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const getBlob = useItemBlob();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const [dragX, setDragX] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [toast, setToast] = useState<string>();
  // Keep the picture clear of the top bar and the filmstrip while they are
  // shown; a tap hides them and the picture goes edge to edge.
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [insets, setInsets] = useState({ top: 0, bottom: 0 });
  useLayoutEffect(() => {
    const measure = () =>
      setInsets({
        top: topRef.current?.offsetHeight ?? 0,
        bottom: bottomRef.current?.offsetHeight ?? 0,
      });
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    if (topRef.current) ro.observe(topRef.current);
    if (bottomRef.current) ro.observe(bottomRef.current);
    return () => ro.disconnect();
  }, []);
  const item = items[index] as ViewerItem | undefined;
  const count = items.length;

  // ---------------------------------------------------------------- close / history
  const historyId = useRef(`mv-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const closedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const id = historyId.current;
    try {
      window.history.pushState({ ...(window.history.state ?? {}), cinnyMediaViewer: id }, '');
    } catch {
      // history may be unavailable (sandboxed iframes); the viewer still works
    }
    const onPop = () => {
      if (window.history.state?.cinnyMediaViewer === id) return;
      if (closedRef.current) return;
      closedRef.current = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      clearFullSizeCache();
    };
  }, []);

  const requestClose = useCallback(() => {
    if (closedRef.current) return;
    if (window.history.state?.cinnyMediaViewer === historyId.current) {
      // pop our own entry; the popstate handler then closes the viewer
      window.history.back();
      // fallback in case popstate never arrives
      setTimeout(() => {
        if (!closedRef.current) {
          closedRef.current = true;
          onCloseRef.current();
        }
      }, 400);
      return;
    }
    closedRef.current = true;
    onCloseRef.current();
  }, []);

  // ---------------------------------------------------------------- navigation
  const resetZoom = useCallback(() => setTransform(IDENTITY), []);
  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next < 0 || next >= count) return;
      setAnimate(false);
      resetZoom();
      setDragX(0);
      onIndexChange(next);
    },
    [index, count, onIndexChange, resetZoom]
  );

  useEffect(() => {
    resetZoom();
  }, [item?.eventId, resetZoom]);

  useEffect(() => {
    onNearEdge?.(index);
  }, [index, count, onNearEdge]);

  // full-size for current ±1 only
  useEffect(() => {
    [items[index - 1], items[index + 1]].forEach((it) => {
      if (it) preloadItem(mx, it, useAuthentication);
    });
  }, [items, index, mx, useAuthentication]);

  // ---------------------------------------------------------------- zoom
  const zoomAt = useCallback((nextZ: number, px = 0, py = 0) => {
    setTransform((t) => {
      const z = clamp(nextZ, MIN_ZOOM, MAX_ZOOM);
      if (z <= 1.001) return IDENTITY;
      const k = z / t.z;
      return { z, x: px - (px - t.x) * k, y: py - (py - t.y) * k };
    });
  }, []);

  const stagePoint = (clientX: number, clientY: number) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 };
  };

  const clampPan = (t: Transform): Transform => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r || t.z <= 1) return t;
    const mx2 = ((t.z - 1) * r.width) / 2 + 40;
    const my2 = ((t.z - 1) * r.height) / 2 + 40;
    return { z: t.z, x: clamp(t.x, -mx2, mx2), y: clamp(t.y, -my2, my2) };
  };

  // ---------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (evt: KeyboardEvent) => {
      const k = evt.key;
      let handled = true;
      if (k === 'Escape') requestClose();
      else if (k === 'ArrowLeft') go(-1);
      else if (k === 'ArrowRight') go(1);
      else if (k === 'Home') onIndexChange(0);
      else if (k === 'End') onIndexChange(Math.max(0, count - 1));
      else if (k === '+' || k === '=') zoomAt(transform.z * 1.5);
      else if (k === '-') zoomAt(transform.z / 1.5);
      else if (k === '0') resetZoom();
      else handled = false;
      if (handled) {
        evt.preventDefault();
        evt.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [go, requestClose, zoomAt, resetZoom, transform.z, count, onIndexChange]);

  // ---------------------------------------------------------------- gestures
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    kind: 'none' | 'swipe' | 'pan' | 'pinch';
    startX: number;
    startY: number;
    startT: Transform;
    startDist: number;
    startMid: { x: number; y: number };
    moved: boolean;
    startTime: number;
  }>({
    kind: 'none',
    startX: 0,
    startY: 0,
    startT: IDENTITY,
    startDist: 1,
    startMid: { x: 0, y: 0 },
    moved: false,
    startTime: 0,
  });
  const lastTap = useRef<{ t: number; x: number; y: number }>({ t: 0, x: 0, y: 0 });
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();

  const isVideo = item?.kind === 'video';

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (isVideo && (e.target as HTMLElement).tagName === 'VIDEO' && e.pointerType === 'mouse')
      return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setAnimate(false);
    const g = gesture.current;
    if (pointers.current.size === 2 && !isVideo) {
      const [a, b] = Array.from(pointers.current.values());
      g.kind = 'pinch';
      g.startDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      g.startMid = stagePoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      g.startT = transform;
      g.moved = true;
      setDragX(0);
      return;
    }
    g.kind = transform.z > 1 ? 'pan' : 'swipe';
    g.startX = e.clientX;
    g.startY = e.clientY;
    g.startT = transform;
    g.moved = false;
    g.startTime = Date.now();
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (g.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = stagePoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      const z = clamp(g.startT.z * (dist / g.startDist), MIN_ZOOM, MAX_ZOOM);
      const k = z / g.startT.z;
      setTransform(
        clampPan({
          z,
          x: mid.x - (g.startMid.x - g.startT.x) * k,
          y: mid.y - (g.startMid.y - g.startT.y) * k,
        })
      );
      return;
    }
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) g.moved = true;
    if (g.kind === 'pan') {
      setTransform(clampPan({ z: g.startT.z, x: g.startT.x + dx, y: g.startT.y + dy }));
    } else if (g.kind === 'swipe' && Math.abs(dx) > Math.abs(dy)) {
      // resist at the ends
      const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === count - 1);
      setDragX(atEdge ? dx / 3 : dx);
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const start = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g.kind === 'pinch') {
      if (pointers.current.size === 0) {
        g.kind = 'none';
        if (transform.z <= 1.02) {
          setAnimate(true);
          resetZoom();
        }
      } else {
        // one finger left: continue as a pan from here
        const [rest] = Array.from(pointers.current.values());
        g.kind = 'pan';
        g.startX = rest.x;
        g.startY = rest.y;
        g.startT = transform;
      }
      return;
    }
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const dt = Math.max(1, Date.now() - g.startTime);
    g.kind = 'none';
    if (g.moved) {
      if (gesture.current && transform.z <= 1) {
        const fast = Math.abs(dx) / dt > 0.5;
        if (Math.abs(dx) > Math.abs(dy) && (Math.abs(dx) > 70 || (fast && Math.abs(dx) > 30))) {
          setAnimate(true);
          setDragX(0);
          go(dx < 0 ? 1 : -1);
          return;
        }
        if (dy > 110 && Math.abs(dy) > Math.abs(dx) * 1.3) {
          requestClose();
          return;
        }
      }
      setAnimate(true);
      setDragX(0);
      return;
    }
    // a tap: double-tap zooms, single tap toggles the chrome
    if (isVideo) return;
    const now = Date.now();
    const p = start ?? { x: e.clientX, y: e.clientY };
    if (
      now - lastTap.current.t < 300 &&
      Math.hypot(p.x - lastTap.current.x, p.y - lastTap.current.y) < 30
    ) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      lastTap.current = { t: 0, x: 0, y: 0 };
      setAnimate(true);
      if (transform.z > 1) resetZoom();
      else {
        const sp = stagePoint(p.x, p.y);
        zoomAt(2.5, sp.x, sp.y);
      }
      return;
    }
    lastTap.current = { t: now, x: p.x, y: p.y };
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setChrome((c) => !c), 260);
  };

  const onPointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    gesture.current.kind = 'none';
    setAnimate(true);
    setDragX(0);
  };

  useEffect(() => () => tapTimer.current && clearTimeout(tapTimer.current), []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      if (isVideo) return;
      e.preventDefault();
      const p = stagePoint(e.clientX, e.clientY);
      setAnimate(false);
      setTransform((t) => {
        const z = clamp(t.z * Math.exp(-e.deltaY * 0.0018), MIN_ZOOM, MAX_ZOOM);
        if (z <= 1.001) return IDENTITY;
        const k = z / t.z;
        return clampPan({ z, x: p.x - (p.x - t.x) * k, y: p.y - (p.y - t.y) * k });
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideo]);

  // ---------------------------------------------------------------- actions
  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(undefined), 1600);
  }, []);

  const handleDownload = async () => {
    if (!item) return;
    try {
      const blob = await getBlob(item);
      FileSaver.saveAs(blob, safeName(item));
    } catch {
      flash('Download failed');
    }
  };

  const handleOpenOriginal = async () => {
    if (!item) return;
    // open synchronously (popup blockers), fill in once the bytes are here
    const win = window.open('', '_blank');
    try {
      const blob = await getBlob(item);
      const url = URL.createObjectURL(blob);
      if (win) win.location.href = url;
      else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      win?.close();
      flash('Could not open the original');
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const handleCopy = async () => {
    if (!item) return;
    if (
      item.kind !== 'video' &&
      typeof ClipboardItem !== 'undefined' &&
      navigator.clipboard?.write
    ) {
      try {
        const blob = await getBlob(item);
        let png = blob;
        if (blob.type !== 'image/png') {
          const bmp = await createImageBitmap(blob);
          const canvas = document.createElement('canvas');
          canvas.width = bmp.width;
          canvas.height = bmp.height;
          canvas.getContext('2d')?.drawImage(bmp, 0, 0);
          png = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png');
          });
        }
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
        flash('Picture copied');
        return;
      } catch {
        // fall through to copying the link
      }
    }
    if (item.link && (await copyText(item.link))) flash('Link copied');
    else flash('Copy is not available here');
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const handleShare = async () => {
    if (!item) return;
    try {
      const blob = await getBlob(item);
      const file = new File([blob], safeName(item), { type: blob.type || item.mimeType });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: item.title });
        return;
      }
      if (item.link) await navigator.share({ url: item.link, title: item.title });
    } catch {
      // the user cancelled, or sharing is not possible
    }
  };

  const counter = count ? `${index + 1} / ${count}${moreBefore || moreAfter ? '+' : ''}` : '';

  const content = (
    <>
      <div
        ref={stageRef}
        className={css.Stage}
        style={{
          top: chrome ? insets.top : 0,
          bottom: chrome ? insets.bottom : 0,
          transition: 'top 160ms ease, bottom 160ms ease',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        data-media-stage
      >
        {item ? (
          <Slide
            key={item.eventId}
            item={item}
            transform={transform}
            dragX={dragX}
            animate={animate}
            onLoaded={() => undefined}
          />
        ) : (
          <div className={css.Placeholder}>
            {loading ? (
              <Spinner variant="Secondary" size="400" />
            ) : (
              <div>{emptyText ?? 'Nothing to show.'}</div>
            )}
          </div>
        )}
      </div>

      <div ref={topRef} className={classNames(css.TopBar, !chrome && css.ChromeHidden)}>
        <button
          ref={closeRef}
          type="button"
          className={css.ToolButton}
          onClick={requestClose}
          aria-label="Close"
          data-media-close
        >
          <Icon size="200" src={Icons.Cross} />
        </button>
        <div className={css.Title}>
          <span className={css.TitleName}>{item?.title ?? label}</span>
          {item?.subtitle && <span className={css.TitleSub}>{item.subtitle}</span>}
        </div>
        {counter && (
          <span className={css.Counter} data-media-counter aria-live="polite">
            {counter}
          </span>
        )}
        {toolbarExtra}
        <span className={css.HideOnNarrow}>
          <button
            type="button"
            className={css.ToolButton}
            onClick={() => zoomAt(transform.z / 1.5)}
            disabled={!item || isVideo || transform.z <= 1}
            aria-label="Zoom out"
          >
            <Icon size="100" src={Icons.Minus} />
          </button>
          <button
            type="button"
            className={css.ToolButton}
            onClick={() => zoomAt(transform.z * 1.5)}
            disabled={!item || isVideo}
            aria-label="Zoom in"
          >
            <Icon size="100" src={Icons.Plus} />
          </button>
        </span>
        <button
          type="button"
          className={css.ToolButton}
          onClick={handleCopy}
          disabled={!item}
          aria-label={isVideo ? 'Copy link' : 'Copy picture'}
          title={isVideo ? 'Copy link' : 'Copy picture'}
        >
          <Icon size="100" src={Icons.Link} />
        </button>
        {canShare && (
          <button
            type="button"
            className={css.ToolButton}
            onClick={handleShare}
            disabled={!item}
            aria-label="Share"
            title="Share"
          >
            <Icon size="100" src={Icons.ArrowGoRight} />
          </button>
        )}
        <button
          type="button"
          className={classNames(css.ToolButton, css.HideOnNarrow)}
          onClick={handleOpenOriginal}
          disabled={!item}
          aria-label="Open original"
          title="Open original"
        >
          <Icon size="100" src={Icons.External} />
        </button>
        <button
          type="button"
          className={css.ToolButton}
          onClick={handleDownload}
          disabled={!item}
          aria-label="Download"
          title="Download"
        >
          <Icon size="100" src={Icons.Download} />
        </button>
      </div>

      <button
        type="button"
        className={classNames(css.NavPrev, !chrome && css.ChromeHidden)}
        onClick={() => go(-1)}
        disabled={index <= 0}
        aria-label="Previous"
        data-media-prev
      >
        <Icon size="200" src={Icons.ChevronLeft} />
      </button>
      <button
        type="button"
        className={classNames(css.NavNext, !chrome && css.ChromeHidden)}
        onClick={() => go(1)}
        disabled={index >= count - 1}
        aria-label="Next"
        data-media-next
      >
        <Icon size="200" src={Icons.ChevronRight} />
      </button>

      <div ref={bottomRef} className={classNames(css.BottomBar, !chrome && css.ChromeHidden)}>
        {item?.caption && <div className={css.Caption}>{item.caption}</div>}
        {banner && <div className={css.Banner}>{banner}</div>}
        {count > 1 && (
          <Filmstrip
            items={items}
            index={index}
            round={roundThumbs}
            onSelect={(i) => {
              resetZoom();
              onIndexChange(i);
            }}
            onNearEdge={onNearEdge}
          />
        )}
      </div>

      {toast && <div className={css.Toast}>{toast}</div>}
    </>
  );

  return createPortal(
    <FocusTrap
      boundaryName="media viewer"
      focusTrapOptions={{
        initialFocus: () => closeRef.current ?? rootRef.current ?? false,
        fallbackFocus: () => rootRef.current ?? document.body,
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        allowOutsideClick: true,
        onDeactivate: requestClose,
      }}
    >
      <div
        ref={rootRef}
        className={css.Root}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        data-media-viewer
        onContextMenu={(e) => e.stopPropagation()}
      >
        <SafeBoundary where="media viewer" variant="panel" onClose={requestClose}>
          {content}
        </SafeBoundary>
      </div>
    </FocusTrap>,
    document.body
  );
}

/** Hook used by owners: keeps `index` pinned to the same item when items are prepended. */
export function useStableIndex(items: { eventId: string }[], initialId?: string) {
  const [currentId, setCurrentId] = useState<string | undefined>(initialId);
  const index = useMemo(() => {
    if (!currentId) return items.length ? 0 : -1;
    const i = items.findIndex((it) => it.eventId === currentId);
    return i;
  }, [items, currentId]);
  const setIndex = useCallback(
    (i: number) => {
      const it = items[i];
      if (it) setCurrentId(it.eventId);
    },
    [items]
  );
  return { index, setIndex, currentId, setCurrentId };
}
