import { useCallback, useMemo, useState } from 'react';
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

export type ItemStrGetter<TSearchItem extends object | string> = (
  searchItem: TSearchItem
) => string | string[];

export type UseAsyncSearchResult<TSearchItem extends object | string> = {
  query: string;
  items: TSearchItem[];
};

export const useAsyncSearch = <TSearchItem extends object | string>(
  list: TSearchItem[],
  getItemStr: ItemStrGetter<TSearchItem>,
  options?: UseAsyncSearchOptions
): [UseAsyncSearchResult<TSearchItem> | undefined, AsyncSearchHandler] => {
  const [result, setResult] = useState<UseAsyncSearchResult<TSearchItem>>();

  const searchCallback = useMemo(() => {
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
        items: results,
      });

    return AsyncSearch(list, handleMatch, handleResult, options);
  }, [list, options, getItemStr]);

  const searchHandler: AsyncSearchHandler = useCallback(
    (query) => {
      searchCallback(normalize(query, options?.normalizeOptions));
    },
    [searchCallback, options?.normalizeOptions]
  );

  return [result, searchHandler];
};
