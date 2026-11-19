/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, { MouseEventHandler, ReactNode, useState } from 'react';
import {
  Box,
  Chip,
  color,
  config,
  Icons,
  MainColor,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
} from 'folds';
import type { ClientEventWithoutRoomId } from 'neurone/lib/api/types';
import { ObjectReader } from 'neurone/lib/utils';
import FocusTrap from 'focus-trap-react';
import { rContent, rRelatesTo, rUnsigned } from '../../../../client/reader';
import { useRoomMembersAPI } from '../../../hooks/useRoomMembers';
import { getPowerLevelTag, usePowerLevelTagsContext } from '../../../hooks/usePowerLevelTags';
import { ActivityMessage } from './ActivityMessage';
import { Username, UsernameBold } from '../../../components/message';
import { Code } from '../../../styles/CustomHtml.css';
import { ImageViewer } from '../../../components/image-viewer';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { useClient } from '../../../hooks/useClient';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { stopPropagation } from '../../../utils/keyboard';
import { CutoutCard } from '../../../components/cutout-card';
import { useGetRoomName } from '../../../hooks/storage/useGetRoomName';
import { useRoomHeroes } from '../../../hooks/storage/useRoomHeros';
import { useOpenUserRoomProfile } from '../../../state/hooks/userRoomProfile';
import { useRoom } from '../../../hooks/useRoom';
import { useSpaceOptionally } from '../../../hooks/useSpace';

function MxcViewer({ mxc, onClose }: { mxc: string; onClose: () => void }) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => onClose(),
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Modal size="500" onContextMenu={(evt: any) => evt.stopPropagation()}>
            <ImageViewer
              src={mxcToHttp(ct.session.baseUrl, mxc, useAuthentication).url()}
              alt="Room Avatar"
              requestClose={onClose}
            />
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

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
  const prevTopic = ObjectReader.string(rUnsigned.prevContent(event), 'topic');

  let text = <>removed the room topic</>;
  if (topic) {
    text = prevTopic ? (
      <>
        changed the room topic from <b>{prevTopic}</b> to <b>{topic}</b>
      </>
    ) : (
      <>
        set the room topic to <b>{topic}</b>
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

export function RoomAvatarChange({ event, getUsernameColor }: EventProps) {
  const [viewerMxc, setViewer] = useState<string>();

  const avatarMxc = ObjectReader.string(event.content, 'url');
  const prevAvatarMxc = ObjectReader.string(rUnsigned.prevContent(event), 'url');

  let text = 'removed the room avatar';
  if (avatarMxc) {
    text = prevAvatarMxc ? 'changed the room avatar' : 'set the room avatar';
  }

  return (
    <>
      <ActivityMessage
        event={event}
        getUsernameColor={getUsernameColor}
        variant="Primary"
        iconSrc={Icons.Photo}
        text={
          <>
            {text}{' '}
            {avatarMxc && (
              <Chip variant="Primary" fill="None" radii="Pill" onClick={() => setViewer(avatarMxc)}>
                <Text as="span" size="L400">
                  View
                </Text>
              </Chip>
            )}
            {prevAvatarMxc && (
              <Chip
                variant="Primary"
                fill="None"
                radii="Pill"
                onClick={() => setViewer(prevAvatarMxc)}
              >
                <Text as="span" size="L400">
                  Old
                </Text>
              </Chip>
            )}
          </>
        }
      />
      {viewerMxc && <MxcViewer mxc={viewerMxc} onClose={() => setViewer(undefined)} />}
    </>
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
      iconSrc={Icons.Link}
      text={text}
    />
  );
}

const JOIN_RULES: Record<string, string> = {
  public: 'public',
  invite: 'invite only',
  knock: 'knock & invite',
  restricted: 'space members',
  knock_restricted: 'space members or knock',
  private: 'invite only',
};

export function JoinRulesChange({ event, getUsernameColor }: EventProps) {
  const rule = ObjectReader.string(event.content, 'join_rule') ?? 'unknown';

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Secondary"
      iconSrc={rule === 'public' ? Icons.Globe : Icons.Lock}
      text={
        <>
          changed room access to <b>{JOIN_RULES[rule] ?? rule}</b>
        </>
      }
    />
  );
}

const HISTORY: Record<string, string> = {
  invited: 'after invite',
  joined: 'after join',
  shared: 'all messages',
  world_readable: 'all messages (guests)',
};

export function HistoryVisibilityChange({ event, getUsernameColor }: EventProps) {
  const v = ObjectReader.string(event.content, 'history_visibility') ?? 'unknown';

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Secondary"
      iconSrc={Icons.Message}
      text={
        <>
          changed message history visibility to <b>{HISTORY[v] ?? v}</b>
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
  const { content } = event;
  const prevContent = rUnsigned.prevContent(event);

  const allowIP = ObjectReader.boolean(content, 'allow_ip_literals');
  const prevAllowIP = ObjectReader.boolean(prevContent, 'allow_ip_literals');

  const allow = ObjectReader.array(content, 'allow')?.filter((i) => typeof i === 'string') ?? [];
  const deny = ObjectReader.array(content, 'deny')?.filter((i) => typeof i === 'string') ?? [];
  const prevAllow =
    ObjectReader.array(prevContent, 'allow')?.filter((i) => typeof i === 'string') ?? [];
  const prevDeny =
    ObjectReader.array(prevContent, 'deny')?.filter((i) => typeof i === 'string') ?? [];

  const addedAllow = allow.filter((i) => !prevAllow.includes(i));
  const removedAllow = prevAllow.filter((i) => !allow.includes(i));

  const addedDeny = deny.filter((i) => !prevDeny.includes(i));
  const removedDeny = prevDeny.filter((i) => !deny.includes(i));

  const hasAllowIPChange = allowIP !== prevAllowIP;

  const hasChanges =
    hasAllowIPChange ||
    addedAllow.length > 0 ||
    removedAllow.length > 0 ||
    addedDeny.length > 0 ||
    removedDeny.length > 0;

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Warning"
      iconSrc={Icons.Server}
      text={<>changed the server access control list</>}
    >
      <CutoutCard variant="SurfaceVariant" style={{ padding: config.space.S200 }}>
        {!hasChanges ? (
          <Text size="T200">No changes detected.</Text>
        ) : (
          <>
            {hasAllowIPChange && (
              <>
                <Text size="L400">IP literals</Text>
                <Text size="T200">{allowIP ? 'Enabled' : 'Disabled'}</Text>
              </>
            )}

            {(addedAllow.length > 0 || removedAllow.length > 0) && (
              <>
                <Text size="L400">Allowed addresses</Text>
                {addedAllow.map((item) => (
                  <Text style={{ color: color.Success.Main }} size="T200" key={`allow-add-${item}`}>
                    + {item}
                  </Text>
                ))}
                {removedAllow.map((item) => (
                  <Text
                    style={{ color: color.Critical.Main }}
                    size="T200"
                    key={`allow-remove-${item}`}
                  >
                    − {item}
                  </Text>
                ))}
              </>
            )}

            {(addedDeny.length > 0 || removedDeny.length > 0) && (
              <>
                <Text size="L400">Denied addresses</Text>
                {addedDeny.map((item) => (
                  <Text style={{ color: color.Success.Main }} size="T200" key={`deny-add-${item}`}>
                    + {item}
                  </Text>
                ))}
                {removedDeny.map((item) => (
                  <Text
                    style={{ color: color.Critical.Main }}
                    size="T200"
                    key={`deny-remove-${item}`}
                  >
                    − {item}
                  </Text>
                ))}
              </>
            )}
          </>
        )}
      </CutoutCard>
    </ActivityMessage>
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

  const getRoomHeroes = useRoomHeroes();
  const getRoomName = useGetRoomName(getRoomHeroes);

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Secondary"
      iconSrc={Icons.Hash}
      text={
        <>
          {removed ? 'removed' : 'added'} <b>{stateKey ? getRoomName(stateKey) : stateKey}</b>{' '}
          {removed ? 'from' : 'to'} the space
        </>
      }
    />
  );
}

export function SpaceParentChange({ event, getUsernameColor }: EventProps) {
  const removed = Object.keys(event.content).length === 0;
  const stateKey = 'state_key' in event ? event.state_key : undefined;

  const getRoomHeroes = useRoomHeroes();
  const getRoomName = useGetRoomName(getRoomHeroes);

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Secondary"
      iconSrc={Icons.Space}
      text={
        <>
          {removed ? 'unlinked this room from' : 'linked this room to'}{' '}
          <b>{stateKey ? getRoomName(stateKey) : stateKey}</b>
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

function ProfileChange({ event, getUsernameColor }: EventProps) {
  const [viewerMxc, setViewer] = useState<string>();

  const prev = rUnsigned.prevContent(event);

  const prevName = ObjectReader.string(prev, 'displayname');
  const name = ObjectReader.string(event.content, 'displayname');

  const prevAvatar = ObjectReader.string(prev, 'avatar_url');
  const avatar = ObjectReader.string(event.content, 'avatar_url');

  const nameChange = name !== prevName;
  const avatarChange = avatar !== prevAvatar;

  let avatarText = <>changed their profile picture</>;
  if (avatarChange) {
    if (!avatar) avatarText = <>removed their profile picture</>;
    else
      avatarText = (
        <>
          {!prevAvatar ? 'set' : 'changed'} their profile picture{' '}
          {avatar && (
            <Chip variant="Primary" fill="None" radii="Pill" onClick={() => setViewer(avatar)}>
              <Text as="span" size="L400">
                View
              </Text>
            </Chip>
          )}
        </>
      );
  }

  let text = <>changed their profile</>;
  if (nameChange) {
    if (!name) text = <>removed their display name</>;
    else if (!prevName)
      text = (
        <>
          set their display name to <b>{name}</b>
        </>
      );
    else
      text = (
        <>
          changed their display name from <b>{prevName}</b> to <b>{name}</b>
        </>
      );
  }

  let iconSrc = Icons.User;
  if (nameChange) iconSrc = Icons.Mention;
  if (avatarChange) iconSrc = Icons.Photo;
  if (nameChange && avatarChange) iconSrc = Icons.User;

  return (
    <>
      <ActivityMessage
        event={event}
        getUsernameColor={getUsernameColor}
        variant="Primary"
        iconSrc={iconSrc}
        text={
          <>
            {!nameChange && !avatarChange && <>does not changed their profile</>}
            {nameChange ? text : undefined}
            {nameChange && avatarChange ? ' & ' : undefined}
            {avatarChange ? avatarText : undefined}
          </>
        }
      />
      {viewerMxc && <MxcViewer mxc={viewerMxc} onClose={() => setViewer(undefined)} />}
    </>
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

  const roomId = useRoom();
  const spaceId = useSpaceOptionally();
  const openProfile = useOpenUserRoomProfile();

  const handleUsernameClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    const cords = e.currentTarget.getBoundingClientRect();
    const userId = e.currentTarget.getAttribute('data-user-id');
    if (!userId) return;
    openProfile(roomId, spaceId, userId, cords);
  };

  const getTarget = (tUserId: string) => (
    <Username
      as="button"
      data-user-id={tUserId}
      onClick={handleUsernameClick}
      style={{ color: getUsernameColor(tUserId) }}
    >
      <UsernameBold>{membersAPI.getName(tUserId)}</UsernameBold>
    </Username>
  );

  if (membership === 'join' && prevMembership === 'join') {
    return <ProfileChange event={event} getUsernameColor={getUsernameColor} />;
  }

  if (membership === 'join') {
    if (prevMembership === 'invite') {
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
    variant = 'Warning';
    if (self) {
      variant = 'Secondary';
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
      text = <>kicked {getTarget(target)}</>;
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
  users_default: 'Default user power level',
  events_default: 'Send messages',
  state_default: 'Change room state',
  ban: 'Ban members',
  kick: 'Kick members',
  redact: 'Remove messages',
  invite: 'Invite members',
};

export function PowerLevelsChange({ event, getUsernameColor }: EventProps) {
  const membersAPI = useRoomMembersAPI();
  const prev = rUnsigned.prevContent(event);

  const powerLevelTags = usePowerLevelTagsContext();

  const { content } = event;

  const roomId = useRoom();
  const spaceId = useSpaceOptionally();
  const openProfile = useOpenUserRoomProfile();

  const handleUsernameClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    const cords = e.currentTarget.getBoundingClientRect();
    const userId = e.currentTarget.getAttribute('data-user-id');
    if (!userId) return;
    openProfile(roomId, spaceId, userId, cords);
  };

  const getTarget = (tUserId: string) => (
    <Username
      as="button"
      data-user-id={tUserId}
      onClick={handleUsernameClick}
      style={{ color: getUsernameColor(tUserId) }}
    >
      <UsernameBold>{membersAPI.getName(tUserId)}</UsernameBold>
    </Username>
  );

  if (!prev) {
    return (
      <ActivityMessage
        event={event}
        getUsernameColor={getUsernameColor}
        variant="Secondary"
        iconSrc={Icons.Lock}
        text={<>set the power levels</>}
      />
    );
  }

  const getLevelName = (level: number) => getPowerLevelTag(powerLevelTags, level).name;

  const actionChanges: ReactNode[] = [];

  Object.entries(POWER_LEVEL_ACTIONS).forEach(([key, label]) => {
    const from = ObjectReader.number(prev, key);
    const to = ObjectReader.number(content, key);

    if (from === to) return;

    actionChanges.push(
      <Text size="T200" key={key}>
        {label}: {from ?? 0} to {to ?? 0}
      </Text>
    );
  });

  // Event-specific power levels
  const prevEvents = (ObjectReader.object(prev, 'events') ?? {}) as Record<string, unknown>;
  const newEvents = (ObjectReader.object(content, 'events') ?? {}) as Record<string, unknown>;

  const eventChanges: ReactNode[] = [];

  new Set([...Object.keys(prevEvents), ...Object.keys(newEvents)]).forEach((type) => {
    if (prevEvents[type] === newEvents[type]) return;

    eventChanges.push(
      <Text size="T200" key={type}>
        <code>{type}</code>: {String(prevEvents[type] ?? 'default')} to{' '}
        {String(newEvents[type] ?? 'default')}
      </Text>
    );
  });

  // Per-user power levels
  const prevUsers = (ObjectReader.object(prev, 'users') ?? {}) as Record<string, unknown>;
  const newUsers = (ObjectReader.object(content, 'users') ?? {}) as Record<string, unknown>;

  const prevDefault = ObjectReader.number(prev, 'users_default');
  const newDefault = ObjectReader.number(content, 'users_default');

  const memberChanges: ReactNode[] = [];

  new Set([...Object.keys(prevUsers), ...Object.keys(newUsers)]).forEach((userId) => {
    if (prevUsers[userId] === newUsers[userId]) return;

    const from = typeof prevUsers[userId] === 'number' ? prevUsers[userId] : undefined;
    const to = typeof newUsers[userId] === 'number' ? newUsers[userId] : undefined;

    memberChanges.push(
      <Text size="T200" key={userId}>
        {getTarget(userId)}: {getLevelName(from ?? prevDefault ?? 0)} to{' '}
        {getLevelName(to ?? newDefault ?? 0)}
      </Text>
    );
  });

  const hasChanges =
    actionChanges.length > 0 || eventChanges.length > 0 || memberChanges.length > 0;

  return (
    <ActivityMessage
      event={event}
      getUsernameColor={getUsernameColor}
      variant="Secondary"
      iconSrc={Icons.Lock}
      text={<>changed the room permissions</>}
    >
      <CutoutCard variant="SurfaceVariant" style={{ padding: config.space.S200 }}>
        <Box direction="Column" gap="300">
          {!hasChanges ? (
            <Text size="T200">No permission changes detected.</Text>
          ) : (
            <>
              {actionChanges.length > 0 && (
                <Box direction="Column" gap="100">
                  <Text size="L400">Actions</Text>
                  {actionChanges}
                </Box>
              )}

              {eventChanges.length > 0 && (
                <Box direction="Column" gap="100">
                  <Text size="L400">Events</Text>
                  {eventChanges}
                </Box>
              )}

              {memberChanges.length > 0 && (
                <Box direction="Column" gap="100">
                  <Text size="L400">Members</Text>
                  {memberChanges}
                </Box>
              )}
            </>
          )}
        </Box>
      </CutoutCard>
    </ActivityMessage>
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
