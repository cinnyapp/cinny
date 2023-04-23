import React, { KeyboardEventHandler, ReactNode } from 'react';
import FocusTrap from 'focus-trap-react';
import isHotkey from 'is-hotkey';
import { Header, Menu, Scroll, config } from 'folds';

import * as css from './AutocompleteMenu.css';

type AutocompleteMenuProps = {
  requestClose: () => void;
  headerContent: ReactNode;
  children: ReactNode;
};
export function AutocompleteMenu({ headerContent, requestClose, children }: AutocompleteMenuProps) {
  const handleScrollKeyDown: KeyboardEventHandler<HTMLDivElement> = (evt) => {
    if (isHotkey('arrowup', evt) || isHotkey('arrowdown', evt)) {
      evt.preventDefault();
    }
  };

  return (
    <div className={css.AutocompleteMenuBase}>
      <div className={css.AutocompleteMenuContainer}>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => requestClose(),
            clickOutsideDeactivates: true,
            allowOutsideClick: true,
            isKeyForward: (evt: KeyboardEvent) => isHotkey('arrowdown', evt),
            isKeyBackward: (evt: KeyboardEvent) => isHotkey('arrowup', evt),
          }}
        >
          <Menu className={css.AutocompleteMenu}>
            <Header className={css.AutocompleteMenuHeader} size="400">
              {headerContent}
            </Header>
            <Scroll style={{ flexGrow: 1 }} onKeyDown={handleScrollKeyDown}>
              <div style={{ padding: config.space.S200 }}>{children}</div>
            </Scroll>
          </Menu>
        </FocusTrap>
      </div>
    </div>
  );
}
