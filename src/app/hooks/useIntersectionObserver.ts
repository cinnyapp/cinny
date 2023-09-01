import { useEffect, useState } from 'react';

export type OnIntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

export type IntersectionObserverOpts = {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
};

export const getIntersectionObserverEntry = (
  target: Element | Document,
  entries: IntersectionObserverEntry[]
): IntersectionObserverEntry | undefined => entries.find((entry) => entry.target === target);

export const useIntersectionObserver = (
  onIntersectionCallback: OnIntersectionCallback,
  opts?: IntersectionObserverOpts | (() => IntersectionObserverOpts),
  observeElement?: Element | null | (() => Element | null)
): IntersectionObserver | undefined => {
  const [intersectionObserver, setIntersectionObserver] = useState<IntersectionObserver>();

  useEffect(() => {
    const initOpts = typeof opts === 'function' ? opts() : opts;
    setIntersectionObserver(new IntersectionObserver(onIntersectionCallback, initOpts));
  }, [onIntersectionCallback, opts]);

  useEffect(() => {
    const element = typeof observeElement === 'function' ? observeElement() : observeElement;
    if (element) intersectionObserver?.observe(element);
    return () => {
      if (element) intersectionObserver?.unobserve(element);
    };
  }, [intersectionObserver, observeElement]);

  return intersectionObserver;
};
