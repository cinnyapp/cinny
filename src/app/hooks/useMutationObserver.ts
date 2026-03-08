import { useEffect, useMemo } from 'react';

export type OnMutationCallback = (mutations: MutationRecord[]) => void;

export const getMutationRecord = (
  target: Node,
  mutations: MutationRecord[]
): MutationRecord | undefined => mutations.find((mutation) => mutation.target === target);

export const useMutationObserver = (
  onMutationCallback: OnMutationCallback,
  observeElement?: Node | null | (() => Node | null),
  options?: MutationObserverInit
): MutationObserver => {
  const mutationObserver = useMemo(
    () => new MutationObserver(onMutationCallback),
    [onMutationCallback]
  );

  useEffect(() => () => mutationObserver?.disconnect(), [mutationObserver]);

  useEffect(() => {
    const element = typeof observeElement === 'function' ? observeElement() : observeElement;

    if (element) {
      mutationObserver.observe(element, options);
    }

    return () => {
      if (element) {
        mutationObserver.disconnect();
      }
    };
  }, [mutationObserver, observeElement, options]);

  return mutationObserver;
};
