/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { ReactNode } from 'react';

export type EventRenderer<T extends unknown[]> = (...args: T) => ReactNode;

export type EventRendererOpts<T extends unknown[]> = Record<string, EventRenderer<T>>;

export type RenderMatrixEvent<T extends unknown[]> = (
  eventType: string,
  isStateEvent: boolean,
  ...args: T
) => ReactNode;

export const useMatrixEventRenderer =
  <T extends unknown[]>(
    typeToRenderer: EventRendererOpts<T>,
    renderStateEvent?: EventRenderer<T>,
    renderEvent?: EventRenderer<T>
  ): RenderMatrixEvent<T> =>
  (eventType, isStateEvent, ...args) => {
    const renderer = typeToRenderer[eventType];
    if (typeToRenderer[eventType]) return renderer(...args);

    if (isStateEvent && renderStateEvent) {
      return renderStateEvent(...args);
    }

    if (!isStateEvent && renderEvent) {
      return renderEvent(...args);
    }
    return null;
  };
