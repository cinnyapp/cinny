import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { OnIntersectionCallback, useIntersectionObserver } from './useIntersectionObserver';
import {
  canFitInScrollView,
  getScrollInfo,
  isInScrollView,
  isIntersectingScrollView,
} from '../utils/dom';

const PAGINATOR_ANCHOR_ATTR = 'data-paginator-anchor';

export enum Direction {
  Backward = 'B',
  Forward = 'F',
}

export type ItemRange = {
  start: number;
  end: number;
};

export type ScrollToOptions = {
  offset?: number;
  align?: 'start' | 'center' | 'end';
  behavior?: 'auto' | 'instant' | 'smooth';
  stopInView?: boolean;
};

export type ScrollToElement = (element: HTMLElement, opts?: ScrollToOptions) => void;
export type ScrollToItem = (index: number, opts?: ScrollToOptions) => void;

type HandleObserveAnchor = (element: HTMLElement | null) => void;

type VirtualPaginatorOptions<TScrollElement extends HTMLElement> = {
  count: number;
  limit: number;
  range: ItemRange;
  onRangeChange: (range: ItemRange) => void;
  getScrollElement: () => TScrollElement | null;
  getItemElement: (index: number) => HTMLElement | undefined;
  onEnd?: (back: boolean) => void;
};

type VirtualPaginator = {
  getItems: () => number[];
  scrollToElement: ScrollToElement;
  scrollToItem: ScrollToItem;
  observeBackAnchor: HandleObserveAnchor;
  observeFrontAnchor: HandleObserveAnchor;
};

const generateItems = (range: ItemRange) => {
  const items: number[] = [];
  for (let i = range.start; i < range.end; i += 1) {
    items.push(i);
  }

  return items;
};

const getDropIndex = (
  scrollEl: HTMLElement,
  range: ItemRange,
  dropDirection: Direction,
  getItemElement: (index: number) => HTMLElement | undefined,
  pageThreshold = 1
): number | undefined => {
  const fromBackward = dropDirection === Direction.Backward;
  const items = fromBackward ? generateItems(range) : generateItems(range).reverse();

  const { viewHeight, top, height } = getScrollInfo(scrollEl);
  const { offsetTop: sOffsetTop } = scrollEl;
  const bottom = top + viewHeight;
  const dropEdgePx = fromBackward
    ? Math.max(top - viewHeight * pageThreshold, 0)
    : Math.min(bottom + viewHeight * pageThreshold, height);
  if (dropEdgePx === 0 || dropEdgePx === height) return undefined;

  let dropIndex: number | undefined;

  items.find((item) => {
    const el = getItemElement(item);
    if (!el) {
      dropIndex = item;
      return false;
    }
    const { clientHeight } = el;
    const offsetTop = el.offsetTop - sOffsetTop;
    const offsetBottom = offsetTop + clientHeight;
    const isInView = fromBackward ? offsetBottom > dropEdgePx : offsetTop < dropEdgePx;
    if (isInView) return true;
    dropIndex = item;
    return false;
  });

  return dropIndex;
};

const getRestoreAnchor = (
  range: ItemRange,
  getItemElement: (index: number) => HTMLElement | undefined
): [number | undefined, HTMLElement | undefined] => {
  let scrollAnchorEl: HTMLElement | undefined;
  const scrollAnchorItem = generateItems(range).find((i) => {
    const el = getItemElement(i);
    if (el) {
      scrollAnchorEl = el;
      return true;
    }
    return false;
  });
  return [scrollAnchorItem, scrollAnchorEl];
};

const useObserveAnchorHandle = (
  intersectionObserver: ReturnType<typeof useIntersectionObserver>,
  anchorType: Direction
): HandleObserveAnchor =>
  useMemo<HandleObserveAnchor>(() => {
    let anchor: HTMLElement | null = null;
    return (element) => {
      if (element === anchor) return;
      if (anchor) intersectionObserver?.unobserve(anchor);
      if (!element) return;
      anchor = element;
      element.setAttribute(PAGINATOR_ANCHOR_ATTR, anchorType);
      intersectionObserver?.observe(element);
    };
  }, [intersectionObserver, anchorType]);

export const useVirtualPaginator = <TScrollElement extends HTMLElement>(
  options: VirtualPaginatorOptions<TScrollElement>
): VirtualPaginator => {
  const { count, limit, range, onRangeChange, getScrollElement, getItemElement, onEnd } = options;

  const initialRenderRef = useRef(true);

  const restoreScrollRef = useRef<{
    offsetTop: number;
    anchorItem: number;
  }>();

  const scrollToItemRef = useRef<{
    index: number;
    opts?: ScrollToOptions;
  }>();

  const propRef = useRef({
    range,
    limit,
    count,
  });
  if (propRef.current.count !== count) {
    // Clear restoreScrollRef on count change
    // As restoreScrollRef.current.anchorItem might changes
    restoreScrollRef.current = undefined;
  }
  propRef.current = {
    range,
    count,
    limit,
  };

  const getItems = useMemo(() => {
    const items = generateItems(range);
    return () => items;
  }, [range]);

  const scrollToElement = useCallback<ScrollToElement>(
    (element, opts) => {
      const scrollElement = getScrollElement();
      if (!scrollElement) return;

      if (opts?.stopInView && isInScrollView(scrollElement, element)) {
        return;
      }
      let scrollTo = element.offsetTop;
      if (opts?.align === 'center' && canFitInScrollView(scrollElement, element)) {
        const scrollInfo = getScrollInfo(scrollElement);
        scrollTo =
          element.offsetTop -
          Math.round(scrollInfo.viewHeight / 2) +
          Math.round(element.clientHeight / 2);
      } else if (opts?.align === 'end' && canFitInScrollView(scrollElement, element)) {
        const scrollInfo = getScrollInfo(scrollElement);
        scrollTo = element.offsetTop - Math.round(scrollInfo.viewHeight) + element.clientHeight;
      }

      scrollElement.scrollTo({
        top: scrollTo - (opts?.offset ?? 0),
        behavior: opts?.behavior,
      });
    },
    [getScrollElement]
  );

  const scrollToItem = useCallback<ScrollToItem>(
    (index, opts) => {
      const { range: currentRange, limit: currentLimit, count: currentCount } = propRef.current;

      if (index < 0 || index > currentCount) return;
      // index is not in range change range
      // and trigger scrollToItem in layoutEffect hook
      if (index < currentRange.start || index > currentRange.end) {
        onRangeChange({
          start: Math.max(index - currentLimit, 0),
          end: Math.min(index + currentLimit, currentCount),
        });
        scrollToItemRef.current = {
          index,
          opts,
        };
        return;
      }

      const itemElement = getItemElement(index);
      if (!itemElement) return;
      scrollToElement(itemElement, opts);
    },
    [scrollToElement, getItemElement, onRangeChange]
  );

  const paginate = useCallback(
    (direction: Direction) => {
      const scrollEl = getScrollElement();
      const { range: currentRange, limit: currentLimit, count: currentCount } = propRef.current;
      let { start, end } = currentRange;

      if (direction === Direction.Backward) {
        restoreScrollRef.current = undefined;
        if (scrollEl && start > 0) {
          const [restoreAnchorItem, restoreAnchorEl] = getRestoreAnchor(
            { start, end },
            getItemElement
          );
          if (restoreAnchorItem !== undefined && restoreAnchorEl) {
            restoreScrollRef.current = {
              anchorItem: restoreAnchorItem,
              offsetTop: restoreAnchorEl.offsetTop,
            };
          }
        }
        if (start === 0) {
          onEnd?.(true);
          return;
        }
        if (scrollEl) {
          end = getDropIndex(scrollEl, currentRange, Direction.Forward, getItemElement, 2) ?? end;
        }
        start = Math.max(start - currentLimit, 0);
      }

      if (direction === Direction.Forward) {
        if (end === currentCount) {
          onEnd?.(false);
          return;
        }
        end = Math.min(end + currentLimit, currentCount);
        if (scrollEl) {
          start =
            getDropIndex(scrollEl, currentRange, Direction.Backward, getItemElement, 2) ?? start;
        }
      }

      onRangeChange({
        start,
        end,
      });
    },
    [getScrollElement, getItemElement, onEnd, onRangeChange]
  );

  const handlePaginatorElIntersection: OnIntersectionCallback = useCallback(
    (entries) => {
      const anchorB = entries.find(
        (entry) => entry.target.getAttribute(PAGINATOR_ANCHOR_ATTR) === Direction.Backward
      );
      if (anchorB?.isIntersecting) {
        paginate(Direction.Backward);
      }
      const anchorF = entries.find(
        (entry) => entry.target.getAttribute(PAGINATOR_ANCHOR_ATTR) === Direction.Forward
      );
      if (anchorF?.isIntersecting) {
        paginate(Direction.Forward);
      }
    },
    [paginate]
  );

  const intersectionObserver = useIntersectionObserver(
    handlePaginatorElIntersection,
    useMemo(
      () => ({
        root: getScrollElement(),
      }),
      [getScrollElement]
    )
  );

  const observeBackAnchor = useObserveAnchorHandle(intersectionObserver, Direction.Backward);
  const observeFrontAnchor = useObserveAnchorHandle(intersectionObserver, Direction.Forward);

  // Restore scroll when scrolling backward
  // restoreScrollRef.current only gets set
  // when pagination is trigger in backward direction
  useLayoutEffect(() => {
    const scrollEl = getScrollElement();
    if (!restoreScrollRef.current || !scrollEl) return;
    const { offsetTop: oldOffsetTop, anchorItem } = restoreScrollRef.current;
    const anchorEl = getItemElement(anchorItem);

    if (!anchorEl) return;
    const { offsetTop } = anchorEl;
    const offsetDiff = offsetTop - oldOffsetTop;

    scrollEl.scrollTo({
      top: offsetDiff,
    });
    restoreScrollRef.current = undefined;
  }, [range, getScrollElement, getItemElement]);

  // Scroll to item after range changes
  // when scrollToItem index was not in range.
  useLayoutEffect(() => {
    if (scrollToItemRef.current === undefined) return;
    const { index, opts } = scrollToItemRef.current;
    scrollToItem(index, {
      ...opts,
      behavior: 'instant',
    });
    scrollToItemRef.current = undefined;
  }, [range, scrollToItem]);

  // Continue pagination to fill view height with scroll items
  // check if pagination anchor are in visible view height
  // and trigger pagination
  useEffect(() => {
    if (initialRenderRef.current) {
      // Do not trigger pagination on initial render
      // anchor intersection observable will trigger pagination on mount
      initialRenderRef.current = false;
      return;
    }
    const scrollElement = getScrollElement();
    if (!scrollElement) return;
    const backAnchor = scrollElement.querySelector(
      `[${PAGINATOR_ANCHOR_ATTR}="${Direction.Backward}"]`
    ) as HTMLElement | null;
    const fontAnchor = scrollElement.querySelector(
      `[${PAGINATOR_ANCHOR_ATTR}="${Direction.Forward}"]`
    ) as HTMLElement | null;

    if (backAnchor && isIntersectingScrollView(scrollElement, backAnchor)) {
      paginate(Direction.Backward);
      return;
    }
    if (fontAnchor && isIntersectingScrollView(scrollElement, fontAnchor)) {
      paginate(Direction.Forward);
    }
  }, [range, getScrollElement, paginate]);

  return {
    getItems,
    scrollToItem,
    scrollToElement,
    observeBackAnchor,
    observeFrontAnchor,
  };
};
