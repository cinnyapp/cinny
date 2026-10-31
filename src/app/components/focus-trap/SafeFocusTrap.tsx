/**
 * Drop-in replacement for `focus-trap-react`'s default export, used by EVERY
 * popover / dialog / overlay in the app (import it instead of the library).
 *
 * Why: focus-trap THROWS when its container has nothing tabbable in it
 * ("Your focus-trap must have at least one container with at least one
 * tabbable node in it at all times") or when `initialFocus` resolves to
 * nothing. Thrown from a React lifecycle, that used to kill the whole app
 * (the 🎤 Transcribe popover in its loading state). This wrapper makes that
 * impossible, and contains anything else that goes wrong inside the popup:
 *
 *  - `fallbackFocus` is always set: the caller's (if it resolves) else the trap
 *    container itself (given tabIndex=-1 only in that degenerate case), else
 *    <body>. With a fallback, focus-trap never throws the "tabbable node" error.
 *  - `initialFocus` given as a function that returns null/throws is turned into
 *    "use the default" instead of an exception.
 *  - `tabbableOptions.displayCheck: 'none'` — no layout reads per node (cheap on
 *    the emoji board's thousands of buttons) and no false "nothing visible yet"
 *    while a popover is still being positioned.
 *  - `checkCanFocusTrap` waits one frame so content that renders/positions
 *    right after mount is there before the trap looks for tabbable nodes; any
 *    failure then happens in a promise, never in React's commit phase.
 *  - the whole trap + its content sits in a <SafeBoundary variant="popup">, so a
 *    render/effect error inside a popup shows "Something went wrong here —
 *    Retry / Report / Close" in place of the popup, and the app keeps running.
 */
import React, { ReactElement, Ref, useCallback, useRef } from 'react';
import FocusTrapReact from 'focus-trap-react';
import type { Options as FocusTrapOptions, FocusTargetValueOrFalse } from 'focus-trap';
import { SafeBoundary } from '../error-boundary/SafeBoundary';

type FocusTrapProps = FocusTrapReact.Props & {
  /** Name used in error reports; defaults to "popup". */
  boundaryName?: string;
};

type NodeOption = FocusTrapOptions['fallbackFocus'] | FocusTrapOptions['initialFocus'];

const resolveNode = (opt: NodeOption, doc: Document): HTMLElement | SVGElement | undefined => {
  try {
    const value = typeof opt === 'function' ? (opt as () => unknown)() : opt;
    if (!value || value === true) return undefined;
    if (typeof value === 'string') {
      return (doc.querySelector(value) as HTMLElement | null) ?? undefined;
    }
    if (typeof value === 'object' && 'focus' in (value as object)) {
      return value as HTMLElement;
    }
  } catch {
    // a broken option must never break the trap
  }
  return undefined;
};

const waitAFrame = (): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, 50); // rAF does not fire in background tabs
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        clearTimeout(timer);
        resolve();
      });
    }
  });

/**
 * Pure option hardening — exported for the regression tests.
 * `getContainer` returns the trap's container element (or null before mount).
 */
export function makeSafeFocusTrapOptions(
  options: FocusTrapOptions | undefined,
  getContainer: () => HTMLElement | null,
  { delayActivation = true }: { delayActivation?: boolean } = {}
): FocusTrapOptions {
  const opts = options ?? {};
  const getDoc = () => opts.document ?? document;

  const fallbackFocus = (): HTMLElement | SVGElement => {
    const doc = getDoc();
    const own = resolveNode(opts.fallbackFocus, doc);
    if (own) return own;
    const container = getContainer();
    if (container) {
      if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
      return container;
    }
    return doc.body;
  };

  const safe: FocusTrapOptions = {
    ...opts,
    fallbackFocus,
    tabbableOptions: { displayCheck: 'none', ...opts.tabbableOptions },
  };
  if (typeof opts.initialFocus === 'function') {
    const userInitial = opts.initialFocus;
    safe.initialFocus = (): FocusTargetValueOrFalse => {
      try {
        const node = userInitial();
        if (node === false) return false;
        // null / undefined / '' => let focus-trap use its default (first tabbable,
        // then fallbackFocus) instead of throwing "did not return a node".
        return (node || undefined) as FocusTargetValueOrFalse;
      } catch {
        return undefined as unknown as FocusTargetValueOrFalse;
      }
    };
  }

  if (!opts.checkCanFocusTrap && delayActivation) {
    safe.checkCanFocusTrap = () => waitAFrame();
  }
  return safe;
}

const setRef = <T,>(ref: Ref<T> | undefined, value: T) => {
  if (typeof ref === 'function') ref(value);
  // eslint-disable-next-line no-param-reassign
  else if (ref && typeof ref === 'object') (ref as React.MutableRefObject<T>).current = value;
};

export default function SafeFocusTrap({
  focusTrapOptions,
  children,
  boundaryName = 'popup',
  ...rest
}: FocusTrapProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const optionsRef = useRef(focusTrapOptions);
  optionsRef.current = focusTrapOptions;

  const safeOptions = makeSafeFocusTrapOptions(focusTrapOptions, () => containerRef.current, {
    // a paused trap must not be (re)activated by a delayed activation
    delayActivation: rest.paused === undefined,
  });

  const child = React.isValidElement(children) ? (children as ReactElement) : null;
  const originalRef = child ? (child as unknown as { ref?: Ref<HTMLElement> }).ref : undefined;
  const captureRef = useCallback(
    (el: HTMLElement | null) => {
      containerRef.current = el;
      setRef(originalRef, el);
    },
    [originalRef]
  );
  const content = child ? React.cloneElement(child, { ref: captureRef } as never) : children;

  const handleClose = useCallback(() => {
    const onDeactivate = optionsRef.current?.onDeactivate;
    if (typeof onDeactivate === 'function') onDeactivate();
  }, []);

  return (
    <SafeBoundary
      where={boundaryName}
      variant="popup"
      onClose={focusTrapOptions?.onDeactivate ? handleClose : undefined}
    >
      <FocusTrapReact {...rest} focusTrapOptions={safeOptions}>
        {content}
      </FocusTrapReact>
    </SafeBoundary>
  );
}

export { SafeFocusTrap };
