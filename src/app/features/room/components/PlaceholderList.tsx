import React, { ComponentType, forwardRef } from 'react';
import { MessageBase } from '../../../components/message';

type PlaceholderListProps = {
  count: number;
  Placeholder: ComponentType;
};

export const PlaceholderList = forwardRef<HTMLDivElement, PlaceholderListProps>(
  ({ count, Placeholder }, ref) => (
    <div ref={ref}>
      {Array.from({ length: count }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <MessageBase key={i}>
          <Placeholder />
        </MessageBase>
      ))}
    </div>
  )
);
