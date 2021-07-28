import React from 'react';
import PropTypes from 'prop-types';
import './Spinner.scss';

function Spinner({ size }) {
  return (
    <div className={`donut-spinner donut-spinner--${size}`}> </div>
  );
}

Spinner.defaultProps = {
  size: 'normal',
};

Spinner.propTypes = {
  size: PropTypes.oneOf(['normal', 'small']),
};

export default Spinner;
