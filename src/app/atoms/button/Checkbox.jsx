import React from 'react';
import PropTypes from 'prop-types';
import './Checkbox.scss';

function Checkbox({
  variant, isActive, onToggle, disabled,
}) {
  const className = `checkbox checkbox-${variant}${isActive ? ' checkbox--active' : ''}`;
  if (onToggle === null) return <span className={className} />;
  return (
    // eslint-disable-next-line jsx-a11y/control-has-associated-label
    <button
      onClick={() => onToggle(!isActive)}
      className={className}
      type="button"
      disabled={disabled}
    />
  );
}

Checkbox.defaultProps = {
  variant: 'primary',
  isActive: false,
  onToggle: null,
  disabled: false,
};

Checkbox.propTypes = {
  variant: PropTypes.oneOf(['primary', 'positive', 'caution', 'danger']),
  isActive: PropTypes.bool,
  onToggle: PropTypes.func,
  disabled: PropTypes.bool,
};

export default Checkbox;
