import React, { MouseEventHandler } from 'react';
import { Box, Avatar, Text, Chip, Icon, Icons, as, Badge, toRem } from 'folds';
import classNames from 'classnames';
import { HierarchyItem } from '../../hooks/useSpaceHierarchy';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RoomAvatar } from '../../components/room-avatar';
import { nameInitials } from '../../utils/common';
import {
  HierarchyRoomSummaryLoader,
  LocalRoomSummaryLoader,
} from '../../components/RoomSummaryLoader';
import { getRoomAvatarUrl } from '../../utils/room';
import { AsyncStatus } from '../../hooks/useAsyncCallback';
import { Membership } from '../../../types/matrix/room';
import * as css from './SpaceItem.css';
import * as styleCss from './style.css';

function SpaceProfileLoading() {
  return (
    <Box grow="Yes" gap="200" alignItems="Center">
      <Box grow="Yes" gap="200" alignItems="Center" className={css.HeaderChipPlaceholder}>
        <Avatar className={styleCss.AvatarPlaceholder} size="200" radii="300" />
        <Box className={styleCss.LinePlaceholder} shrink="No" style={{ maxWidth: toRem(120) }} />
      </Box>
    </Box>
  );
}

type SpaceProfileProps = {
  name: string;
  avatarUrl?: string;
  suggested?: boolean;
  closed: boolean;
  categoryId: string;
  handleClose?: MouseEventHandler<HTMLButtonElement>;
};
function SpaceProfile({
  name,
  avatarUrl,
  suggested,
  closed,
  categoryId,
  handleClose,
}: SpaceProfileProps) {
  return (
    <Box gap="200" grow="Yes" alignItems="Center">
      <Box gap="200" grow="Yes" alignItems="Center">
        <Chip
          data-category-id={categoryId}
          onClick={handleClose}
          className={css.HeaderChip}
          variant="Surface"
          size="500"
          before={
            <Box shrink="No" gap="100" alignItems="Center">
              <Avatar size="200" radii="300">
                <RoomAvatar
                  src={avatarUrl}
                  alt={name}
                  renderInitials={() => (
                    <Text as="span" size="H6">
                      {nameInitials(name)}
                    </Text>
                  )}
                />
              </Avatar>
            </Box>
          }
          after={<Icon src={closed ? Icons.ChevronRight : Icons.ChevronBottom} size="50" />}
        >
          <Box alignItems="Center" gap="200">
            <Text size="H4" truncate>
              {name}
            </Text>
            {suggested && (
              <Box shrink="No" alignItems="Center">
                <Badge variant="Success" fill="Soft" radii="Pill" outlined>
                  <Text size="L400">Suggested</Text>
                </Badge>
              </Box>
            )}
          </Box>
        </Chip>
      </Box>
    </Box>
  );
}

type SpaceItemCardProps = {
  item: HierarchyItem;
  categoryId: string;
  closed: boolean;
  handleClose?: MouseEventHandler<HTMLButtonElement>;
};
export const SpaceItemCard = as<'div', SpaceItemCardProps>(
  ({ className, closed, categoryId, item, handleClose, ...props }, ref) => {
    const mx = useMatrixClient();
    const { roomId, content } = item;
    const space = mx.getRoom(roomId);
    const joined = space?.getMyMembership() === Membership.Join;

    return (
      <Box
        shrink="No"
        className={classNames(css.SpaceItemCard({ outlined: !joined || closed }), className)}
        {...props}
        ref={ref}
      >
        {space ? (
          <LocalRoomSummaryLoader room={space}>
            {(localSummary) => (
              <SpaceProfile
                name={localSummary.name}
                avatarUrl={getRoomAvatarUrl(mx, space, 96)}
                suggested={content.suggested}
                closed={closed}
                categoryId={categoryId}
                handleClose={handleClose}
              />
            )}
          </LocalRoomSummaryLoader>
        ) : (
          <HierarchyRoomSummaryLoader roomId={roomId}>
            {(summaryState) => (
              <>
                {summaryState.status === AsyncStatus.Loading && <SpaceProfileLoading />}
                {summaryState.status === AsyncStatus.Error && roomId}
                {summaryState.status === AsyncStatus.Success && (
                  <SpaceProfile
                    name={summaryState.data.name || roomId}
                    avatarUrl={
                      summaryState.data?.avatar_url
                        ? mx.mxcUrlToHttp(summaryState.data.avatar_url, 96, 96, 'crop') ?? undefined
                        : undefined
                    }
                    suggested={content.suggested}
                    closed={!joined}
                    categoryId={categoryId}
                  />
                )}
              </>
            )}
          </HierarchyRoomSummaryLoader>
        )}
        <Box shrink="No">
          {/* <Chip variant="Primary" radii="Pill" before={<Icon size="100" src={Icons.CheckTwice} />}>
          <Text size="T200">Some</Text>
        </Chip> */}
        </Box>
      </Box>
    );
  }
);
