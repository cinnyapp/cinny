import React, { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Text, Chip, Icon, Icons, IconButton } from 'folds';
import { Room } from 'matrix-js-sdk';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getDelayedEvents, cancelDelayedEvent } from '../../../utils/delayedEvents';
import { delayedEventsSupportedAtom, roomIdToScheduledTimeAtomFamily, roomIdToEditingScheduledDelayIdAtomFamily } from '../../../state/scheduledMessages';
import { timeHourMinute, timeDayMonthYear } from '../../../utils/time';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { SchedulePickerDialog } from './SchedulePickerDialog';
import * as css from './ScheduledMessagesList.css';

type ScheduledMessagesListProps = {
  room: Room;
  onEditMessage?: (body: string, formattedBody?: string) => void;
};

export function ScheduledMessagesList({ room, onEditMessage }: ScheduledMessagesListProps) {
  const mx = useMatrixClient();
  const queryClient = useQueryClient();
  const supported = useAtomValue(delayedEventsSupportedAtom);
  const setScheduledTime = useSetAtom(roomIdToScheduledTimeAtomFamily(room.roomId));
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [expanded, setExpanded] = useState(false);
  const [editingDelayId, setEditingDelayId] = useAtom(roomIdToEditingScheduledDelayIdAtomFamily(room.roomId));

  const { data } = useQuery({
    queryKey: ['delayedEvents', room.roomId],
    queryFn: () => getDelayedEvents(mx),
    refetchInterval: 30000,
    enabled: supported,
  });

  const roomEvents = data?.delayed_events.filter(
    (evt) =>
      evt.room_id === room.roomId &&
      (evt.type === 'm.room.message' || evt.type === 'm.room.encrypted')
  );

  const invalidateEvents = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['delayedEvents', room.roomId] });
  }, [queryClient, room.roomId]);

  const handleCancel = useCallback(
    async (delayId: string) => {
      await cancelDelayedEvent(mx, delayId);
      invalidateEvents();
    },
    [mx, invalidateEvents]
  );

  const handleEdit = useCallback(
    (delayId: string, body: string, formattedBody?: string, scheduledTs?: number) => {
      if (onEditMessage) {
        onEditMessage(body, formattedBody);
      }
      if (scheduledTs) {
        setScheduledTime(new Date(scheduledTs));
      }
      setEditingDelayId(delayId);
    },
    [onEditMessage, setScheduledTime, setEditingDelayId]
  );

  const handleReschedule = useCallback(
    (scheduledDate: Date) => {
      setScheduledTime(scheduledDate);
      setEditingDelayId(null);
    },
    [setScheduledTime, setEditingDelayId]
  );

  const visibleEvents = roomEvents?.filter((e) => e.delay_id !== editingDelayId) ?? [];

  if (!supported || visibleEvents.length === 0) {
    return null;
  }

  return (
    <Box direction="Column">
      <Box className={css.ScheduledMessagesToggle}>
        <Chip
          variant="SurfaceVariant"
          radii="Pill"
          before={<Icon size="50" src={Icons.Clock} />}
          after={
            <Icon size="50" src={expanded ? Icons.ChevronTop : Icons.ChevronBottom} />
          }
          onClick={() => setExpanded(!expanded)}
        >
          <Text size="B300">
            {visibleEvents.length} scheduled{' '}
            {visibleEvents.length === 1 ? 'message' : 'messages'}
          </Text>
        </Chip>
      </Box>
      {expanded && (
        <Box direction="Column" className={css.ScheduledMessagesPanel}>
          {visibleEvents.map((evt) => {
            const deliveryTs =
              'delay' in evt ? evt.running_since + evt.delay : evt.running_since;
            const isEncryptedEvt = evt.type === 'm.room.encrypted';
            const body = isEncryptedEvt
              ? ''
              : typeof evt.content.body === 'string'
                ? evt.content.body
                : '';
            const formattedBody =
              !isEncryptedEvt && typeof evt.content.formatted_body === 'string'
                ? evt.content.formatted_body
                : undefined;

            return (
              <Box
                key={evt.delay_id}
                className={css.ScheduledMessageRow}
                direction="Row"
                gap="200"
                alignItems="Center"
                justifyContent="SpaceBetween"
              >
                <Box direction="Column" gap="100" grow="Yes" style={{ minWidth: 0 }}>
                  {isEncryptedEvt ? (
                    <Box direction="Row" gap="100" alignItems="Center">
                      <Icon size="50" src={Icons.Lock} />
                      <Text size="T300" priority="300">
                        Encrypted — cancel and resend to edit
                      </Text>
                    </Box>
                  ) : (
                    <Text className={css.MessagePreview} size="T300">
                      {body}
                    </Text>
                  )}
                  <Text size="T200" priority="300">
                    {timeDayMonthYear(deliveryTs)} at {timeHourMinute(deliveryTs, hour24Clock)}
                  </Text>
                </Box>
                <Box gap="100" shrink="No">
                  {!isEncryptedEvt && (
                    <IconButton
                      size="300"
                      variant="SurfaceVariant"
                      radii="300"
                      onClick={() => handleEdit(evt.delay_id, body, formattedBody, deliveryTs)}
                      aria-label="Edit scheduled message"
                    >
                      <Icon size="50" src={Icons.Pencil} />
                    </IconButton>
                  )}
                  <IconButton
                    size="300"
                    variant="Critical"
                    radii="300"
                    onClick={() => handleCancel(evt.delay_id)}
                    aria-label="Cancel scheduled message"
                  >
                    <Icon size="50" src={Icons.Cross} />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
      {editingDelayId && !onEditMessage && (
        <SchedulePickerDialog
          onCancel={() => setEditingDelayId(null)}
          onSubmit={handleReschedule}
        />
      )}
    </Box>
  );
}
