import React from 'react';
import { as, Badge, Box, color, ContainerColor, Line, Text } from 'folds';
import { MessageBase } from '../../../components/message';
import { timeDayMonthYear, today, yesterday } from '../../../utils/time';
import { MessageSpacing } from '../../../state/settings';

export const TimelineDivider = as<'div', { variant?: ContainerColor | 'Inherit' }>(
  ({ variant, children, ...props }, ref) => (
    <Box gap="100" justifyContent="Center" alignItems="Center" {...props} ref={ref}>
      <Line style={{ flexGrow: 1 }} variant={variant} size="300" />
      {children}
      <Line style={{ flexGrow: 1 }} variant={variant} size="300" />
    </Box>
  )
);

export function DayDivider({ messageSpacing, ts }: { messageSpacing: MessageSpacing; ts: number }) {
  return (
    <MessageBase space={messageSpacing}>
      <TimelineDivider variant="Surface">
        <Badge as="span" size="500" variant="Secondary" fill="None" radii="300">
          <Text size="L400">
            {(() => {
              if (today(ts)) return 'Today';
              if (yesterday(ts)) return 'Yesterday';
              return timeDayMonthYear(ts);
            })()}
          </Text>
        </Badge>
      </TimelineDivider>
    </MessageBase>
  );
}

export function NewMessageDivider({ messageSpacing }: { messageSpacing: MessageSpacing }) {
  return (
    <MessageBase space={messageSpacing}>
      <TimelineDivider style={{ color: color.Success.Main }} variant="Inherit">
        <Badge as="span" size="500" variant="Success" fill="Solid" radii="300">
          <Text size="L400">New Messages</Text>
        </Badge>
      </TimelineDivider>
    </MessageBase>
  );
}
