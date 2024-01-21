import React, {
  ChangeEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  useEffect,
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
  server,
  serverList,
  allowCustomServer,
  onServerChange,
}: {
  server: string;
  serverList: string[];
  allowCustomServer?: boolean;
  onServerChange: (server: string) => void;
}) {
  const [serverMenu, setServerMenu] = useState(false);
  const serverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // sync input with it outside server changes
    if (serverInputRef.current && serverInputRef.current.value !== server) {
      serverInputRef.current.value = server;
    }
  }, [server]);

  const debounceServerSelect = useDebounce(onServerChange, { wait: 700 });

  const handleServerChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const inputServer = evt.target.value.trim();
    if (inputServer) debounceServerSelect(inputServer);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (evt) => {
    if (evt.key === 'ArrowDown') {
      evt.preventDefault();
      setServerMenu(true);
    }
    if (evt.key === 'Enter') {
      evt.preventDefault();
      const inputServer = evt.currentTarget.value.trim();
      if (inputServer) onServerChange(inputServer);
    }
  };

  const handleServerSelect: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const selectedServer = evt.currentTarget.getAttribute('data-server');
    if (selectedServer) {
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
      defaultValue={server}
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
                    {serverList?.map((serverName) => (
                      <MenuItem
                        key={serverName}
                        radii="300"
                        aria-pressed={serverName === server}
                        data-server={serverName}
                        onClick={handleServerSelect}
                      >
                        <Text>{serverName}</Text>
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
