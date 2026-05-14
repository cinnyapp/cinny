import React, { forwardRef } from 'react';
import { Menu, Box, Text, Chip } from 'folds';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import * as css from './styles.css';
import { PickerColumn } from './PickerColumn';
import { hour12to24, hour24to12, hoursToMs, inSameDay, minutesToMs } from '../../utils/time';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';

type TimePickerProps = {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
};
export const TimePicker = forwardRef<HTMLDivElement, TimePickerProps>(
  ({ min, max, value, onChange }, ref) => {
    const { t } = useTranslation();
    const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');

    const hour24 = dayjs(value).hour();

    const selectedHour = hour24Clock ? hour24 : hour24to12(hour24);
    const selectedMinute = dayjs(value).minute();
    const selectedPM = hour24 >= 12;

    const handleSubmit = (newValue: number) => {
      onChange(Math.min(Math.max(min, newValue), max));
    };

    const handleHour = (hour: number) => {
      const seconds = hoursToMs(hour24Clock ? hour : hour12to24(hour, selectedPM));
      const lastSeconds = hoursToMs(hour24);
      const newValue = value + (seconds - lastSeconds);
      handleSubmit(newValue);
    };

    const handleMinute = (minute: number) => {
      const seconds = minutesToMs(minute);
      const lastSeconds = minutesToMs(selectedMinute);
      const newValue = value + (seconds - lastSeconds);
      handleSubmit(newValue);
    };

    const handlePeriod = (pm: boolean) => {
      const seconds = hoursToMs(hour12to24(selectedHour, pm));
      const lastSeconds = hoursToMs(hour24);
      const newValue = value + (seconds - lastSeconds);
      handleSubmit(newValue);
    };

    const minHour24 = dayjs(min).hour();
    const maxHour24 = dayjs(max).hour();

    const minMinute = dayjs(min).minute();
    const maxMinute = dayjs(max).minute();
    const minPM = minHour24 >= 12;
    const maxPM = maxHour24 >= 12;

    const minDay = inSameDay(min, value);
    const maxDay = inSameDay(max, value);

    return (
      <Menu className={css.PickerMenu} ref={ref}>
        <Box direction="Row" gap="200" className={css.PickerContainer}>
          <PickerColumn title={t('datePicker.hour')}>
            {hour24Clock
              ? Array.from(Array(24).keys()).map((hour) => (
                  <Chip
                    key={hour}
                    size="500"
                    variant={hour === selectedHour ? 'Primary' : 'Background'}
                    fill="None"
                    radii="300"
                    aria-selected={hour === selectedHour}
                    onClick={() => handleHour(hour)}
                    disabled={(minDay && hour < minHour24) || (maxDay && hour > maxHour24)}
                  >
                    <Text size="T300">{hour < 10 ? `0${hour}` : hour}</Text>
                  </Chip>
                ))
              : Array.from(Array(12).keys())
                  .map((i) => {
                    if (i === 0) return 12;
                    return i;
                  })
                  .map((hour) => (
                    <Chip
                      key={hour}
                      size="500"
                      variant={hour === selectedHour ? 'Primary' : 'Background'}
                      fill="None"
                      radii="300"
                      aria-selected={hour === selectedHour}
                      onClick={() => handleHour(hour)}
                      disabled={
                        (minDay && hour12to24(hour, selectedPM) < minHour24) ||
                        (maxDay && hour12to24(hour, selectedPM) > maxHour24)
                      }
                    >
                      <Text size="T300">{hour < 10 ? `0${hour}` : hour}</Text>
                    </Chip>
                  ))}
          </PickerColumn>
          <PickerColumn title={t('datePicker.minutes')}>
            {Array.from(Array(60).keys()).map((minute) => (
              <Chip
                key={minute}
                size="500"
                variant={minute === selectedMinute ? 'Primary' : 'Background'}
                fill="None"
                radii="300"
                aria-selected={minute === selectedMinute}
                onClick={() => handleMinute(minute)}
                disabled={
                  (minDay && hour24 === minHour24 && minute < minMinute) ||
                  (maxDay && hour24 === maxHour24 && minute > maxMinute)
                }
              >
                <Text size="T300">{minute < 10 ? `0${minute}` : minute}</Text>
              </Chip>
            ))}
          </PickerColumn>
          {!hour24Clock && (
            <PickerColumn title={t('datePicker.period')}>
              <Chip
                size="500"
                variant={!selectedPM ? 'Primary' : 'SurfaceVariant'}
                fill="None"
                radii="300"
                aria-selected={!selectedPM}
                onClick={() => handlePeriod(false)}
                disabled={minDay && minPM}
              >
                <Text size="T300">AM</Text>
              </Chip>
              <Chip
                size="500"
                variant={selectedPM ? 'Primary' : 'SurfaceVariant'}
                fill="None"
                radii="300"
                aria-selected={selectedPM}
                onClick={() => handlePeriod(true)}
                disabled={maxDay && !maxPM}
              >
                <Text size="T300">PM</Text>
              </Chip>
            </PickerColumn>
          )}
        </Box>
      </Menu>
    );
  }
);
