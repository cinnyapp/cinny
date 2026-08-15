import React, { ReactNode } from 'react';
import { as, Badge, Box, ContainerColor, Line, Text } from 'folds';
import classNames from 'classnames';
import { DividerTime, MessageBase } from '../../../components/message';
import { MessageSpacing } from '../../../state/settings';
import * as css from './styles.css';

export const TimelineDivider = as<
  'div',
  { variant?: ContainerColor | 'Inherit'; before?: ReactNode; after?: ReactNode }
>(({ className, variant, before, after, children, ...props }, ref) => (
  <Box
    className={classNames(css.TimelineDivider, className)}
    gap="0"
    justifyContent="Center"
    alignItems="Center"
    {...props}
    ref={ref}
  >
    {before}
    <Line style={{ flexGrow: 1 }} variant={variant} size="300" />
    <Box className={css.TimelineDividerCenterChild}>{children}</Box>
    {after}
  </Box>
));

type ComboDividerProps = {
  messageSpacing: MessageSpacing;
  ts?: number;
  replyCount?: number;
  unread?: boolean;
};
export function ComboDivider({ messageSpacing, ts, replyCount, unread }: ComboDividerProps) {
  return (
    <MessageBase space={messageSpacing}>
      <TimelineDivider
        variant={unread ? 'Critical' : 'Surface'}
        before={
          replyCount &&
          replyCount > 0 && (
            <Badge
              style={{ paddingLeft: 0 }}
              as="span"
              size="500"
              variant="Secondary"
              fill="None"
              radii="0"
            >
              <Text size="L400">
                {replyCount === 1 ? `${replyCount} Reply` : `${replyCount} Replies`}
              </Text>
            </Badge>
          )
        }
        after={
          unread && (
            <Badge as="span" size="500" variant="Critical" fill="Solid" radii="Pill">
              <Text size="L400">New</Text>
            </Badge>
          )
        }
      >
        {typeof ts === 'number' && (
          <Badge
            as="span"
            size="500"
            variant={unread ? 'Critical' : 'Secondary'}
            fill="None"
            radii="300"
          >
            <Text size="L400">
              <DividerTime ts={ts} />
            </Text>
          </Badge>
        )}
      </TimelineDivider>
    </MessageBase>
  );
}
