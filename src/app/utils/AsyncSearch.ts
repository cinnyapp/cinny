export type NormalizeOption = {
  caseSensitive?: boolean;
  normalizeUnicode?: boolean;
  ignoreWhitespace?: boolean;
};

export type MatchQueryOption = {
  contain?: boolean;
};

export type AsyncSearchOption = {
  limit?: number;
};

export type MatchHandler<TSearchItem extends object | string | number> = (
  item: TSearchItem,
  query: string
) => boolean;
export type ResultHandler<TSearchItem extends object | string | number> = (
  results: TSearchItem[],
  query: string
) => void;

export type AsyncSearchHandler = (query: string) => void;
export type TerminateAsyncSearch = () => void;

export const normalize = (str: string, options?: NormalizeOption) => {
  let nStr = str.normalize(options?.normalizeUnicode ?? true ? 'NFKC' : 'NFC');
  if (!options?.caseSensitive) nStr = nStr.toLocaleLowerCase();
  if (options?.ignoreWhitespace ?? true) nStr = nStr.replace(/\s/g, '');
  return nStr;
};

export const matchQuery = (item: string, query: string, options?: MatchQueryOption): boolean => {
  if (options?.contain) return item.indexOf(query) !== -1;
  return item.startsWith(query);
};

export const AsyncSearch = <TSearchItem extends object | string | number>(
  list: TSearchItem[],
  match: MatchHandler<TSearchItem>,
  onResult: ResultHandler<TSearchItem>,
  options?: AsyncSearchOption
): [AsyncSearchHandler, TerminateAsyncSearch] => {
  let resultList: TSearchItem[] = [];

  let searchIndex = 0;
  let sessionStartTimestamp = 0;
  let sessionScheduleId: number | undefined;

  const terminateSearch: TerminateAsyncSearch = () => {
    resultList = [];
    searchIndex = 0;
    sessionStartTimestamp = 0;
    if (sessionScheduleId) clearTimeout(sessionScheduleId);
    sessionScheduleId = undefined;
  };

  const find = (query: string, sessionTimestamp: number) => {
    const findingCount = resultList.length;
    sessionScheduleId = undefined;
    // return if find session got reset
    if (sessionTimestamp !== sessionStartTimestamp) return;

    sessionStartTimestamp = window.performance.now();
    for (; searchIndex < list.length; searchIndex += 1) {
      if (match(list[searchIndex], query)) {
        resultList.push(list[searchIndex]);
        if (typeof options?.limit === 'number' && resultList.length >= options.limit) {
          break;
        }
      }

      const matchFinishTime = window.performance.now();
      if (matchFinishTime - sessionStartTimestamp > 8) {
        const currentFindingCount = resultList.length;
        const thisSessionTimestamp = sessionStartTimestamp;
        if (findingCount !== currentFindingCount) onResult(resultList, query);

        searchIndex += 1;
        sessionScheduleId = window.setTimeout(() => find(query, thisSessionTimestamp), 1);
        return;
      }
    }

    if (findingCount !== resultList.length || findingCount === 0) {
      onResult(resultList, query);
    }
    terminateSearch();
  };

  const search: AsyncSearchHandler = (query: string) => {
    terminateSearch();
    if (query === '') {
      onResult(resultList, query);
      return;
    }
    find(query, sessionStartTimestamp);
  };

  return [search, terminateSearch];
};
