import React, { FormEventHandler, RefObject } from 'react';
import { Box, Text, Input, Icon, Icons, Spinner, Chip, config } from 'folds';

type SearchProps = {
  active?: boolean;
  loading?: boolean;
  searchInputRef: RefObject<HTMLInputElement>;
  onSearch: (term: string) => void;
  onReset: () => void;
};
export function SearchInput({ active, loading, searchInputRef, onSearch, onReset }: SearchProps) {
  const handleSearchSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const { searchInput } = evt.target as HTMLFormElement & {
      searchInput: HTMLInputElement;
    };

    const searchTerm = searchInput.value.trim() || undefined;
    if (searchTerm) {
      onSearch(searchTerm);
    }
  };

  return (
    <Box as="form" direction="Column" gap="100" onSubmit={handleSearchSubmit}>
      <span data-spacing-node />
      <Text size="L400">Search</Text>
      <Input
        ref={searchInputRef}
        style={{ paddingRight: config.space.S300 }}
        name="searchInput"
        size="500"
        variant="Background"
        placeholder="Search for keyword"
        autoComplete="off"
        before={
          active && loading ? (
            <Spinner variant="Secondary" size="200" />
          ) : (
            <Icon size="200" src={Icons.Search} />
          )
        }
        after={
          active ? (
            <Chip
              key="resetButton"
              type="reset"
              variant="Secondary"
              size="400"
              radii="Pill"
              outlined
              after={<Icon size="50" src={Icons.Cross} />}
              onClick={onReset}
            >
              <Text size="B300">Clear</Text>
            </Chip>
          ) : (
            <Chip type="submit" variant="Primary" size="400" radii="Pill" outlined>
              <Text size="B300">Enter</Text>
            </Chip>
          )
        }
      />
    </Box>
  );
}
