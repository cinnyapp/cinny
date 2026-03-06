import React, { MouseEventHandler, useState } from 'react';
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
  Chip,
  PopOut,
  RectCords,
} from 'folds';
import { stopPropagation } from '../../../utils/keyboard';
import { timeDayMonthYear, timeHourMinute, hoursToMs, daysToMs } from '../../../utils/time';
import { DatePicker, TimePicker } from '../../../components/time-date';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';

type SchedulePickerDialogProps = {
  initialTime?: number;
  showEncryptionWarning?: boolean;
  onCancel: () => void;
  onSubmit: (scheduledDate: Date) => void;
};

export function SchedulePickerDialog({
  initialTime,
  showEncryptionWarning,
  onCancel,
  onSubmit,
}: SchedulePickerDialogProps) {
  const now = Date.now();
  const maxDelay = daysToMs(30);
  const defaultTs = initialTime ?? now + hoursToMs(1);
  const [ts, setTs] = useState(() => Math.max(defaultTs, now + 60000));
  const [error, setError] = useState<string>();

  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [timePickerCords, setTimePickerCords] = useState<RectCords>();
  const [datePickerCords, setDatePickerCords] = useState<RectCords>();

  const handleTimePicker: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setTimePickerCords(evt.currentTarget.getBoundingClientRect());
  };
  const handleDatePicker: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setDatePickerCords(evt.currentTarget.getBoundingClientRect());
  };

  const handlePreset = (offsetMs: number) => {
    setTs(Date.now() + offsetMs);
    setError(undefined);
  };

  const handleSubmit = () => {
    const delay = ts - Date.now();
    if (delay <= 0) {
      setError('Scheduled time must be in the future');
      return;
    }
    if (delay > maxDelay) {
      setError('Cannot schedule more than 30 days in advance');
      return;
    }
    setError(undefined);
    onSubmit(new Date(ts));
  };

  const isPast = ts <= now;

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
                <Text size="H4">Schedule Send</Text>
              </Box>
              <IconButton size="300" onClick={onCancel} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box direction="Column" gap="500" style={{ padding: config.space.S400 }}>
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
                          <TimePicker
                            min={now}
                            max={now + maxDelay}
                            value={ts}
                            onChange={setTs}
                          />
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
                          <DatePicker
                            min={now}
                            max={now + maxDelay}
                            value={ts}
                            onChange={setTs}
                          />
                        </FocusTrap>
                      }
                    />
                  </Box>
                </Box>
              </Box>
              <Box direction="Column" gap="100">
                <Text size="L400">Quick Schedule</Text>
                <Box gap="200" wrap="Wrap">
                  <Chip
                    variant="SurfaceVariant"
                    radii="Pill"
                    onClick={() => handlePreset(hoursToMs(1))}
                  >
                    <Text size="B300">In 1 hour</Text>
                  </Chip>
                  <Chip
                    variant="SurfaceVariant"
                    radii="Pill"
                    onClick={() => handlePreset(hoursToMs(4))}
                  >
                    <Text size="B300">In 4 hours</Text>
                  </Chip>
                  <Chip
                    variant="SurfaceVariant"
                    radii="Pill"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(9, 0, 0, 0);
                      setTs(tomorrow.getTime());
                      setError(undefined);
                    }}
                  >
                    <Text size="B300">Tomorrow 9 AM</Text>
                  </Chip>
                  <Chip
                    variant="SurfaceVariant"
                    radii="Pill"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(14, 0, 0, 0);
                      setTs(tomorrow.getTime());
                      setError(undefined);
                    }}
                  >
                    <Text size="B300">Tomorrow 2 PM</Text>
                  </Chip>
                </Box>
              </Box>
              {showEncryptionWarning && (
                <Text size="T300" priority="400">
                  Note: This message will be encrypted with current room keys. Devices that join
                  or are added after scheduling may not be able to decrypt it.
                </Text>
              )}
              {(error || isPast) && (
                <Text style={{ color: color.Critical.Main }} size="T300">
                  {error || 'Selected time is in the past'}
                </Text>
              )}
              <Button
                type="submit"
                variant="Primary"
                aria-disabled={isPast}
                onClick={handleSubmit}
              >
                <Text size="B400">Schedule Send</Text>
              </Button>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
