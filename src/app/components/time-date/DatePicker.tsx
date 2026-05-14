import React, { forwardRef } from 'react';
import { Menu, Box, Text, Chip } from 'folds';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import * as css from './styles.css';
import { PickerColumn } from './PickerColumn';
import { dateFor, daysInMonth, daysToMs } from '../../utils/time';

type DatePickerProps = {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
};
export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  ({ min, max, value, onChange }, ref) => {
    const { t } = useTranslation();
    const selectedYear = dayjs(value).year();
    const selectedMonth = dayjs(value).month() + 1;
    const selectedDay = dayjs(value).date();

    const handleSubmit = (newValue: number) => {
      onChange(Math.min(Math.max(min, newValue), max));
    };

    const handleDay = (day: number) => {
      const seconds = daysToMs(day);
      const lastSeconds = daysToMs(selectedDay);
      const newValue = value + (seconds - lastSeconds);
      handleSubmit(newValue);
    };

    const handleMonthAndYear = (month: number, year: number) => {
      const mDays = daysInMonth(month, year);
      const currentDate = dateFor(selectedYear, selectedMonth, selectedDay);
      const time = value - currentDate;

      const newDate = dateFor(year, month, mDays < selectedDay ? mDays : selectedDay);

      const newValue = newDate + time;
      handleSubmit(newValue);
    };

    const handleMonth = (month: number) => {
      handleMonthAndYear(month, selectedYear);
    };

    const handleYear = (year: number) => {
      handleMonthAndYear(selectedMonth, year);
    };

    const minYear = dayjs(min).year();
    const maxYear = dayjs(max).year();
    const yearsRange = maxYear - minYear + 1;

    const minMonth = dayjs(min).month() + 1;
    const maxMonth = dayjs(max).month() + 1;

    const minDay = dayjs(min).date();
    const maxDay = dayjs(max).date();
    return (
      <Menu className={css.PickerMenu} ref={ref}>
        <Box direction="Row" gap="200" className={css.PickerContainer}>
          <PickerColumn title={t('datePicker.day')}>
            {Array.from(Array(daysInMonth(selectedMonth, selectedYear)).keys())
              .map((i) => i + 1)
              .map((day) => (
                <Chip
                  key={day}
                  size="500"
                  variant={selectedDay === day ? 'Primary' : 'SurfaceVariant'}
                  fill="None"
                  radii="300"
                  aria-selected={selectedDay === day}
                  onClick={() => handleDay(day)}
                  disabled={
                    (selectedYear === minYear && selectedMonth === minMonth && day < minDay) ||
                    (selectedYear === maxYear && selectedMonth === maxMonth && day > maxDay)
                  }
                >
                  <Text size="T300">{day}</Text>
                </Chip>
              ))}
          </PickerColumn>
          <PickerColumn title={t('datePicker.month')}>
            {Array.from(Array(12).keys())
              .map((i) => i + 1)
              .map((month) => (
                <Chip
                  key={month}
                  size="500"
                  variant={selectedMonth === month ? 'Primary' : 'SurfaceVariant'}
                  fill="None"
                  radii="300"
                  aria-selected={selectedMonth === month}
                  onClick={() => handleMonth(month)}
                  disabled={
                    (selectedYear === minYear && month < minMonth) ||
                    (selectedYear === maxYear && month > maxMonth)
                  }
                >
                  <Text size="T300">
                    {dayjs()
                      .month(month - 1)
                      .format('MMM')}
                  </Text>
                </Chip>
              ))}
          </PickerColumn>
          <PickerColumn title={t('datePicker.year')}>
            {Array.from(Array(yearsRange).keys())
              .map((i) => minYear + i)
              .map((year) => (
                <Chip
                  key={year}
                  size="500"
                  variant={selectedYear === year ? 'Primary' : 'SurfaceVariant'}
                  fill="None"
                  radii="300"
                  aria-selected={selectedYear === year}
                  onClick={() => handleYear(year)}
                >
                  <Text size="T300">{year}</Text>
                </Chip>
              ))}
          </PickerColumn>
        </Box>
      </Menu>
    );
  }
);
