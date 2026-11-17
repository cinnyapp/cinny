/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, { ReactNode } from 'react';
import { Icons, MainColor } from 'folds';
import type { ClientEventWithoutRoomId } from 'neurone/lib/api/types';
import { ObjectReader } from 'neurone/lib/utils';
import { rContent, rRelatesTo, rUnsigned } from '../../../../client/reader';
import { useRoomMembersAPI } from '../../../hooks/useRoomMembers';
import { getPowerLevelTag, usePowerLevelTagsContext } from '../../../hooks/usePowerLevelTags';
import { ActivityMessage } from './ActivityMessage';
import { Username, UsernameBold } from '../../../components/message';
import { Code } from '../../../styles/CustomHtml.css';

type EventProps = {
  event: ClientEventWithoutRoomId;
  getUsernameColor: (userId: string) => string | undefined;
};

export function RoomCreate({ event, getUsernameColor }: EventProps) {
  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Primary"
      iconSrc={Icons.Plus}
      text="created the room"
    />
  );
}

export function RoomNameChange({ event, getUsernameColor }: EventProps) {
  const name = ObjectReader.string(event.content, 'name');
  const prevName = ObjectReader.string(rUnsigned.prevContent(event), 'name');

  let text = <>removed the room name</>;
  if (name) {
    text = prevName ? (
      <>
        changed the room name from <b>{prevName}</b> to <b>{name}</b>
      </>
    ) : (
      <>
        set the room name to <b>{name}</b>
      </>
    );
  }

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Primary"
      iconSrc={Icons.Pencil}
      text={text}
    />
  );
}

export function RoomTopicChange({ event, getUsernameColor }: EventProps) {
  const topic = ObjectReader.string(event.content, 'topic');

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Primary"
      iconSrc={Icons.Pencil}
      text={
        topic ? (
          <>
            changed the topic to <b>{topic}</b>
          </>
        ) : (
          <>removed the room topic</>
        )
      }
    />
  );
}

export function RoomAvatarChange({ event, getUsernameColor }: EventProps) {
  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Primary"
      iconSrc={Icons.Photo}
      text={
        ObjectReader.string(event.content, 'url')
          ? 'changed the room avatar'
          : 'removed the room avatar'
      }
    />
  );
}

export function CanonicalAliasChange({ event, getUsernameColor }: EventProps) {
  const prev = rUnsigned.prevContent(event);
  const alias = ObjectReader.string(event.content, 'alias');
  const prevAlias = ObjectReader.string(prev, 'alias');
  const alt =
    ObjectReader.array(event.content, 'alt_aliases')?.filter((i) => typeof i === 'string') ?? [];
  const prevAlt =
    ObjectReader.array(prev, 'alt_aliases')?.filter((i) => typeof i === 'string') ?? [];
  const added = alt.filter((a) => !prevAlt.includes(a));
  const removed = prevAlt.filter((a) => !alt.includes(a));

  let text: ReactNode;
  if (alias !== prevAlias) {
    text = alias ? (
      <>
        set the main address to <b>{alias}</b>
      </>
    ) : (
      <>removed the main address</>
    );
  } else if (added.length) {
    text = (
      <>
        added alternative address <b>{added.join(', ')}</b>
      </>
    );
  } else if (removed.length) {
    text = (
      <>
        removed alternative address <b>{removed.join(', ')}</b>
      </>
    );
  } else {
    text = <>updated the room addresses</>;
  }

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Secondary"
      iconSrc={Icons.HashGlobe}
      text={text}
    />
  );
}

const JOIN_RULES: Record<string, string> = {
  public: 'anyone can join',
  invite: 'invite only',
  knock: 'anyone can ask to join',
  restricted: 'members of allowed spaces can join',
  knock_restricted: 'members of allowed spaces can join, others can ask to join',
  private: 'private',
};

export function JoinRulesChange({ event, getUsernameColor }: EventProps) {
  const rule = ObjectReader.string(event.content, 'join_rule') ?? 'unknown';

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Secondary"
      iconSrc={Icons.Lock}
      text={
        <>
          changed who can join to <b>{JOIN_RULES[rule] ?? rule}</b>
        </>
      }
    />
  );
}

const HISTORY: Record<string, string> = {
  invited: 'members, since they were invited',
  joined: 'members, since they joined',
  shared: 'members, for the entire history',
  world_readable: 'anyone',
};

export function HistoryVisibilityChange({ event, getUsernameColor }: EventProps) {
  const v = ObjectReader.string(event.content, 'history_visibility') ?? 'unknown';

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Secondary"
      iconSrc={Icons.HashGlobe}
      text={
        <>
          made future history visible to <b>{HISTORY[v] ?? v}</b>
        </>
      }
    />
  );
}

export function GuestAccessChange({ event, getUsernameColor }: EventProps) {
  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Secondary"
      iconSrc={Icons.HashGlobe}
      text={
        ObjectReader.string(event.content, 'guest_access') === 'can_join'
          ? 'allowed guests to join'
          : 'blocked guests from joining'
      }
    />
  );
}

export function EncryptionEnabled({ event, getUsernameColor }: EventProps) {
  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Warning"
      iconSrc={Icons.Shield}
      text={<>turned on end-to-end encryption</>}
    />
  );
}

export function PinnedEventsChange({ event, getUsernameColor }: EventProps) {
  const prevContent = rUnsigned.prevContent(event);
  const prev =
    ObjectReader.array(prevContent, 'pinned')?.filter((i) => typeof i === 'string') ?? [];
  const now =
    ObjectReader.array(event.content, 'pinned')?.filter((i) => typeof i === 'string') ?? [];
  const added = now.filter((id) => !prev.includes(id)).length;
  const removed = prev.filter((id) => !now.includes(id)).length;

  let text = 'updated the pinned messages';
  if (added && !removed) text = `pinned ${added} message${added > 1 ? 's' : ''}`;
  else if (removed && !added) text = `unpinned ${removed} message${removed > 1 ? 's' : ''}`;

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Secondary"
      iconSrc={Icons.Pin}
      text={text}
    />
  );
}

export function ServerAclChange({ event, getUsernameColor }: EventProps) {
  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Warning"
      iconSrc={Icons.Server}
      text={<>changed the server access control list</>}
    />
  );
}

export function RoomTombstone({ event, getUsernameColor }: EventProps) {
  const body = ObjectReader.string(event.content, 'body');
  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Critical"
      iconSrc={Icons.Prohibited}
      text={<>upgraded this room{body ? `: ${body}` : ''}</>}
    />
  );
}

export function SpaceChildChange({ event, getUsernameColor }: EventProps) {
  const removed = Object.keys(event.content).length === 0;

  const stateKey = 'state_key' in event ? event.state_key : undefined;

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Secondary"
      iconSrc={Icons.Hash}
      text={
        <>
          {removed ? 'removed' : 'added'} <b>{stateKey}</b> {removed ? 'from' : 'to'} the space
        </>
      }
    />
  );
}

export function SpaceParentChange({ event, getUsernameColor }: EventProps) {
  const removed = Object.keys(event.content).length === 0;
  const stateKey = 'state_key' in event ? event.state_key : undefined;

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Secondary"
      iconSrc={Icons.Space}
      text={
        <>
          {removed ? 'unlinked this room from' : 'linked this room to'} <b>{stateKey}</b>
        </>
      }
    />
  );
}

export function RoomRedaction({ event, getUsernameColor }: EventProps) {
  const reason = ObjectReader.string(event.content, 'reason');
  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Critical"
      iconSrc={Icons.Delete}
      text={<>removed a message{reason ? ` (reason: ${reason})` : ''}</>}
    />
  );
}

export function RoomMemberChange({ event, getUsernameColor }: EventProps) {
  const membersAPI = useRoomMembersAPI();
  const stateKey = 'state_key' in event ? event.state_key : undefined;

  const target = stateKey ?? event.sender;
  const self = event.sender === target;

  const membership = ObjectReader.string(event.content, 'membership');
  const reason = ObjectReader.string(event.content, 'reason');
  const prev = rUnsigned.prevContent(event);
  const prevMembership = ObjectReader.string(prev, 'membership');

  let iconSrc = Icons.ArrowRight;
  let variant: MainColor = 'Success';
  let text: ReactNode = null;

  const getTarget = (tUserId: string) => (
    <Username style={{ color: getUsernameColor(tUserId) }}>
      <UsernameBold>{membersAPI.getName(tUserId)}</UsernameBold>
    </Username>
  );

  if (membership === 'join') {
    if (prevMembership === 'join') {
      variant = 'Primary';

      const from = ObjectReader.string(prev, 'displayname');
      const to = ObjectReader.string(event.content, 'displayname');

      if (from !== to) {
        iconSrc = Icons.Mention;
        if (!to) text = <>removed their display name</>;
        else if (!from)
          text = (
            <>
              set their display name to <b>{to}</b>
            </>
          );
        else
          text = (
            <>
              changed their display name from <b>{from}</b> to <b>{to}</b>
            </>
          );
      } else {
        iconSrc = Icons.User;
        text = ObjectReader.string(event.content, 'avatar_url') ? (
          <>changed their avatar</>
        ) : (
          <>removed their avatar</>
        );
      }
    } else if (prevMembership === 'invite') {
      text = <>accepted the invitation</>;
    } else {
      text = <>joined the room</>;
    }
  } else if (membership === 'invite') {
    iconSrc = Icons.Mail;
    text = <>invited {getTarget(target)}</>;
  } else if (membership === 'knock') {
    iconSrc = Icons.MailPlus;
    text = <>asked to join the room</>;
  } else if (membership === 'ban') {
    iconSrc = Icons.NoEntry;
    variant = 'Critical';
    text = <>banned {getTarget(target)}</>;
  } else if (membership === 'leave') {
    iconSrc = Icons.ArrowLeft;
    variant = 'Secondary';
    if (self) {
      if (prevMembership === 'invite') text = <>rejected the invitation</>;
      else if (prevMembership === 'knock') text = <>withdrew their request to join</>;
      else text = <>left the room</>;
    } else if (prevMembership === 'ban') {
      text = <>unbanned {getTarget(target)}</>;
    } else if (prevMembership === 'invite') {
      text = <>revoked invitation of {getTarget(target)}</>;
    } else if (prevMembership === 'knock') {
      text = <>declined join request of {getTarget(target)}</>;
    } else {
      text = <>removed {getTarget(target)}</>;
    }
  }

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant={variant}
      iconSrc={iconSrc}
      text={
        <>
          {text}
          {reason ? ` (reason: ${reason})` : ''}
        </>
      }
    />
  );
}

const POWER_LEVEL_ACTIONS: Record<string, string> = {
  users_default: 'default user power level',
  events_default: 'power level required to send messages',
  state_default: 'power level required to change room state',
  ban: 'power level required to ban',
  kick: 'power level required to kick',
  redact: 'power level required to remove messages',
  invite: 'power level required to invite',
};

export function PowerLevelsChange({ event, getUsernameColor }: EventProps) {
  const membersAPI = useRoomMembersAPI();
  const prev = rUnsigned.prevContent(event);

  const powerLevelTags = usePowerLevelTagsContext();

  if (!prev) {
    return (
      <ActivityMessage
        event={event}
        getUsernameColor={getUsernameColor}
        variant="Secondary"
        iconSrc={Icons.Shield}
        text={<>set the power levels</>}
      />
    );
  }

  const lines: ReactNode[] = [];
  const prevDefault = ObjectReader.number(prev, 'users_default');
  const newDefault = ObjectReader.number(event.content, 'users_default');

  // per-user changes
  const prevUsers = (ObjectReader.object(prev, 'users') ?? {}) as Record<string, unknown>;
  const newUsers = (ObjectReader.object(event.content, 'users') ?? {}) as Record<string, unknown>;
  new Set([...Object.keys(prevUsers), ...Object.keys(newUsers)]).forEach((userId) => {
    if (prevUsers[userId] === newUsers[userId]) return;
    const from =
      typeof prevUsers[userId] === 'number' ? (prevUsers[userId] as number) : prevDefault;
    const to = typeof newUsers[userId] === 'number' ? (newUsers[userId] as number) : newDefault;
    lines.push(
      <>
        power level of <b>{membersAPI.getName(userId)}</b>:{' '}
        {getPowerLevelTag(powerLevelTags, from ?? 0).name} →{' '}
        {getPowerLevelTag(powerLevelTags, to ?? 0).name}
      </>
    );
  });

  // room-wide levels
  Object.entries(POWER_LEVEL_ACTIONS).forEach(([key, label]) => {
    const from = ObjectReader.number(prev, key);
    const to = ObjectReader.number(event.content, key);
    if (from !== to) {
      lines.push(
        <>
          {label}: {from ?? 0} → {to ?? 0}
        </>
      );
    }
  });

  // per-event-type levels
  const prevEvents = (ObjectReader.object(prev, 'events') ?? {}) as Record<string, unknown>;
  const newEvents = (ObjectReader.object(event.content, 'events') ?? {}) as Record<string, unknown>;
  new Set([...Object.keys(prevEvents), ...Object.keys(newEvents)]).forEach((type) => {
    if (prevEvents[type] === newEvents[type]) return;
    lines.push(
      <>
        <code>{type}</code>: {String(prevEvents[type] ?? 'default')} →{' '}
        {String(newEvents[type] ?? 'default')}
      </>
    );
  });

  if (lines.length === 0) {
    return (
      <ActivityMessage
        event={event}
        getUsernameColor={getUsernameColor}
        variant="Secondary"
        iconSrc={Icons.Shield}
        text={<>updated the rooms power levels</>}
      />
    );
  }

  if (lines.length === 1) {
    return (
      <ActivityMessage
        event={event}
        getUsernameColor={getUsernameColor}
        variant="Secondary"
        iconSrc={Icons.Shield}
        text={<>changed the {lines[0]}</>}
      />
    );
  }

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Secondary"
      iconSrc={Icons.Shield}
      text={
        <>
          changed the room power levels
          {lines.map((line, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <React.Fragment key={i}>
              <br />• {line}
            </React.Fragment>
          ))}
        </>
      }
    />
  );
}

export function ReactionEvent({ event, getUsernameColor }: EventProps) {
  const reaction = rRelatesTo.key(rContent.relatesTo(event.content));

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Primary"
      iconSrc={Icons.Smile}
      text={<>reacted with {reaction}</>}
    />
  );
}

export function UnknownEvent({ event, getUsernameColor }: EventProps) {
  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Primary"
      iconSrc={Icons.Code}
      text={
        <>
          sent <code className={Code}>{event.type}</code> event
        </>
      }
    />
  );
}
