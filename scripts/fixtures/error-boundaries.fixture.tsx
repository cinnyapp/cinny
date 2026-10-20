/**
 * Fixture for scripts/test-error-boundaries.mjs — bundled by esbuild and run
 * inside jsdom. Exposes small mount helpers; the assertions live in the test.
 */
import React, { useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import RawFocusTrap from 'focus-trap-react';
import { ErrorBoundary } from 'react-error-boundary';
import SafeFocusTrap from '../../src/app/components/focus-trap';
import { SafeBoundary } from '../../src/app/components/error-boundary/SafeBoundary';

export { act };

export type Mounted = { container: HTMLElement; root: Root; unmount: () => void };

export function mount(node: React.ReactNode): Mounted {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return {
    container,
    root,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

/** A popup body with NOTHING tabbable — like the transcribe popover while loading. */
function EmptyPopupBody({ label }: { label: string }) {
  return (
    <div data-popup-body={label}>
      <h3>Transcript</h3>
      <span>Transcribing…</span>
    </div>
  );
}
const EmptyPopup = React.forwardRef<HTMLDivElement, { label: string }>(({ label }, ref) => (
  <div ref={ref} data-popup={label}>
    <EmptyPopupBody label={label} />
  </div>
));

/** The focusTrapOptions shapes used at the real mount sites (audited by grep). */
export const SITE_OPTIONS: Record<string, () => Record<string, unknown>> = {
  // TranscribeButton: initialFocus/fallbackFocus functions that may return nothing
  transcribe: () => ({
    initialFocus: () => undefined,
    fallbackFocus: () => null,
    clickOutsideDeactivates: true,
  }),
  // MessageTranslation / RoomAutoTranslate / mark-irrelevant (Message menu) / room settings
  translation: () => ({ initialFocus: false, clickOutsideDeactivates: true }),
  // Message options menu (holds Mark irrelevant), Reactions
  'message-menu': () => ({
    initialFocus: false,
    returnFocusOnDeactivate: false,
    clickOutsideDeactivates: true,
    isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
    isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
  }),
  // EmojiBoard
  'emoji-picker': () => ({
    returnFocusOnDeactivate: true,
    initialFocus: false,
    clickOutsideDeactivates: true,
    allowOutsideClick: true,
  }),
  // Settings / room settings modal (Modal500 shape)
  'room-settings': () => ({ initialFocus: false, clickOutsideDeactivates: true }),
  // Input autocomplete: initialFocus pointing at a ref that is not attached yet
  'null-initial-focus': () => ({ initialFocus: () => null }),
  // A selector that matches nothing
  'missing-selector': () => ({ initialFocus: '#does-not-exist' }),
  // No options at all
  'no-options': () => ({}),
};

export function mountRawEmptyTrap(options: Record<string, unknown>) {
  const errors: unknown[] = [];
  const m = mount(
    <ErrorBoundary
      fallbackRender={() => <div data-raw-crashed />}
      onError={(e) => {
        errors.push(e);
      }}
    >
      <RawFocusTrap focusTrapOptions={options}>
        <EmptyPopup label="raw" />
      </RawFocusTrap>
    </ErrorBoundary>
  );
  return { ...m, errors };
}

export function mountSafeEmptyTrap(label: string, options: Record<string, unknown>) {
  const errors: unknown[] = [];
  const m = mount(
    <ErrorBoundary
      fallbackRender={() => <div data-outer-crashed />}
      onError={(e) => {
        errors.push(e);
      }}
    >
      <SafeFocusTrap focusTrapOptions={options}>
        <EmptyPopup label={label} />
      </SafeFocusTrap>
    </ErrorBoundary>
  );
  return { ...m, errors };
}

function Thrower({ message }: { message: string }): React.ReactElement {
  throw new Error(message);
}

export function mountThrowingPopup(onDeactivate: () => void) {
  const errors: unknown[] = [];
  const m = mount(
    <ErrorBoundary
      fallbackRender={() => <div data-outer-crashed />}
      onError={(e) => {
        errors.push(e);
      }}
    >
      <div data-sibling="before">sidebar</div>
      <SafeFocusTrap focusTrapOptions={{ initialFocus: false, onDeactivate }}>
        <div data-popup="throwing">
          <Thrower message="boom inside a popup" />
        </div>
      </SafeFocusTrap>
      <div data-sibling="after">timeline</div>
    </ErrorBoundary>
  );
  return { ...m, errors };
}

let failMiddle = true;
export const setFailMiddle = (v: boolean) => {
  failMiddle = v;
};

function MaybeThrow({ id }: { id: string }) {
  if (id === 'm2' && failMiddle) throw new Error('message render failed');
  return <p data-message-id={id}>{`message ${id}`}</p>;
}

/** Mimics the timeline: one <SafeBoundary variant="message"> per item. */
export function mountTimeline() {
  const errors: unknown[] = [];
  function Timeline() {
    const [, force] = useState(0);
    return (
      <ErrorBoundary
        fallbackRender={() => <div data-outer-crashed />}
        onError={(e) => {
          errors.push(e);
        }}
      >
        <button type="button" data-rerender onClick={() => force((n) => n + 1)}>
          rerender
        </button>
        {['m1', 'm2', 'm3'].map((id) => (
          <SafeBoundary key={id} where={`message ${id}`} variant="message">
            <MaybeThrow id={id} />
          </SafeBoundary>
        ))}
      </ErrorBoundary>
    );
  }
  const m = mount(<Timeline />);
  return { ...m, errors };
}
