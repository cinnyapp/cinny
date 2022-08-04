import React from 'react';
import PropTypes from 'prop-types';

import dateFormat from 'dateformat';

function Time({ timestamp }) {
  const date = new Date(timestamp);
  return (
    <time
      dateTime={date.toISOString()}
      title={dateFormat(date, 'dd mmmm yyyy, hh:MM TT')}
    >
      {dateFormat(date, 'hh:MM TT')}
    </time>
  );
}

Time.propTypes = {
  timestamp: PropTypes.number.isRequired,
};

export default Time;
