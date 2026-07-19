import React from 'react';
import { as, Avatar } from 'folds';
import classNames from 'classnames';
import * as css from './styles.css';

type StackedAvatarProps = {
  radii?: '0' | '300' | '400' | '500' | 'Pill' | 'Inherit' | undefined;
};
export const StackedAvatar = as<'span', css.StackedAvatarVariants & StackedAvatarProps>(
  ({ size, variant, className, ...props }, ref) => (
    <Avatar
      size={size}
      className={classNames(css.StackedAvatar({ size, variant }), className)}
      {...props}
      ref={ref}
    />
  )
);
