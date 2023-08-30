import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MatchHandler,
  AsyncSearch,
  AsyncSearchHandler,
  AsyncSearchOption,
  MatchQueryOption,
  NormalizeOption,
  normalize,
  matchQuery,
  ResultHandler,
} from '../utils/AsyncSearch';

export type UseAsyncSearchOptions = AsyncSearchOption & {
  matchOptions?: MatchQueryOption;
  normalizeOptions?: NormalizeOption;
};

export type SearchItemStrGetter<TSearchItem extends object | string | number> = (
  searchItem: TSearchItem
) => string | string[];

export type UseAsyncSearchResult<TSearchItem extends object | string | number> = {
  query: string;
  items: TSearchItem[];
};

export type SearchResetHandler = () => void;

export const useAsyncSearch = <TSearchItem extends object | string | number>(
  list: TSearchItem[],
  getItemStr: SearchItemStrGetter<TSearchItem>,
  options?: UseAsyncSearchOptions
): [UseAsyncSearchResult<TSearchItem> | undefined, AsyncSearchHandler, SearchResetHandler] => {
  const [result, setResult] = useState<UseAsyncSearchResult<TSearchItem>>();

  const [searchCallback, terminateSearch] = useMemo(() => {
    setResult(undefined);

    const handleMatch: MatchHandler<TSearchItem> = (item, query) => {
      const itemStr = getItemStr(item);
      if (Array.isArray(itemStr))
        return !!itemStr.find((i) =>
          matchQuery(normalize(i, options?.normalizeOptions), query, options?.matchOptions)
        );
      return matchQuery(
        normalize(itemStr, options?.normalizeOptions),
        query,
        options?.matchOptions
      );
    };

    const handleResult: ResultHandler<TSearchItem> = (results, query) =>
      setResult({
        query,
        items: [...results],
      });

    return AsyncSearch(list, handleMatch, handleResult, options);
  }, [list, options, getItemStr]);

  const searchHandler: AsyncSearchHandler = useCallback(
    (query) => {
      const normalizedQuery = normalize(query, options?.normalizeOptions);
      searchCallback(normalizedQuery);
    },
    [searchCallback, options?.normalizeOptions]
  );

  const resetHandler: SearchResetHandler = useCallback(() => {
    terminateSearch();
    setResult(undefined);
  }, [terminateSearch]);

  useEffect(
    () => () => {
      // terminate any ongoing search request on unmount.
      terminateSearch();
    },
    [terminateSearch]
  );

  return [result, searchHandler, resetHandler];
};
