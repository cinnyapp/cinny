import React from 'react';
import { as } from 'folds';
import classNames from 'classnames';
import * as css from './layout.css';

export const MessageBase = as<'div', css.MessageBaseVariants>(
  ({ className, highlight, collapse, space, ...props }, ref) => (
    <div
      className={classNames(css.MessageBase({ highlight, collapse, space }), className)}
      {...props}
      ref={ref}
    />
  )
);
