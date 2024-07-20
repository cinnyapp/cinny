import React from 'react';
import { as, Chip, Icon, Icons, Text } from 'folds';
import classNames from 'classnames';
import * as css from './styles.css';

export const RoomNavCategoryButton = as<'button', { closed?: boolean }>(
  ({ className, closed, children, ...props }, ref) => (
    <Chip
      className={classNames(css.CategoryButton, className)}
      variant="Background"
      radii="Pill"
      before={
        <Icon
          className={css.CategoryButtonIcon}
          size="50"
          src={closed ? Icons.ChevronRight : Icons.ChevronBottom}
        />
      }
      {...props}
      ref={ref}
    >
      <Text size="O400" priority="300" truncate>
        {children}
      </Text>
    </Chip>
  )
);
