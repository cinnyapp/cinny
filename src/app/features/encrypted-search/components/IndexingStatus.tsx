/**
 * Display indexing status and progress
 */

import React, { useEffect, useState } from 'react';
import { Text, Box, Icon, Icons, Spinner, Button, ProgressBar, config } from 'folds';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useLocalSearchStats } from '../hooks/useLocalMessageSearch';
import { getHistoricalIndexer } from '../indexing/historicalIndexer';
import { IndexingProgressEvent } from '../types';

interface IndexingStatusProps {
  compact?: boolean;
}

export function IndexingStatus({ compact }: IndexingStatusProps) {
  const mx = useMatrixClient();
  const getStats = useLocalSearchStats();

  const [stats, setStats] = useState<{
    totalIndexedMessages: number;
    lastIndexedAt?: number;
    roomsIndexed: number;
  } | null>(null);

  const [indexingProgress, setIndexingProgress] = useState<{
    isIndexing: boolean;
    processed: number;
    total: number;
    currentRoom?: string;
  }>({
    isIndexing: false,
    processed: 0,
    total: 0,
  });

  // Load stats
  useEffect(() => {
    let mounted = true;

    getStats().then((s) => {
      if (mounted && s) {
        setStats(s);
      }
    });

    return () => {
      mounted = false;
    };
  }, [getStats]);

  // Start indexing
  const handleStartIndexing = async () => {
    try {
      const indexer = getHistoricalIndexer();

      const progressCallback = (event: IndexingProgressEvent) => {
        if (event.type === 'progress') {
          setIndexingProgress({
            isIndexing: true,
            processed: event.processed,
            total: event.total,
            currentRoom: event.roomId,
          });
        } else if (event.type === 'complete') {
          setIndexingProgress({
            isIndexing: false,
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

      setIndexingProgress({
        isIndexing: true,
        processed: 0,
        total: 0,
      });

      await indexer.indexAllRooms(progressCallback);
    } catch (error) {
      console.error('Failed to start indexing:', error);
      setIndexingProgress({
        isIndexing: false,
        processed: 0,
        total: 0,
      });
    }
  };

  // Stop indexing
  const handleStopIndexing = () => {
    try {
      const indexer = getHistoricalIndexer();
      indexer.stop();
    } catch (error) {
      console.error('Failed to stop indexing:', error);
    }
  };

  if (compact) {
    return (
      <Box gap="200" alignItems="Center">
        {indexingProgress.isIndexing ? (
          <>
            <Spinner size="100" variant="Secondary" />
            <Text size="T300" priority="300">
              Indexing: {indexingProgress.processed}/{indexingProgress.total} rooms
            </Text>
          </>
        ) : stats ? (
          <>
            <Icon size="100" src={Icons.Check} />
            <Text size="T300" priority="300">
              {stats.totalIndexedMessages.toLocaleString()} messages indexed
            </Text>
          </>
        ) : (
          <Text size="T300" priority="300">
            Loading...
          </Text>
        )}
      </Box>
    );
  }

  return (
    <Box direction="Column" gap="300">
      <Box direction="Column" gap="200">
        <Text size="H5">Indexing Status</Text>

        {stats && (
          <Box direction="Column" gap="100">
            <Box justifyContent="SpaceBetween">
              <Text size="T300" priority="300">
                Total Messages:
              </Text>
              <Text size="T300">{stats.totalIndexedMessages.toLocaleString()}</Text>
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
        )}
      </Box>

      {indexingProgress.isIndexing && (
        <Box direction="Column" gap="200">
          <Box justifyContent="SpaceBetween" alignItems="Center">
            <Text size="T300">
              Indexing rooms: {indexingProgress.processed} / {indexingProgress.total}
            </Text>
            <Button onClick={handleStopIndexing} variant="Critical" size="300">
              Stop
            </Button>
          </Box>

          {indexingProgress.total > 0 && (
            <ProgressBar
              variant="Secondary"
              size="300"
              value={indexingProgress.processed}
              max={indexingProgress.total}
            />
          )}

          {indexingProgress.currentRoom && (
            <Text size="T200" priority="300">
              Current room: {indexingProgress.currentRoom}
            </Text>
          )}
        </Box>
      )}

      {!indexingProgress.isIndexing && (
        <Button onClick={handleStartIndexing} variant="Primary" size="400" fill="Soft">
          <Icon src={Icons.Download} size="200" />
          <Text>Index All Messages</Text>
        </Button>
      )}

      <Box
        style={{
          padding: config.space.S200,
          backgroundColor: 'var(--bg-surface-low)',
          borderRadius: config.radii.R300,
        }}
      >
        <Text size="T300" priority="300">
          <Icon size="100" src={Icons.Info} /> Indexing downloads your message history and creates
          a local encrypted search index. This may take several minutes depending on the number of
          messages.
        </Text>
      </Box>
    </Box>
  );
}
