import React, { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Icon, IconButton, Icons, Scroll, Spinner, Text, color, config } from 'folds';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../components/page';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { getHomePath } from '../../pages/pathUtils';
import { isOnline, sortFriends } from './presence';
import { useFriends } from './useFriends';
import { friendDisplayName } from './userDisplay';
import { FriendRow } from './FriendRow';
import { PendingRow } from './PendingRow';
import { AddFriend } from './AddFriend';
import { EmptyState } from './EmptyState';
import { TabChip } from './TabChip';
import { FriendsPoller } from './FriendsPoller';
import { InviteLink } from '../invites/InviteLink';

type Tab = 'online' | 'all' | 'pending' | 'add';

export function FriendsPage() {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();
  const { lists, error } = useFriends();
  const [tab, setTab] = useState<Tab>();

  const incomingCount = lists?.incoming.length ?? 0;

  // Pick the default tab once the first lists are available; after that the user's choice sticks.
  useEffect(() => {
    if (tab === undefined && lists) setTab(incomingCount > 0 ? 'pending' : 'online');
  }, [tab, lists, incomingCount]);

  const activeTab: Tab = tab ?? 'online';

  const sortedFriends = lists
    ? sortFriends(
        lists.friends,
        (id) => mx.getUser(id)?.presence,
        (id) => friendDisplayName(mx, id)
      )
    : [];
  const onlineFriends = sortedFriends.filter((f) => isOnline(mx.getUser(f.userId)?.presence));

  const renderFriends = (friends: { userId: string }[], emptyText: string) =>
    friends.length === 0 ? (
      <EmptyState>{emptyText}</EmptyState>
    ) : (
      <Box direction="Column" gap="100">
        {friends.map((f) => (
          <FriendRow key={f.userId} userId={f.userId} />
        ))}
      </Box>
    );

  const renderPending = () => {
    if (!lists) return null;
    if (lists.incoming.length === 0 && lists.outgoing.length === 0) {
      return <EmptyState>No pending requests</EmptyState>;
    }
    return (
      <Box direction="Column" gap="400">
        {lists.incoming.length > 0 && (
          <Box direction="Column" gap="100">
            <Text size="L400">Incoming ({lists.incoming.length})</Text>
            {lists.incoming.map((r) => (
              <PendingRow key={r.userId} userId={r.userId} direction="incoming" />
            ))}
          </Box>
        )}
        {lists.outgoing.length > 0 && (
          <Box direction="Column" gap="100">
            <Text size="L400">Outgoing ({lists.outgoing.length})</Text>
            {lists.outgoing.map((r) => (
              <PendingRow key={r.userId} userId={r.userId} direction="outgoing" />
            ))}
          </Box>
        )}
      </Box>
    );
  };

  const renderTab = (): ReactNode => {
    if (activeTab === 'add') {
      return (
        <Box direction="Column" gap="700">
          <AddFriend />
          <InviteLink />
        </Box>
      );
    }
    if (!lists) {
      return error ? null : (
        <Box justifyContent="Center" style={{ padding: config.space.S700 }}>
          <Spinner variant="Secondary" />
        </Box>
      );
    }
    if (activeTab === 'online') return renderFriends(onlineFriends, 'No friends online');
    if (activeTab === 'all') return renderFriends(sortedFriends, 'No friends yet');
    return renderPending();
  };

  return (
    <Page>
      {/* On mobile the sidebar (and its FriendsTab poller) is hidden on this route. */}
      {screenSize === ScreenSize.Mobile && <FriendsPoller />}
      <PageHeader balance>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" basis="No">
            {screenSize === ScreenSize.Mobile && (
              <IconButton aria-label="Back" onClick={() => navigate(getHomePath())}>
                <Icon src={Icons.ArrowLeft} />
              </IconButton>
            )}
          </Box>
          <Box alignItems="Center" gap="200">
            {screenSize !== ScreenSize.Mobile && <Icon size="400" src={Icons.User} />}
            <Text size="H3" truncate>
              Friends
            </Text>
          </Box>
          <Box grow="Yes" basis="No" />
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              <Box direction="Column" gap="500">
                <Box gap="200" wrap="Wrap">
                  <TabChip selected={activeTab === 'online'} onClick={() => setTab('online')}>
                    Online
                  </TabChip>
                  <TabChip selected={activeTab === 'all'} onClick={() => setTab('all')}>
                    All
                  </TabChip>
                  <TabChip
                    selected={activeTab === 'pending'}
                    onClick={() => setTab('pending')}
                    count={incomingCount}
                  >
                    Pending
                  </TabChip>
                  <TabChip selected={activeTab === 'add'} onClick={() => setTab('add')}>
                    Add Friend
                  </TabChip>
                </Box>
                {error && (
                  <Box
                    role="alert"
                    alignItems="Center"
                    gap="200"
                    style={{
                      padding: config.space.S300,
                      borderRadius: config.radii.R400,
                      backgroundColor: color.Warning.Container,
                      color: color.Warning.OnContainer,
                    }}
                  >
                    <Icon size="100" src={Icons.Warning} />
                    <Text size="T300">Couldn&apos;t reach the friends service. Retrying…</Text>
                  </Box>
                )}
                {renderTab()}
              </Box>
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
