import React from 'react';
import { as, toRem } from 'folds';
import { randomNumberBetween } from '../../utils/common';
import { MessagePlaceholderLine } from './MessagePlaceholder';
import { CompactMessage } from './CompactMessage';

export const CompactMessagePlaceholder = as<'div'>(({ ...props }, ref) => (
  <CompactMessage {...props} ref={ref}>
    <MessagePlaceholderLine style={{ maxWidth: toRem(65) }} />
    <MessagePlaceholderLine style={{ maxWidth: toRem(randomNumberBetween(40, 120)) }} />
    <MessagePlaceholderLine style={{ maxWidth: toRem(randomNumberBetween(120, 500)) }} />
  </CompactMessage>
));
