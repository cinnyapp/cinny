import React, {
  ChangeEventHandler,
  KeyboardEventHandler,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, Icon, IconButton, Icons, Input, MenuItem, Text } from 'folds';
import { highlightChunks } from './fuzzyMatch';
import { SettingsSearchResult, searchSettings } from './settingsIndex';
import * as css from './SettingsSearch.css';

export const useSettingsSearch = (query: string): SettingsSearchResult[] =>
  useMemo(() => searchSettings(query), [query]);

type SettingsSearchInputProps = {
  query: string;
  onQueryChange: (query: string) => void;
  /** Called when the user presses Enter / ArrowDown to act on the first result. */
  onSubmit?: () => void;
  onArrow?: (direction: 1 | -1) => void;
};

export const SettingsSearchInput = forwardRef<HTMLInputElement, SettingsSearchInputProps>(
  ({ query, onQueryChange, onSubmit, onArrow }, ref) => {
    const handleChange: ChangeEventHandler<HTMLInputElement> = (evt) =>
      onQueryChange(evt.currentTarget.value);

    const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (evt) => {
      if (evt.key === 'Escape') {
        if (query) {
          // First Escape clears the field; a second one is left to the dialog
          // so it can still close Settings.
          evt.preventDefault();
          evt.stopPropagation();
          onQueryChange('');
        }
        return;
      }
      if (evt.key === 'Enter') {
        evt.preventDefault();
        onSubmit?.();
        return;
      }
      if (evt.key === 'ArrowDown') {
        evt.preventDefault();
        onArrow?.(1);
        return;
      }
      if (evt.key === 'ArrowUp') {
        evt.preventDefault();
        onArrow?.(-1);
      }
    };

    return (
      <Box className={css.SearchBox} shrink="No" direction="Column">
        <Input
          ref={ref}
          variant="SurfaceVariant"
          size="300"
          radii="400"
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search settings"
          aria-label="Search settings"
          autoComplete="off"
          before={<Icon size="100" src={Icons.Search} />}
          after={
            query ? (
              <IconButton
                size="300"
                radii="300"
                variant="SurfaceVariant"
                onClick={() => onQueryChange('')}
                aria-label="Clear search"
                title="Clear"
              >
                <Icon size="100" src={Icons.Cross} />
              </IconButton>
            ) : undefined
          }
        />
      </Box>
    );
  }
);

type HighlightedProps = {
  text: string;
  ranges?: { start: number; end: number }[];
};
/** Renders `text` with the matched parts wrapped in a highlight span. */
function Highlighted({ text, ranges }: HighlightedProps) {
  const chunks = ranges && ranges.length > 0 ? highlightChunks(text, ranges) : [];
  if (chunks.length === 0) return <span>{text}</span>;
  return (
    <span>
      {chunks.map((chunk, i) =>
        chunk.hit ? (
          // eslint-disable-next-line react/no-array-index-key
          <span key={i} className={css.Hit}>
            {chunk.text}
          </span>
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <React.Fragment key={i}>{chunk.text}</React.Fragment>
        )
      )}
    </span>
  );
}

type SettingsSearchResultsProps = {
  query: string;
  activeIndex: number;
  onSelect: (result: SettingsSearchResult) => void;
};

export function SettingsSearchResults({
  query,
  activeIndex,
  onSelect,
}: SettingsSearchResultsProps) {
  const results = useSettingsSearch(query);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (results.length === 0) {
    return (
      <Box className={css.EmptyState} direction="Column" gap="100">
        <Text size="T300" priority="300">
          No settings match
        </Text>
        <Text size="T200" priority="300">
          {`“${query}”`}
        </Text>
      </Box>
    );
  }

  return (
    <div ref={listRef} className={css.ResultList}>
      {results.map((result, index) => {
        const { entry } = result;
        const context = entry.section ? `${entry.pageName} › ${entry.section}` : entry.pageName;
        return (
          <MenuItem
            key={`${entry.page}-${entry.title}`}
            className={css.ResultItem}
            variant="Background"
            radii="400"
            data-active={index === activeIndex}
            aria-selected={index === activeIndex}
            aria-pressed={index === activeIndex}
            onClick={() => onSelect(result)}
          >
            <Box direction="Column" gap="100">
              <Text size="T300" truncate>
                <Highlighted text={entry.title} ranges={result.titleMatch?.ranges} />
              </Text>
              <Text size="T200" priority="300" truncate>
                {context}
              </Text>
            </Box>
          </MenuItem>
        );
      })}
    </div>
  );
}

/**
 * Keeps the query + the keyboard cursor over the result list.
 */
export const useSettingsSearchState = () => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useSettingsSearch(query);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const move = (direction: 1 | -1) => {
    setActiveIndex((current) => {
      if (results.length === 0) return 0;
      const next = current + direction;
      if (next < 0) return results.length - 1;
      if (next >= results.length) return 0;
      return next;
    });
  };

  return {
    query,
    setQuery,
    results,
    activeIndex,
    setActiveIndex,
    move,
    active: results[activeIndex],
  };
};
