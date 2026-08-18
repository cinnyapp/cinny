import React from 'react';
import { as, Box, Chip, Icon, Icons, Text } from 'folds';
import classNames from 'classnames';
import * as css from './styles.css';

export const TimelineFloat = as<'div', css.TimelineFloatVariants>(
  ({ position, className, ...props }, ref) => (
    <Box
      className={classNames(css.TimelineFloat({ position }), className)}
      justifyContent="Center"
      alignItems="Center"
      gap="200"
      {...props}
      ref={ref}
    />
  )
);

type UnreadControlsProps = {
  onJumpToUnread?: () => void;
  onMarkAsRead: () => void;
};
export function UnreadControls({ onJumpToUnread, onMarkAsRead }: UnreadControlsProps) {
  return (
    <TimelineFloat position="Top">
      {onJumpToUnread && (
        <Chip
          variant="Primary"
          radii="Pill"
          outlined
          before={<Icon size="50" src={Icons.MessageUnread} />}
          onClick={onJumpToUnread}
        >
          <Text size="L400">Jump to Unread</Text>
        </Chip>
      )}

      <Chip
        variant="SurfaceVariant"
        radii="Pill"
        outlined
        before={<Icon size="50" src={Icons.CheckTwice} />}
        onClick={onMarkAsRead}
      >
        <Text size="L400">Mark as Read</Text>
      </Chip>
    </TimelineFloat>
  );
}
