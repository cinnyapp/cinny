/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, { ReactNode } from 'react';
import classNames from 'classnames';
import { Box, ContainerColor, as, color } from 'folds';
import * as css from './layout.css';

type BubbleArrowProps = {
  variant: ContainerColor;
  side?: 'left' | 'right';
};
function BubbleArrow({ variant, side = 'left' }: BubbleArrowProps) {
  return (
    <svg
      className={side === 'right' ? css.BubbleRightArrow : css.BubbleLeftArrow}
      width="9"
      height="8"
      viewBox="0 0 9 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.00004 8V0H4.82847C3.04666 0 2.15433 2.15428 3.41426 3.41421L8.00004 8H9.00004Z"
        fill={side === 'right' ? color.Secondary.ContainerHover : color[variant].Container}
      />
    </svg>
  );
}

type BubbleLayoutProps = {
  hideBubble?: boolean;
  before?: ReactNode;
  header?: ReactNode;
  own?: boolean;
};

export const BubbleLayout = as<'div', BubbleLayoutProps>(
  ({ hideBubble, before, header, own, children, ...props }, ref) => (
    <Box gap="300" direction={own ? 'RowReverse' : 'Row'} {...props} ref={ref}>
      <Box className={css.BubbleBefore} shrink="No">
        {before}
      </Box>
      <Box grow="Yes" direction="Column">
        {header}
        {hideBubble ? (
          children
        ) : (
          <Box>
            <Box
              className={classNames(css.BubbleContent, {
                [css.BubbleContentOwn]: own,
                [css.BubbleContentArrowLeft]: before && !own,
                [css.BubbleContentArrowRight]: before && own,
              })}
              direction="Column"
            >
              {before ? (
                <BubbleArrow variant="SurfaceVariant" side={own ? 'right' : 'left'} />
              ) : null}
              {children}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
);
