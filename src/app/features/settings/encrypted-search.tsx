/**
 * Encrypted Search Settings Page
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Button,
  Icon,
  Icons,
  Switch,
  config,
  Spinner,
  Line,
  Badge,
  Scroll,
} from 'folds';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { Page, PageContent, PageHeader } from '../../components/page';
import { SettingTile } from '../../components/setting-tile';
import {
  isMasterKeyLoaded,
  initializeEncryption,
  loadMasterKey,
  deleteEncryptedSearchDB,
  initMessageIndexer,
  destroyMessageIndexer,
  initHistoricalIndexer,
  getHistoricalIndexer,
  IndexingProgressEvent,
  useLocalSearchStats,
  clearMasterKey,
} from '../encrypted-search';

type EncryptedSearchProps = {
  requestClose: () => void;
};

export function EncryptedSearch({ requestClose }: EncryptedSearchProps) {
  const mx = useMatrixClient();
  const getStats = useLocalSearchStats();

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    totalIndexedMessages: number;
    lastIndexedAt?: number;
    roomsIndexed: number;
  } | null>(null);

  const [indexing, setIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState<{
    processed: number;
    total: number;
    currentRoom?: string;
  }>({
    processed: 0,
    total: 0,
  });

  // Load initial state
  useEffect(() => {
    const loadState = async () => {
      const isEnabled = isMasterKeyLoaded();
      setEnabled(isEnabled);

      if (isEnabled) {
        const s = await getStats();
        if (s) setStats(s);
      }
    };

    loadState();
  }, [getStats]);

  const handleToggleEncryption = async () => {
    setLoading(true);
    try {
      const userId = mx.getUserId();
      const deviceId = mx.getDeviceId();

      if (!userId || !deviceId) {
        throw new Error('User not authenticated');
      }

      if (!enabled) {
        // Enable
        await initializeEncryption(userId, deviceId);
        await loadMasterKey(userId, deviceId);

        const indexer = initMessageIndexer(mx);
        indexer.start();

        setEnabled(true);

        // Reload stats
        const s = await getStats();
        if (s) setStats(s);
      } else {
        // Disable
        destroyMessageIndexer();
        clearMasterKey();
        setEnabled(false);
      }
    } catch (error) {
      console.error('Failed to toggle encrypted search:', error);
      alert(`Failed to toggle encrypted search: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartIndexing = async () => {
    try {
      const indexer = getHistoricalIndexer() || initHistoricalIndexer(mx);

      const progressCallback = (event: IndexingProgressEvent) => {
        if (event.type === 'progress') {
          setIndexingProgress({
            processed: event.processed,
            total: event.total,
            currentRoom: event.roomId,
          });
        } else if (event.type === 'complete') {
          setIndexing(false);
          setIndexingProgress({
            processed: event.total,
            total: event.total,
          });

          // Reload stats
          getStats().then((s) => {
            if (s) setStats(s);
          });
        } else if (event.type === 'error') {
          console.error('Indexing error:', event.error);
        }
      };

      setIndexing(true);
      setIndexingProgress({
        processed: 0,
        total: 0,
      });

      await indexer.indexAllRooms(progressCallback);
    } catch (error) {
      console.error('Failed to start indexing:', error);
      alert(`Failed to start indexing: ${(error as Error).message}`);
      setIndexing(false);
    }
  };

  const handleStopIndexing = () => {
    try {
      const indexer = getHistoricalIndexer();
      if (indexer) {
        indexer.stop();
        setIndexing(false);
      }
    } catch (error) {
      console.error('Failed to stop indexing:', error);
    }
  };

  const handleClearIndex = async () => {
    if (!confirm('Are you sure you want to clear the search index? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      destroyMessageIndexer();
      await deleteEncryptedSearchDB();
      setEnabled(false);
      setStats(null);
      alert('Search index cleared successfully');
    } catch (error) {
      console.error('Failed to clear index:', error);
      alert(`Failed to clear index: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <PageHeader balance>
        <Box grow="Yes" gap="200">
          <Text size="H3" priority="400">
            Encrypted Search
          </Text>
        </Box>
        <Box shrink="No">
          <Button
            size="300"
            variant="Secondary"
            fill="Soft"
            onClick={requestClose}
            aria-label="Close Settings"
          >
            <Icon src={Icons.Cross} size="100" />
          </Button>
        </Box>
      </PageHeader>

      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <Box style={{ padding: config.space.S400 }}>
            <PageContent>
              <Box direction="Column" gap="600">
            {/* Enable/Disable Section */}
            <SettingTile
              title="Enable Encrypted Search"
              after={
                <Switch
                  variant="Primary"
                  value={enabled}
                  onChange={handleToggleEncryption}
                  disabled={loading}
                />
              }
            />
            <Text size="T300" priority="300">
              Create a local encrypted index to search through all your messages including
              encrypted ones
            </Text>

            {enabled && (
              <>
                <Line size="300" variant="Secondary" />

                {/* Stats Section */}
                <Box direction="Column" gap="300">
                  <Text size="H5">Index Status</Text>

                  {stats ? (
                    <Box direction="Column" gap="200">
                      <Box
                        justifyContent="SpaceBetween"
                        alignItems="Center"
                        style={{
                          padding: config.space.S200,
                          backgroundColor: 'var(--bg-surface-low)',
                          borderRadius: config.radii.R300,
                        }}
                      >
                        <Box direction="Column" gap="100">
                          <Text size="T300" priority="300">
                            Total Messages Indexed
                          </Text>
                          <Text size="H5">{stats.totalIndexedMessages.toLocaleString()}</Text>
                        </Box>
                        <Badge size="400" variant="Success" fill="Soft" radii="Pill">
                          <Icon size="50" src={Icons.Check} />
                          <Text size="L400">Active</Text>
                        </Badge>
                      </Box>

                      <Box justifyContent="SpaceBetween">
                        <Text size="T300" priority="300">
                          Rooms Indexed:
                        </Text>
                        <Text size="T300">{stats.roomsIndexed}</Text>
                      </Box>

                      {stats.lastIndexedAt && (
                        <Box justifyContent="SpaceBetween">
                          <Text size="T300" priority="300">
                            Last Updated:
                          </Text>
                          <Text size="T300">{new Date(stats.lastIndexedAt).toLocaleString()}</Text>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Text size="T300" priority="300">
                      Loading statistics...
                    </Text>
                  )}
                </Box>

                <Line size="300" variant="Secondary" />

                {/* Indexing Section */}
                <Box direction="Column" gap="300">
                  <Text size="H5">Index Messages</Text>

                  <Text size="T300" priority="300">
                    Download and index your message history to enable searching through encrypted
                    messages. This may take several minutes depending on the number of messages.
                  </Text>

                  {indexing ? (
                    <Box direction="Column" gap="300">
                      <Box justifyContent="SpaceBetween" alignItems="Center">
                        <Box gap="200" alignItems="Center">
                          <Spinner size="200" variant="Secondary" />
                          <Text size="T300">
                            Indexing: {indexingProgress.processed} / {indexingProgress.total} rooms
                          </Text>
                        </Box>
                        <Button onClick={handleStopIndexing} variant="Critical" size="300">
                          Stop
                        </Button>
                      </Box>

                      {indexingProgress.currentRoom && (
                        <Text size="T200" priority="300">
                          Current room: {indexingProgress.currentRoom}
                        </Text>
                      )}
                    </Box>
                  ) : (
                    <Button
                      onClick={handleStartIndexing}
                      variant="Primary"
                      size="400"
                      fill="Soft"
                      disabled={loading}
                    >
                      <Icon src={Icons.Download} size="200" />
                      <Text>Index All Messages</Text>
                    </Button>
                  )}
                </Box>

                <Line size="300" variant="Secondary" />

                {/* Danger Zone */}
                <Box direction="Column" gap="300">
                  <Text size="H5">Danger Zone</Text>

                  <Box
                    style={{
                      padding: config.space.S300,
                      backgroundColor: 'var(--bg-critical-container)',
                      borderRadius: config.radii.R400,
                    }}
                    direction="Column"
                    gap="200"
                  >
                    <Text size="L400">Clear Search Index</Text>
                    <Text size="T300" priority="300">
                      Permanently delete the local search index. You will need to re-index all
                      messages to use encrypted search again.
                    </Text>
                    <Button
                      onClick={handleClearIndex}
                      variant="Critical"
                      size="400"
                      disabled={loading || indexing}
                    >
                      <Icon src={Icons.Delete} size="200" />
                      <Text>Clear Index</Text>
                    </Button>
                  </Box>
                </Box>
              </>
            )}

                <Line size="300" variant="Secondary" />

                {/* Info Section */}
                <Box
                  style={{
                    padding: config.space.S300,
                    backgroundColor: 'var(--bg-surface-low)',
                    borderRadius: config.radii.R400,
                  }}
                  direction="Column"
                  gap="200"
                >
                  <Box gap="200" alignItems="Center">
                    <Icon src={Icons.Info} size="200" />
                    <Text size="L400">About Encrypted Search</Text>
                  </Box>
                  <Box direction="Column" gap="100">
                    <Text size="T300" priority="300">
                      • Search works in encrypted rooms (E2EE)
                    </Text>
                    <Text size="T300" priority="300">
                      • Messages are indexed locally on your device
                    </Text>
                    <Text size="T300" priority="300">
                      • The index is encrypted with AES-256-GCM
                    </Text>
                    <Text size="T300" priority="300">
                      • Supports Discord-like filters (from:, in:, has:, etc.)
                    </Text>
                    <Text size="T300" priority="300">
                      • May consume additional storage (~30% of message size)
                    </Text>
                  </Box>
                </Box>
              </Box>
            </PageContent>
          </Box>
        </Scroll>
      </Box>
    </Page>
  );
}
