import React, { useState } from 'react';
import classNames from 'classnames';
import {
  Avatar,
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
import { ReactionGroup } from '../../../utils/room';
import * as css from './ReactionViewer.css';
import { Reaction } from '../../../components/message';
import { getHexcodeForEmoji, getShortcodeFor } from '../../../plugins/emoji';
import { UserAvatar } from '../../../components/user-avatar';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useOpenUserRoomProfile } from '../../../state/hooks/userRoomProfile';
import { useSpaceOptionally } from '../../../hooks/useSpace';
import { getMouseEventCords } from '../../../utils/dom';
import { useClient } from '../../../hooks/useClient';
import { useRoomMembersAPI } from '../../../hooks/useRoomMembers';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { useRoom } from '../../../hooks/useRoom';

export type ReactionViewerProps = {
  initialKey?: string;
  reactions: ReactionGroup[];
  requestClose: () => void;
};
export const ReactionViewer = as<'div', ReactionViewerProps>(
  ({ className, initialKey, reactions, requestClose, ...props }, ref) => {
    const ct = useClient();
    const useAuthentication = useMediaAuthentication();
    const roomId = useRoom();
    const spaceId = useSpaceOptionally();
    const openProfile = useOpenUserRoomProfile();
    const membersAPI = useRoomMembersAPI();

    const [selectedReaction, setSelectedReaction] = useState<ReactionGroup | undefined>(() =>
      reactions.find((r) => (initialKey ? r.key === initialKey : r))
    );

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
              {reactions.map((reaction) => (
                <Reaction
                  key={reaction.key}
                  ct={ct}
                  reaction={reaction.key}
                  count={reaction.users.size}
                  aria-selected={reaction.key === selectedReaction?.key}
                  onClick={() => setSelectedReaction(reaction)}
                  useAuthentication={useAuthentication}
                />
              ))}
            </Box>
          </Scroll>
        </Box>
        <Line variant="Surface" direction="Vertical" size="300" />
        <Box grow="Yes" direction="Column">
          <Header className={css.Header} variant="Surface" size="600">
            <Box grow="Yes">
              {selectedReaction ? (
                <Text size="H3" truncate>{`Reacted with :${
                  selectedReaction.shortcode ??
                  getShortcodeFor(getHexcodeForEmoji(selectedReaction.key)) ??
                  selectedReaction.key
                }:`}</Text>
              ) : (
                <Text size="H3" truncate>
                  Reactions
                </Text>
              )}
            </Box>
            <IconButton size="300" onClick={requestClose}>
              <Icon src={Icons.Cross} />
            </IconButton>
          </Header>

          <Box grow="Yes">
            <Scroll visibility="Hover" hideTrack size="300">
              <Box className={css.Content} direction="Column">
                {selectedReaction &&
                  Array.from(selectedReaction.users).map((userId) => {
                    const name = membersAPI.getName(userId);
                    const avatarMxcUrl = membersAPI.getAvatar(userId);
                    const avatarUrl = avatarMxcUrl
                      ? mxcToHttp(ct.session.baseUrl, avatarMxcUrl, useAuthentication).thumbnail({
                          width: 96,
                          height: 96,
                          method: 'crop',
                        })
                      : undefined;

                    return (
                      <MenuItem
                        key={userId}
                        style={{ padding: `0 ${config.space.S200}` }}
                        radii="400"
                        onClick={(event) => {
                          openProfile(
                            roomId,
                            spaceId,
                            userId,
                            getMouseEventCords(event.nativeEvent),
                            'Bottom'
                          );
                        }}
                        before={
                          <Avatar size="200">
                            <UserAvatar
                              userId={userId}
                              src={avatarUrl ?? undefined}
                              alt={name}
                              renderFallback={() => <Icon size="50" src={Icons.User} filled />}
                            />
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
