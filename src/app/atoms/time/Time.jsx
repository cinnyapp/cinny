import React from 'react';
import PropTypes from 'prop-types';

import dateFormat from 'dateformat';
import { isInSameDay } from '../../../util/common';

function Time({ timestamp }) {
  const date = new Date(timestamp);

  const compareDate = new Date();
  const isToday = isInSameDay(date, compareDate);

  compareDate.setDate(compareDate.getDate() - 1);
  const isYesterday = isInSameDay(date, compareDate);

  const formattedDate = dateFormat(date, isToday || isYesterday ? 'hh:MM TT' : 'dd/mm/yyyy');

  return (
    <time
      dateTime={date.toISOString()}
      title={dateFormat(date, 'dd mmmm yyyy, hh:MM TT')}
    >
      {isYesterday ? `Yesterday, ${formattedDate}` : formattedDate}
    </time>
  );
}

Time.propTypes = {
  timestamp: PropTypes.number.isRequired,
};

export default Time;
