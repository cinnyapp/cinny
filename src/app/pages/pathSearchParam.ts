/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { _RoomSearchParams, DirectCreateSearchParams } from './paths';

type SearchParamsGetter<T> = (searchParams: URLSearchParams) => T;

export const getRoomSearchParams: SearchParamsGetter<_RoomSearchParams> = (searchParams) => ({
  viaServers: searchParams.get('viaServers') ?? undefined,
});

export const getDirectCreateSearchParams: SearchParamsGetter<DirectCreateSearchParams> = (
  searchParams
) => ({
  userId: searchParams.get('userId') ?? undefined,
});
