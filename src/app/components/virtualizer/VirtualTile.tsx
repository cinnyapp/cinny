import { VirtualItem } from '@tanstack/react-virtual';
import { as } from 'folds';
import React from 'react';
import classNames from 'classnames';
import * as css from './style.css';

type VirtualTileProps = {
  virtualItem: VirtualItem;
};
export const VirtualTile = as<'div', VirtualTileProps>(
  ({ className, virtualItem, style, ...props }, ref) => (
    <div
      className={classNames(css.VirtualTile, className)}
      style={{ top: virtualItem.start, ...style }}
      data-index={virtualItem.index}
      {...props}
      ref={ref}
    />
  )
);
