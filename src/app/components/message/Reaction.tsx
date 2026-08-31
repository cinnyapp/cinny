import React from 'react';
import { Box, Text, as } from 'folds';
import classNames from 'classnames';
import * as css from './Reaction.css';
import { getHexcodeForEmoji, getShortcodeFor } from '../../plugins/emoji';
import { useRoomMembersAPI } from '../../hooks/useRoomMembers';
import { mxcToHttp } from '../../../client/mxcToHttp';
import { useClient } from '../../hooks/useClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';

export const Reaction = as<
  'button',
  {
    count: number;
    adding?: boolean;
    removing?: boolean;
    reaction: string;
  }
>(({ className, count, adding, removing, reaction, ...props }, ref) => {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();

  return (
    <Box
      as="button"
      className={classNames(css.Reaction, className)}
      alignItems="Center"
      shrink="No"
      gap="200"
      {...props}
      ref={ref}
    >
      <Text
        className={classNames(css.ReactionText, { [css.ReactionChangeAnimation]: adding })}
        as="span"
        size="T400"
      >
        {reaction.startsWith('mxc://') ? (
          <img
            className={css.ReactionImg}
            src={mxcToHttp(ct.session.baseUrl, reaction, useAuthentication).url() ?? reaction}
            alt={reaction}
          />
        ) : (
          <Text as="span" size="Inherit" truncate>
            {reaction}
          </Text>
        )}
      </Text>
      <Text
        className={classNames({ [css.ReactionChangeAnimation]: removing })}
        as="span"
        size="T300"
      >
        {count}
      </Text>
    </Box>
  );
});

type ReactionTooltipMsgProps = {
  reaction: string;
  shortcode?: string;
  users: string[];
};

export function ReactionTooltipMsg({ reaction, shortcode, users }: ReactionTooltipMsgProps) {
  const memberAPI = useRoomMembersAPI();
  const label = shortcode ?? getShortcodeFor(getHexcodeForEmoji(reaction)) ?? reaction;
  const names = users.map((userId) => memberAPI.getName(userId));

  return (
    <>
      {names.length === 1 && <b>{names[0]}</b>}
      {names.length === 2 && (
        <>
          <b>{names[0]}</b>
          <Text as="span" size="Inherit" priority="300">
            {' and '}
          </Text>
          <b>{names[1]}</b>
        </>
      )}
      {names.length === 3 && (
        <>
          <b>{names[0]}</b>
          <Text as="span" size="Inherit" priority="300">
            {', '}
          </Text>
          <b>{names[1]}</b>
          <Text as="span" size="Inherit" priority="300">
            {' and '}
          </Text>
          <b>{names[2]}</b>
        </>
      )}
      {names.length > 3 && (
        <>
          <b>{names[0]}</b>
          <Text as="span" size="Inherit" priority="300">
            {', '}
          </Text>
          <b>{names[1]}</b>
          <Text as="span" size="Inherit" priority="300">
            {', '}
          </Text>
          <b>{names[2]}</b>
          <Text as="span" size="Inherit" priority="300">
            {' and '}
          </Text>
          <b>{names.length - 3} others</b>
        </>
      )}
      <Text as="span" size="Inherit" priority="300">
        {' reacted with '}
      </Text>
      :<b>{label}</b>:
    </>
  );
}
