import React, { MouseEventHandler, useCallback, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Dialog,
  Overlay,
  OverlayCenter,
  OverlayBackdrop,
  Header,
  config,
  Box,
  Text,
  IconButton,
  Icon,
  Icons,
  color,
  Button,
  Spinner,
  Chip,
  PopOut,
  RectCords,
} from 'folds';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { getTimestampToEvent, GetTimestampToEventOK } from 'neurone/lib/api/matrix/client/v1/rooms';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { stopPropagation } from '../../../utils/keyboard';
import { useAlive } from '../../../hooks/useAlive';
import { useRoom } from '../../../hooks/useRoom';
import { getToday, getYesterday, timeDayMonthYear, timeHourMinute } from '../../../utils/time';
import { DatePicker, TimePicker } from '../../../components/time-date';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { useClient } from '../../../hooks/useClient';

type JumpToTimeProps = {
  onCancel: () => void;
  onSubmit: (eventId: string) => void;
};
export function JumpToTime({ onCancel, onSubmit }: JumpToTimeProps) {
  const ct = useClient();
  const roomId = useRoom();
  const alive = useAlive();

  const todayTs = getToday();
  const yesterdayTs = getYesterday();
  const createTs =
    ct.state.join.create.read.find((e) => e.roomId === roomId)?.event.origin_server_ts ?? 0;
  const [ts, setTs] = useState(() => Date.now());

  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');

  const [timePickerCords, setTimePickerCords] = useState<RectCords>();
  const [datePickerCords, setDatePickerCords] = useState<RectCords>();

  const handleTimePicker: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setTimePickerCords(evt.currentTarget.getBoundingClientRect());
  };
  const handleDatePicker: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setDatePickerCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleToday = () => {
    setTs(todayTs < createTs ? createTs : todayTs);
  };
  const handleYesterday = () => {
    setTs(yesterdayTs < createTs ? createTs : yesterdayTs);
  };
  const handleBeginning = () => setTs(createTs);

  const [timestampState, timestampToEvent] = useAsyncCallback<string, unknown, [number]>(
    useCallback(
      async (newTs) => {
        const resp = await ct.requestAuthJSON(
          getTimestampToEvent({
            pathParams: { roomId },
            searchParams: { ts: newTs, dir: 'f' },
          })
        );
        const [err, result] = await parseMatrixResp<GetTimestampToEventOK>(resp);
        if (err) throw new Error(err.data.error ?? err.data.errcode);
        return result.event_id;
      },
      [ct, roomId]
    )
  );

  const handleSubmit = () => {
    timestampToEvent(ts).then((eventId) => {
      if (alive()) {
        onSubmit(eventId);
      }
    });
  };

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: onCancel,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog variant="Surface">
            <Header
              style={{
                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                borderBottomWidth: config.borderWidth.B300,
              }}
              variant="Surface"
              size="500"
            >
              <Box grow="Yes">
                <Text size="H4">Jump to Time</Text>
              </Box>
              <IconButton size="300" onClick={onCancel} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="500">
              <Box direction="Row" gap="300">
                <Box direction="Column" gap="100">
                  <Text size="L400" priority="400">
                    Time
                  </Text>
                  <Box gap="100" alignItems="Center">
                    <Chip
                      size="500"
                      variant="Surface"
                      fill="None"
                      outlined
                      radii="300"
                      aria-pressed={!!timePickerCords}
                      after={<Icon size="50" src={Icons.ChevronBottom} />}
                      onClick={handleTimePicker}
                    >
                      <Text size="B300">{timeHourMinute(ts, hour24Clock)}</Text>
                    </Chip>
                    <PopOut
                      anchor={timePickerCords}
                      offset={5}
                      position="Bottom"
                      align="Center"
                      content={
                        <FocusTrap
                          focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: () => setTimePickerCords(undefined),
                            clickOutsideDeactivates: true,
                            isKeyForward: (evt: KeyboardEvent) =>
                              evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
                            isKeyBackward: (evt: KeyboardEvent) =>
                              evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
                            escapeDeactivates: stopPropagation,
                          }}
                        >
                          <TimePicker min={createTs} max={Date.now()} value={ts} onChange={setTs} />
                        </FocusTrap>
                      }
                    />
                  </Box>
                </Box>
                <Box direction="Column" gap="100">
                  <Text size="L400" priority="400">
                    Date
                  </Text>
                  <Box gap="100" alignItems="Center">
                    <Chip
                      size="500"
                      variant="Surface"
                      fill="None"
                      outlined
                      radii="300"
                      aria-pressed={!!datePickerCords}
                      after={<Icon size="50" src={Icons.ChevronBottom} />}
                      onClick={handleDatePicker}
                    >
                      <Text size="B300">{timeDayMonthYear(ts)}</Text>
                    </Chip>
                    <PopOut
                      anchor={datePickerCords}
                      offset={5}
                      position="Bottom"
                      align="Center"
                      content={
                        <FocusTrap
                          focusTrapOptions={{
                            initialFocus: false,
                            onDeactivate: () => setDatePickerCords(undefined),
                            clickOutsideDeactivates: true,
                            isKeyForward: (evt: KeyboardEvent) =>
                              evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
                            isKeyBackward: (evt: KeyboardEvent) =>
                              evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
                            escapeDeactivates: stopPropagation,
                          }}
                        >
                          <DatePicker min={createTs} max={Date.now()} value={ts} onChange={setTs} />
                        </FocusTrap>
                      }
                    />
                  </Box>
                </Box>
              </Box>
              <Box direction="Column" gap="100">
                <Text size="L400">Preset</Text>
                <Box gap="200">
                  {createTs < todayTs && (
                    <Chip
                      variant={ts === todayTs ? 'Success' : 'SurfaceVariant'}
                      radii="Pill"
                      aria-pressed={ts === todayTs}
                      onClick={handleToday}
                    >
                      <Text size="B300">Today</Text>
                    </Chip>
                  )}
                  {createTs < yesterdayTs && (
                    <Chip
                      variant={ts === yesterdayTs ? 'Success' : 'SurfaceVariant'}
                      radii="Pill"
                      aria-pressed={ts === yesterdayTs}
                      onClick={handleYesterday}
                    >
                      <Text size="B300">Yesterday</Text>
                    </Chip>
                  )}
                  <Chip
                    variant={ts === createTs ? 'Success' : 'SurfaceVariant'}
                    radii="Pill"
                    aria-pressed={ts === createTs}
                    onClick={handleBeginning}
                  >
                    <Text size="B300">Beginning</Text>
                  </Chip>
                </Box>
              </Box>
              {timestampState.status === AsyncStatus.Error && (
                <Text style={{ color: color.Critical.Main }} size="T300">
                  {timestampState.error instanceof Error
                    ? timestampState.error.message
                    : 'Unknown Error'}
                </Text>
              )}
              <Button
                type="submit"
                variant="Primary"
                before={
                  timestampState.status === AsyncStatus.Loading ? (
                    <Spinner fill="Solid" variant="Primary" size="200" />
                  ) : undefined
                }
                aria-disabled={
                  timestampState.status === AsyncStatus.Loading ||
                  timestampState.status === AsyncStatus.Success
                }
                onClick={handleSubmit}
              >
                <Text size="B400">Open Timeline</Text>
              </Button>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
