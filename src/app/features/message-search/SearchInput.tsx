import React, {
  FormEventHandler,
  KeyboardEventHandler,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  useEffect,
  ChangeEventHandler,
} from 'react';
import { Box, Text, Icon, Icons, Spinner, Chip, IconButton, config, toRem } from 'folds';
import { parseSearchQuery } from '../encrypted-search/search/searchQueryParser';

export type FilterKey =
  | 'from'
  | 'mentions'
  | 'has'
  | 'before'
  | 'after'
  | 'during'
  | 'pinned'
  | 'in';

type FiltersState = Partial<Record<FilterKey, string>>;

export type SearchInputHandle = {
  insertSnippet: (snippet: string) => void;
  reset: () => void;
  focus: () => void;
};

const FILTER_LABELS: Record<FilterKey, string> = {
  from: 'from:',
  mentions: 'mentions:',
  has: 'has:',
  before: 'before:',
  after: 'after:',
  during: 'during:',
  pinned: 'pinned:',
  in: 'in:',
};

const FILTER_ORDER: FilterKey[] = [
  'from',
  'mentions',
  'in',
  'has',
  'before',
  'after',
  'during',
  'pinned',
];

const FILTER_REGEX = /(from|mentions|has|before|after|during|pinned|in):("[^"]+"|\S+)/gi;

const stripQuotes = (value: string) =>
  value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;

const formatTimestamp = (timestamp: number) => {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const normalizeDuring = (during?: { year: number; month?: number }) => {
  if (!during) return undefined;
  if (during.month) {
    return `${during.year}-${during.month.toString().padStart(2, '0')}`;
  }
  return String(during.year);
};

const composeQuery = (filters: FiltersState, text: string) => {
  const parts: string[] = [];
  FILTER_ORDER.forEach((key) => {
    const value = filters[key];
    if (value) {
      parts.push(`${key}:${value}`);
    }
  });
  if (text.trim()) {
    parts.push(text.trim());
  }
  return parts.join(' ').trim();
};

const applySnippet = (snippet: string): { key?: FilterKey; value?: string } => {
  const match = snippet.match(/^(from|mentions|has|before|after|during|pinned|in):(.+)$/i);
  if (!match) return {};
  const key = match[1].toLowerCase() as FilterKey;
  const value = stripQuotes(match[2].trim());
  if (!value) return {};
  return { key, value };
};

const extractFiltersFromInput = (text: string) => {
  const matches: { key: FilterKey; value: string; start: number; end: number }[] = [];
  FILTER_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null = null;
  while ((match = FILTER_REGEX.exec(text)) !== null) {
    const key = match[1].toLowerCase() as FilterKey;
    const value = stripQuotes(match[2].trim());
    matches.push({
      key,
      value,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  if (matches.length === 0) {
    return { cleaned: text, parsed: [] as typeof matches };
  }

  let cursor = 0;
  let cleaned = '';
  matches.forEach((m) => {
    cleaned += text.slice(cursor, m.start);
    cursor = m.end;
  });
  cleaned += text.slice(cursor);

  return { cleaned: cleaned.replace(/\s{2,}/g, ' ').replace(/^\s+/, ''), parsed: matches };
};

const parseInitialValue = (value?: string): { filters: FiltersState; text: string } => {
  if (!value) return { filters: {}, text: '' };
  try {
    const parsed = parseSearchQuery(value);
    const filters: FiltersState = {};
    if (parsed.from) filters.from = parsed.from;
    if (parsed.mentions) filters.mentions = parsed.mentions;
    if (parsed.in) filters.in = parsed.in;
    if (parsed.has) filters.has = parsed.has;
    if (parsed.before) filters.before = formatTimestamp(parsed.before);
    if (parsed.after) filters.after = formatTimestamp(parsed.after);
    if (parsed.during) filters.during = normalizeDuring(parsed.during);
    if (parsed.pinned !== undefined) filters.pinned = String(parsed.pinned);

    return {
      filters,
      text: parsed.text ?? '',
    };
  } catch {
    return { filters: {}, text: value };
  }
};

type SearchProps = {
  active?: boolean;
  loading?: boolean;
  initialValue?: string;
  onSearch: (term: string) => void;
  onReset: () => void;
};

export const SearchInput = forwardRef<SearchInputHandle, SearchProps>(
  ({ active, loading, initialValue, onSearch, onReset }, ref) => {
    const [filters, setFilters] = useState<FiltersState>(() => parseInitialValue(initialValue).filters);
    const [inputValue, setInputValue] = useState(() => parseInitialValue(initialValue).text);
    const inputRef = useRef<HTMLInputElement>(null);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
      const { filters: initialFilters, text } = parseInitialValue(initialValue);
      setFilters(initialFilters);
      setInputValue(text);
    }, [initialValue]);

    const buildFilterOnlyQuery = () =>
      FILTER_ORDER.filter((key) => !!filters[key])
        .map((key) => `${key}:${filters[key]}`)
        .join(' ')
        .trim();

    const submitCurrentQuery = () => {
      const term = composeQuery(filters, inputValue);
      if (term) {
        onSearch(term);
        return;
      }
      const filterOnlyQuery = buildFilterOnlyQuery();
      if (filterOnlyQuery) {
        onSearch(filterOnlyQuery);
      }
    };

    const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
      evt.preventDefault();
      submitCurrentQuery();
    };

    const handleFormKeyDown: KeyboardEventHandler<HTMLFormElement> = (evt) => {
      if (evt.key === 'Enter' && evt.target !== inputRef.current) {
        evt.preventDefault();
        inputRef.current?.focus();
        submitCurrentQuery();
      }
    };
    const handleFilterChipKeyDown: KeyboardEventHandler<HTMLButtonElement> = (evt) => {
      if (evt.key === 'Enter') {
        evt.preventDefault();
        evt.stopPropagation();
        inputRef.current?.focus();
        submitCurrentQuery();
      }
    };

    const handleActionButtonKeyDown: KeyboardEventHandler<HTMLButtonElement> = (evt) => {
      if (evt.key === 'Enter') {
        evt.preventDefault();
        inputRef.current?.focus();
        submitCurrentQuery();
      }
    };

    const handleInputKeyDown: KeyboardEventHandler<HTMLInputElement> = (evt) => {
      if (evt.key === 'Backspace' && inputValue.length === 0) {
        const lastKey = [...FILTER_ORDER].reverse().find((key) => filters[key]);
        if (lastKey) {
          evt.preventDefault();
          removeFilter(lastKey);
        }
      }
    };

    const handleChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
      const raw = evt.currentTarget.value;
      const { cleaned, parsed } = extractFiltersFromInput(raw);
      if (parsed.length > 0) {
        setFilters((prev) => {
          const updated = { ...prev };
          parsed.forEach(({ key, value }) => {
            updated[key] = value;
          });
          return updated;
        });
      }
      setInputValue(cleaned);
    };

    const removeFilter = (key: FilterKey) => {
      setFilters((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    };

    const resetFields = () => {
      setFilters({});
      setInputValue('');
      inputRef.current?.focus();
    };

    const handleClear = () => {
      resetFields();
      onReset();
    };

    useImperativeHandle(
      ref,
      () => ({
        insertSnippet: (snippet: string) => {
          const { key, value } = applySnippet(snippet);
          if (key && value) {
            setFilters((prev) => ({ ...prev, [key]: value }));
            inputRef.current?.focus();
          } else {
            setInputValue((prev) => `${prev} ${snippet}`.trim());
          }
        },
        reset: resetFields,
        focus: () => inputRef.current?.focus(),
      }),
      []
    );

    const orderedFilters = FILTER_ORDER.filter((key) => !!filters[key]);

    return (
      <Box
        as="form"
        direction="Column"
        gap="100"
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
      >
        <span data-spacing-node />
        <Text size="L400">Search</Text>
        <Box
          style={{
            borderRadius: config.radii.R400,
            border: `1px solid ${
              focused ? 'var(--bg-surface-normal)' : 'var(--bg-surface-border)'
            }`,
            backgroundColor: 'var(--bg-surface)',
            padding: `${config.space.S100} ${config.space.S150 ?? config.space.S200}`,
            display: 'flex',
            alignItems: 'center',
            gap: config.space.S200,
            minHeight: toRem(40),
            transition: 'border-color 150ms ease',
            flexWrap: 'wrap',
            boxShadow: focused ? '0 6px 18px rgba(0, 0, 0, 0.08)' : 'none',
          }}
          onClick={() => inputRef.current?.focus()}
        >
          {loading ? <Spinner variant="Secondary" size="200" /> : <Icon size="200" src={Icons.Search} />}
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: config.space.S150,
              flexGrow: 1,
              minHeight: toRem(28),
            }}
          >
            {orderedFilters.map((key) => (
              <Chip
                as="div"
                key={key}
                variant="Surface"
                radii="Pill"
                size="200"
                after={
                  <IconButton
                    type="button"
                    size="200"
                    variant="Surface"
                    radii="Pill"
                    aria-label={`Remove ${key} filter`}
                    onClick={(evt) => {
                      evt.stopPropagation();
                      evt.preventDefault();
                      removeFilter(key);
                    }}
                    onKeyDown={handleFilterChipKeyDown}
                  >
                    <Icon size="100" src={Icons.Cross} />
                  </IconButton>
                }
              >
                <Text size="T200" priority="300">
                  {FILTER_LABELS[key]} {filters[key]}
                </Text>
              </Chip>
            ))}
            <input
              ref={inputRef}
              value={inputValue}
              onChange={handleChange}
              onKeyDown={handleInputKeyDown}
              placeholder="Search for keyword"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                font: 'inherit',
                color: 'inherit',
                minWidth: toRem(80),
                flexGrow: 1,
              }}
            />
            <button type="submit" aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} />
          </Box>
          {active && (
            <Chip
              type="button"
              variant="Secondary"
              size="400"
              radii="Pill"
              outlined
              after={<Icon size="50" src={Icons.Cross} />}
              onClick={(evt) => {
                evt.preventDefault();
                handleClear();
              }}
              onKeyDown={handleActionButtonKeyDown}
            >
              <Text size="B300">Clear</Text>
            </Chip>
          )}
          {!active && (
            <Chip type="submit" variant="Primary" size="400" radii="Pill" outlined>
              <Text size="B300">Enter</Text>
            </Chip>
          )}
        </Box>
      </Box>
    );
  }
);

SearchInput.displayName = 'SearchInput';
