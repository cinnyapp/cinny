import classNames from 'classnames';
import React from 'react';
import * as css from './styles.css';

export function BottomSheetMenu({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: isOpen ? 'auto' : 'none' }}
    >
      <div
        className={classNames(css.menuBackdrop, { [css.menuBackdropOpen]: isOpen })}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={classNames(css.menuSheet, { [css.menuSheetOpen]: isOpen })}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}
