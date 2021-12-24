import React from 'react';
import PropTypes from 'prop-types';
import './RadioButton.scss';

function RadioButton({ isActive, onToggle }) {
  if (onToggle === null) return <span className={`radio-btn${isActive ? ' radio-btn--active' : ''}`} />;
  return (
    // eslint-disable-next-line jsx-a11y/control-has-associated-label
    <button
      onClick={() => onToggle(!isActive)}
      className={`radio-btn${isActive ? ' radio-btn--active' : ''}`}
      type="button"
    />
  );
}

RadioButton.defaultProps = {
  isActive: false,
  onToggle: null,
};

RadioButton.propTypes = {
  isActive: PropTypes.bool,
  onToggle: PropTypes.func,
};

export default RadioButton;
