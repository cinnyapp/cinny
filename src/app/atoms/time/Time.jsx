import React from 'react';
import PropTypes from 'prop-types';

import dateFormat from 'dateformat';
import { isInSameDay } from '../../../util/common';

function Time({ timestamp, fullTime }) {
  const date = new Date(timestamp);

  const formattedFullTime = dateFormat(date, 'dd mmmm yyyy, hh:MM TT');
  let formattedDate = formattedFullTime;

  if (!fullTime) {
    const compareDate = new Date();
    const isToday = isInSameDay(date, compareDate);
    compareDate.setDate(compareDate.getDate() - 1);
    const isYesterday = isInSameDay(date, compareDate);

    formattedDate = dateFormat(date, isToday || isYesterday ? 'hh:MM TT' : 'dd/mm/yyyy');
    if (isYesterday) {
      formattedDate = `Yesterday, ${formattedDate}`;
    }
  }

  return (
    <time
      dateTime={date.toISOString()}
      title={formattedFullTime}
    >
      {formattedDate}
    </time>
  );
}

Time.defaultProps = {
  fullTime: false,
};

Time.propTypes = {
  timestamp: PropTypes.number.isRequired,
  fullTime: PropTypes.bool,
};

export default Time;
