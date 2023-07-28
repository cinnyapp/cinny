import React from 'react';
import { Box, Text, as } from 'folds';
import classNames from 'classnames';
import { MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk';
import * as css from './Reaction.css';
import { getHexcodeForEmoji, getShortcodeFor } from '../../plugins/emoji';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';

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
    <Text className={css.ReactionText} as="span" size="T400">
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
      <b>{count}</b>
    </Text>
  </Box>
));

type ReactionTooltipMsgProps = {
  room: Room;
  reaction: string;
  events: MatrixEvent[];
};

const eventWithShortcode = (ev: MatrixEvent) => typeof ev.getContent().shortcode === 'string';
const factoryToSenderName = (room: Room) => (ev: MatrixEvent) =>
  getMemberDisplayName(room, ev.getSender() ?? 'Unknown') ??
  getMxIdLocalPart(ev.getSender() ?? 'Unknown') ??
  'Unknown';

export function ReactionTooltipMsg({ room, reaction, events }: ReactionTooltipMsgProps) {
  const shortCodeEvt = events.find(eventWithShortcode);
  const names = events.map(factoryToSenderName(room));

  const joinNameRenderer = (name: string, index: number, slicedNames: string[]) => (
    <span key={name}>
      {index > 0 &&
        index === slicedNames.length - 1 &&
        (names.length <= slicedNames.length ? ' and ' : ', ')}
      {index > 0 && index !== slicedNames.length - 1 && ', '}
      <b>{name}</b>
      {index === slicedNames.length - 1 &&
        names.length > slicedNames.length &&
        ` and ${names.length - slicedNames.length} other${
          names.length - slicedNames.length === 1 ? '' : 's'
        }`}
    </span>
  );

  return (
    <>
      {names.slice(0, 4).map(joinNameRenderer)}
      {' reacted with :'}
      <b>
        {shortCodeEvt?.getContent().shortcode ??
          getShortcodeFor(getHexcodeForEmoji(reaction)) ??
          reaction}
      </b>
      :
    </>
  );
}
