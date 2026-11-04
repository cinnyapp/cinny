// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { ObjectReader } from 'neurone/lib/utils';

export class rError {
  static error(data?: unknown): string | undefined {
    return ObjectReader.string(data, 'error');
  }

  static errcode(data?: unknown): string | undefined {
    return ObjectReader.string(data, 'errcode');
  }

  static retryAfterMs(data?: unknown): number | undefined {
    return ObjectReader.number(data, 'retry_after_ms');
  }
}
