import React from 'react';
import { Box, Text, as } from 'folds';
import classNames from 'classnames';
import { MatrixClient } from 'matrix-js-sdk';
import * as css from './Reaction.css';

export const Reaction = as<
  'button',
  {
    mx: MatrixClient;
    count: number;
    reaction: string;
  }
>(({ className, mx, count, reaction, ...props }, ref) => (
  <Box
    as="button"
    className={classNames(css.Reaction, className)}
    alignItems="Center"
    shrink="No"
    gap="200"
    {...props}
    ref={ref}
  >
    <Text className={css.ReactionText} as="span" size="T500">
      {reaction.startsWith('mxc://') ? (
        <img
          className={css.ReactionImg}
          src={mx.mxcUrlToHttp(reaction) ?? reaction}
          alt={reaction}
        />
      ) : (
        <Text as="span" size="Inherit" truncate>
          {reaction}
        </Text>
      )}
    </Text>
    <Text as="span" size="T300">
      {count}
    </Text>
  </Box>
));
