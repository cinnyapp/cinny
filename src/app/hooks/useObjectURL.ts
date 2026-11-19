/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useEffect, useMemo } from 'react';

export const useObjectURL = (object?: Blob): string | undefined => {
  const url = useMemo(() => {
    if (object) return URL.createObjectURL(object);
    return undefined;
  }, [object]);

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url]
  );

  return url;
};
