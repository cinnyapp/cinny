import React, { useCallback, useState } from 'react';
import classNames from 'classnames';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Box,
  Header,
  Icon,
  IconButton,
  Icons,
  Line,
  MenuItem,
  Scroll,
  Text,
  as,
  config,
} from 'folds';
import { MatrixEvent, Room, RoomMember } from 'matrix-js-sdk';
import { Relations } from 'matrix-js-sdk/lib/models/relations';
import { getMemberDisplayName } from '../../../utils/room';
import { eventWithShortcode, getMxIdLocalPart } from '../../../utils/matrix';
import * as css from './ReactionViewer.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import colorMXID from '../../../../util/colorMXID';
import { openProfileViewer } from '../../../../client/action/navigation';
import { useRelations } from '../../../hooks/useRelations';
import { Reaction } from '../../../components/message';
import { getHexcodeForEmoji, getShortcodeFor } from '../../../plugins/emoji';

export type ReactionViewerProps = {
  room: Room;
  initialKey?: string;
  relations: Relations;
  requestClose: () => void;
};
export const ReactionViewer = as<'div', ReactionViewerProps>(
  ({ className, room, initialKey, relations, requestClose, ...props }, ref) => {
    const mx = useMatrixClient();
    const reactions = useRelations(
      relations,
      useCallback((rel) => [...(rel.getSortedAnnotationsByKey() ?? [])], [])
    );

    const [selectedKey, setSelectedKey] = useState<string>(() => {
      if (initialKey) return initialKey;
      const defaultReaction = reactions.find((reaction) => typeof reaction[0] === 'string');
      return defaultReaction ? defaultReaction[0] : '';
    });

    const getName = (member: RoomMember) =>
      getMemberDisplayName(room, member.userId) ?? getMxIdLocalPart(member.userId) ?? member.userId;

    const getReactionsForKey = (key: string): MatrixEvent[] => {
      const reactSet = reactions.find(([k]) => k === key)?.[1];
      if (!reactSet) return [];
      return Array.from(reactSet);
    };

    const selectedReactions = getReactionsForKey(selectedKey);
    const selectedShortcode =
      selectedReactions.find(eventWithShortcode)?.getContent().shortcode ??
      getShortcodeFor(getHexcodeForEmoji(selectedKey)) ??
      selectedKey;

    return (
      <Box
        className={classNames(css.ReactionViewer, className)}
        direction="Row"
        {...props}
        ref={ref}
      >
        <Box shrink="No" className={css.Sidebar}>
          <Scroll visibility="Hover" hideTrack size="300">
            <Box className={css.SidebarContent} direction="Column" gap="200">
              {reactions.map(([key, evts]) => {
                if (typeof key !== 'string') return null;
                return (
                  <Reaction
                    key={key}
                    mx={mx}
                    reaction={key}
                    count={evts.size}
                    aria-selected={key === selectedKey}
                    onClick={() => setSelectedKey(key)}
                  />
                );
              })}
            </Box>
          </Scroll>
        </Box>
        <Line variant="Surface" direction="Vertical" size="300" />
        <Box grow="Yes" direction="Column">
          <Header className={css.Header} variant="Surface" size="600">
            <Box grow="Yes">
              <Text size="H3" truncate>{`Reacted with :${selectedShortcode}:`}</Text>
            </Box>
            <IconButton size="300" onClick={requestClose}>
              <Icon src={Icons.Cross} />
            </IconButton>
          </Header>

          <Box grow="Yes">
            <Scroll visibility="Hover" hideTrack size="300">
              <Box className={css.Content} direction="Column">
                {selectedReactions.map((mEvent) => {
                  const senderId = mEvent.getSender();
                  if (!senderId) return null;
                  const member = room.getMember(senderId);
                  const name = (member ? getName(member) : getMxIdLocalPart(senderId)) ?? senderId;

                  const avatarUrl = member?.getAvatarUrl(
                    mx.baseUrl,
                    100,
                    100,
                    'crop',
                    undefined,
                    false
                  );

                  return (
                    <MenuItem
                      key={senderId}
                      style={{ padding: `0 ${config.space.S200}` }}
                      radii="400"
                      onClick={() => {
                        requestClose();
                        openProfileViewer(senderId, room.roomId);
                      }}
                      before={
                        <Avatar size="200">
                          {avatarUrl ? (
                            <AvatarImage src={avatarUrl} />
                          ) : (
                            <AvatarFallback
                              style={{
                                background: colorMXID(senderId),
                                color: 'white',
                              }}
                            >
                              <Text size="H6">{name[0]}</Text>
                            </AvatarFallback>
                          )}
                        </Avatar>
                      }
                    >
                      <Box grow="Yes">
                        <Text size="T400" truncate>
                          {name}
                        </Text>
                      </Box>
                    </MenuItem>
                  );
                })}
              </Box>
            </Scroll>
          </Box>
        </Box>
      </Box>
    );
  }
);
