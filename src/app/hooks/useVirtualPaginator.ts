import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { OnIntersectionCallback, useIntersectionObserver } from './useIntersectionObserver';
import { getScrollInfo, inVisibleScrollArea } from '../utils/dom';

const PAGINATOR_ANCHOR_ATTR = 'data-paginator-anchor';

export enum Direction {
  Backward = 'B',
  Forward = 'F',
}

export type ItemRange = {
  start: number;
  end: number;
};

type HandleObserveAnchor = (element: HTMLElement | null) => void;

type VirtualPaginatorOptions<TScrollElement extends HTMLElement> = {
  count: number;
  limit: number;
  range: ItemRange;
  onRangeChange: (range: ItemRange) => void;
  getScrollElement: () => TScrollElement | null;
  getItemElement: (index: number) => HTMLElement | undefined;
  onEnd?: (direction: Direction) => void;
};

type VirtualPaginator = {
  getItems: () => number[];
  scrollToElement: (element: HTMLElement) => void;
  scrollToItem: (index: number) => void;
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
      console.log('start observing----');
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

  const rangeRef = useRef(range);
  rangeRef.current = range;
  const countRef = useRef(count);
  countRef.current = count;

  const initialRenderRef = useRef(true);

  const restoreScrollRef = useRef<{
    offsetTop: number;
    anchorItem: number;
  }>();
  console.log(count, { ...range });

  const getItems = useMemo(() => {
    const items = generateItems(range);
    return () => items;
  }, [range]);

  const scrollToElement = useCallback(
    (element: HTMLElement) => {
      const scrollElement = getScrollElement();

      scrollElement?.scrollTo({
        top: element.offsetTop,
      });
    },
    [getScrollElement]
  );

  const scrollToItem = useCallback(
    (index: number) => {
      // TODO: what if index is not in view?
      // update start end.
      const itemElement = getItemElement(index);
      if (!itemElement) return;
      scrollToElement(itemElement);
    },
    [scrollToElement, getItemElement]
  );

  const paginate = useCallback(
    (direction: Direction) => {
      const scrollEl = getScrollElement();
      const currentRange = rangeRef.current;
      const currentCount = countRef.current;
      restoreScrollRef.current = undefined;
      let { start, end } = currentRange;

      if (direction === Direction.Backward) {
        if (scrollEl) {
          const [restoreAnchorItem, restoreAnchorEl] = getRestoreAnchor(
            { start, end },
            getItemElement
          );

          if (restoreAnchorItem && restoreAnchorEl) {
            restoreScrollRef.current = {
              anchorItem: restoreAnchorItem,
              offsetTop: restoreAnchorEl.offsetTop,
            };
          }
        }
        if (start === 0) {
          onEnd?.(Direction.Backward);
          return;
        }
        if (scrollEl) {
          end = getDropIndex(scrollEl, currentRange, Direction.Forward, getItemElement, 2) ?? end;
        }
        start = Math.max(start - limit, 0);
      }

      if (direction === Direction.Forward) {
        if (end === currentCount) {
          onEnd?.(Direction.Forward);
          return;
        }
        end = Math.min(end + limit, currentCount);
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
    [limit, getScrollElement, getItemElement, onEnd, onRangeChange]
  );

  const handlePaginatorElIntersection: OnIntersectionCallback = useCallback(
    (entries) => {
      const anchorB = entries.find(
        (entry) => entry.target.getAttribute(PAGINATOR_ANCHOR_ATTR) === Direction.Backward
      );
      if (anchorB?.isIntersecting) paginate(Direction.Backward);
      const anchorF = entries.find(
        (entry) => entry.target.getAttribute(PAGINATOR_ANCHOR_ATTR) === Direction.Forward
      );
      if (anchorF?.isIntersecting) paginate(Direction.Forward);
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

  useLayoutEffect(() => {
    // TODO: Document that we only need to restore scroll when scrolling backward
    // also if scrollTop is greater then old scrollTop we don't need to restore scroll?
    // - NO as offsetDiff become negative
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

  useEffect(() => {
    // Do not trigger pagination on initial render
    // anchor intersection observable will trigger pagination on mount
    if (initialRenderRef.current) {
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

    if (backAnchor && inVisibleScrollArea(scrollElement, backAnchor)) {
      paginate(Direction.Backward);
      return;
    }
    if (fontAnchor && inVisibleScrollArea(scrollElement, fontAnchor)) {
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
