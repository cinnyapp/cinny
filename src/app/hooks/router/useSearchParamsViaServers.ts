import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getRoomSearchParams } from '../../pages/pathSearchParam';
import { decodeSearchParamValueArray } from '../../pages/pathUtils';

export const useSearchParamsViaServers = (): string[] | undefined => {
  const [searchParams] = useSearchParams();
  const roomSearchParams = useMemo(() => getRoomSearchParams(searchParams), [searchParams]);
  const viaServers = roomSearchParams.viaServers
    ? decodeSearchParamValueArray(roomSearchParams.viaServers)
    : undefined;

  return viaServers;
};
