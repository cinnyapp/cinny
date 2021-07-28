import React from 'react';
import PropTypes from 'prop-types';
import './Toggle.scss';

function Toggle({ isActive, onToggle }) {
  return (
    // eslint-disable-next-line jsx-a11y/control-has-associated-label
    <button
      onClick={() => onToggle(!isActive)}
      className={`toggle${isActive ? ' toggle--active' : ''}`}
      type="button"
    />
  );
}

Toggle.defaultProps = {
  isActive: false,
};

Toggle.propTypes = {
  isActive: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
};

export default Toggle;
