import React from 'react';
import { as, toRem } from 'folds';
import { randomNumberBetween } from '../../../utils/common';
import { LinePlaceholder } from './LinePlaceholder';
import { CompactLayout, MessageBase } from '../layout';

export const CompactPlaceholder = as<'div'>(({ ...props }, ref) => (
  <MessageBase>
    <CompactLayout
      {...props}
      ref={ref}
      before={
        <>
          <LinePlaceholder style={{ maxWidth: toRem(50) }} />
          <LinePlaceholder style={{ maxWidth: toRem(randomNumberBetween(40, 100)) }} />
        </>
      }
    >
      <LinePlaceholder style={{ maxWidth: toRem(randomNumberBetween(120, 500)) }} />
    </CompactLayout>
  </MessageBase>
));
