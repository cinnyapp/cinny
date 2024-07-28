import { _RoomSearchParams } from './paths';

type SearchParamsGetter<T> = (searchParams: URLSearchParams) => T;

export const getRoomSearchParams: SearchParamsGetter<_RoomSearchParams> = (searchParams) => ({
  viaServers: searchParams.get('viaServers') ?? undefined,
});
