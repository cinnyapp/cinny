// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import millifyPlugin from 'millify';
import { MillifyOptions } from 'millify/dist/options';

export const millify = (count: number, options?: Partial<MillifyOptions>): string =>
  millifyPlugin(count, {
    precision: 1,
    locales: [],
    ...options,
  });
