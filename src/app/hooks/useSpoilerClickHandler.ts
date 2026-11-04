/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { ReactEventHandler, useCallback } from 'react';

export const useSpoilerClickHandler = (): ReactEventHandler<HTMLElement> => {
  const handleClick: ReactEventHandler<HTMLElement> = useCallback((evt) => {
    const target = evt.currentTarget;
    if (target.getAttribute('aria-pressed') === 'true') {
      evt.stopPropagation();
      target.setAttribute('aria-pressed', 'false');
      target.style.cursor = 'initial';
    }
  }, []);

  return handleClick;
};
