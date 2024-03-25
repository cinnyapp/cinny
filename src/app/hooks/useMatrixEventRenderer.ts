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
