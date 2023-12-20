import React, {
  ChangeEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  useCallback,
  useRef,
  useState,
} from 'react';
import {
  Header,
  Icon,
  IconButton,
  Icons,
  Input,
  Menu,
  MenuItem,
  PopOut,
  Text,
  config,
} from 'folds';
import FocusTrap from 'focus-trap-react';

import { useDebounce } from '../../hooks/useDebounce';

export function ServerPicker({
  defaultServer,
  serverList,
  allowCustomServer,
  onServerChange,
}: {
  defaultServer: string;
  serverList: string[];
  allowCustomServer?: boolean;
  onServerChange: (server: string) => void;
}) {
  const [serverMenu, setServerMenu] = useState(false);
  const serverInputRef = useRef<HTMLInputElement>(null);

  const handleServerChange: ChangeEventHandler<HTMLInputElement> = useDebounce(
    useCallback(
      (evt) => {
        const inputServer = evt.target.value.trim();
        if (inputServer) onServerChange(inputServer);
      },
      [onServerChange]
    ),
    { wait: 700 }
  );

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (evt) => {
    if (evt.key === 'ArrowDown') {
      evt.preventDefault();
      setServerMenu(true);
    }
  };

  const handleServerSelect: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const selectedServer = evt.currentTarget.getAttribute('data-server');
    if (selectedServer) {
      const serverInput = serverInputRef.current;
      if (serverInput) {
        serverInput.value = selectedServer;
      }
      onServerChange(selectedServer);
    }
    setServerMenu(false);
  };

  return (
    <Input
      ref={serverInputRef}
      style={{ paddingRight: config.space.S200 }}
      variant={allowCustomServer ? 'Background' : 'Surface'}
      outlined
      defaultValue={defaultServer}
      onChange={handleServerChange}
      onKeyDown={handleKeyDown}
      size="500"
      readOnly={!allowCustomServer}
      onClick={allowCustomServer ? undefined : () => setServerMenu(true)}
      after={
        serverList.length === 0 || (serverList.length === 1 && !allowCustomServer) ? undefined : (
          <PopOut
            open={serverMenu}
            position="Bottom"
            align="End"
            offset={4}
            content={
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  onDeactivate: () => setServerMenu(false),
                  clickOutsideDeactivates: true,
                  isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                  isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                }}
              >
                <Menu>
                  <Header size="300" style={{ padding: `0 ${config.space.S200}` }}>
                    <Text size="L400">Homeserver List</Text>
                  </Header>
                  <div style={{ padding: config.space.S100, paddingTop: 0 }}>
                    {serverList?.map((server) => (
                      <MenuItem
                        key={server}
                        radii="300"
                        aria-pressed={server === serverInputRef.current?.value}
                        data-server={server}
                        onClick={handleServerSelect}
                      >
                        <Text>{server}</Text>
                      </MenuItem>
                    ))}
                  </div>
                </Menu>
              </FocusTrap>
            }
          >
            {(anchorRef) => (
              <IconButton
                ref={anchorRef}
                onClick={() => setServerMenu(true)}
                variant={allowCustomServer ? 'Background' : 'Surface'}
                size="300"
                aria-pressed={serverMenu}
                radii="300"
              >
                <Icon src={Icons.ChevronBottom} />
              </IconButton>
            )}
          </PopOut>
        )
      }
    />
  );
}
