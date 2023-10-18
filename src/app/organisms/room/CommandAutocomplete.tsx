import React, { KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo } from 'react';
import { Editor } from 'slate';
import { Box, MenuItem, Text } from 'folds';
import { Room } from 'matrix-js-sdk';
import { Command, useCommands } from '../../hooks/useCommands';
import {
  AutocompleteMenu,
  AutocompleteQuery,
  createCommandElement,
  moveCursor,
  replaceWithElement,
} from '../../components/editor';
import { UseAsyncSearchOptions, useAsyncSearch } from '../../hooks/useAsyncSearch';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useKeyDown } from '../../hooks/useKeyDown';
import { onTabPress } from '../../utils/keyboard';

type CommandAutoCompleteHandler = (commandName: string) => void;

type CommandAutocompleteProps = {
  room: Room;
  editor: Editor;
  query: AutocompleteQuery<string>;
  requestClose: () => void;
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  matchOptions: {
    contain: true,
  },
};

export function CommandAutocomplete({
  room,
  editor,
  query,
  requestClose,
}: CommandAutocompleteProps) {
  const mx = useMatrixClient();
  const commands = useCommands(mx, room);
  const commandNames = useMemo(() => Object.keys(commands) as Command[], [commands]);

  const [result, search, resetSearch] = useAsyncSearch(
    commandNames,
    useCallback((commandName: string) => commandName, []),
    SEARCH_OPTIONS
  );

  const autoCompleteNames = result ? result.items : commandNames;

  useEffect(() => {
    if (query.text) search(query.text);
    else resetSearch();
  }, [query.text, search, resetSearch]);

  const handleAutocomplete: CommandAutoCompleteHandler = (commandName) => {
    const cmdEl = createCommandElement(commandName);
    replaceWithElement(editor, query.range, cmdEl);
    moveCursor(editor, true);
    requestClose();
  };

  useKeyDown(window, (evt: KeyboardEvent) => {
    onTabPress(evt, () => {
      if (autoCompleteNames.length === 0) {
        return;
      }
      const cmdName = autoCompleteNames[0];
      handleAutocomplete(cmdName);
    });
  });

  return autoCompleteNames.length === 0 ? null : (
    <AutocompleteMenu
      headerContent={
        <Box grow="Yes" direction="Row" gap="200" justifyContent="SpaceBetween">
          <Text size="L400">Commands</Text>
          <Text size="T200" priority="300" truncate>
            Begin your message with command
          </Text>
        </Box>
      }
      requestClose={requestClose}
    >
      {autoCompleteNames.map((commandName) => (
        <MenuItem
          key={commandName}
          as="button"
          radii="300"
          onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) =>
            onTabPress(evt, () => handleAutocomplete(commandName))
          }
          onClick={() => handleAutocomplete(commandName)}
        >
          <Box grow="Yes" direction="Row" gap="200" justifyContent="SpaceBetween">
            <Box shrink="No">
              <Text style={{ flexGrow: 1 }} size="B400" truncate>
                {`/${commandName}`}
              </Text>
            </Box>
            <Text truncate priority="300" size="T200">
              {commands[commandName].description}
            </Text>
          </Box>
        </MenuItem>
      ))}
    </AutocompleteMenu>
  );
}
