import React from 'react';
import { Avatar, Box, Button, Icon, Icons, Text, as } from 'folds';
import classNames from 'classnames';
import * as css from './style.css';
import { RoomAvatar } from '../room-avatar';
import { getMxIdLocalPart } from '../../utils/matrix';
import { nameInitials } from '../../utils/common';
import { millify } from '../../plugins/millify';
import { useMatrixClient } from '../../hooks/useMatrixClient';

export const RoomCardBase = as<'div'>(({ className, ...props }, ref) => (
  <Box
    direction="Column"
    gap="300"
    className={classNames(css.RoomCardBase, className)}
    {...props}
    ref={ref}
  />
));

export const RoomCardName = as<'h6'>(({ ...props }, ref) => (
  <Text as="h6" size="H6" truncate {...props} ref={ref} />
));

export const RoomCardTopic = as<'p'>(({ className, ...props }, ref) => (
  <Text
    as="p"
    size="T200"
    className={classNames(css.RoomCardTopic, className)}
    {...props}
    ref={ref}
  />
));

type RoomCardProps = {
  roomIdOrAlias: string;
  joined: boolean;
  avatarUrl?: string;
  name?: string;
  topic?: string;
  memberCount?: number;
};
export const RoomCard = as<'div', RoomCardProps>(
  ({ roomIdOrAlias, joined, avatarUrl, name, topic, memberCount, ...props }, ref) => {
    const mx = useMatrixClient();
    const avatar = avatarUrl && mx.mxcUrlToHttp(avatarUrl, 96, 96, 'crop');
    const fallbackName = getMxIdLocalPart(roomIdOrAlias) ?? roomIdOrAlias;
    const fallbackTopic = roomIdOrAlias;

    return (
      <RoomCardBase {...props} ref={ref}>
        <Avatar size="500">
          <RoomAvatar
            src={avatar ?? undefined}
            alt={roomIdOrAlias}
            renderInitials={() => (
              <Text as="span" size="H4">
                {nameInitials(name || fallbackName)}
              </Text>
            )}
          />
        </Avatar>
        <Box direction="Column" gap="100">
          <RoomCardName>{name || fallbackName}</RoomCardName>
          <RoomCardTopic>{topic || fallbackTopic}</RoomCardTopic>
        </Box>
        <Box gap="100">
          <Icon size="50" src={Icons.User} />
          {typeof memberCount === 'number' ? (
            <Text size="T200">{`${millify(memberCount)} Members`}</Text>
          ) : (
            <Text size="T200">Members</Text>
          )}
        </Box>
        {joined ? (
          <Button variant="Secondary" fill="Soft" size="300">
            <Text size="B300">View</Text>
          </Button>
        ) : (
          <Button variant="Secondary" size="300">
            <Text size="B300">Join</Text>
          </Button>
        )}
      </RoomCardBase>
    );
  }
);
