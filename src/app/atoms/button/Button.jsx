import React from 'react';
import PropTypes from 'prop-types';
import './Button.scss';

import { Text } from '../text/Text';
import RawIcon from '../system-icons/RawIcon';
import { blurOnBubbling } from './script';

function Button({
  id, variant, iconSrc, type, onClick, children, disabled,
}) {
  const iconClass = (iconSrc === null) ? '' : `btn-${variant}--icon`;
  return (
    <button
      id={id === '' ? undefined : id}
      className={`btn-${variant} ${iconClass} noselect`}
      onMouseUp={(e) => blurOnBubbling(e, `.btn-${variant}`)}
      onClick={onClick}
      type={type === 'button' ? 'button' : 'submit'}
      disabled={disabled}
    >
      {iconSrc !== null && <RawIcon size="small" src={iconSrc} />}
      <Text variant="b1">{ children }</Text>
    </button>
  );
}

Button.defaultProps = {
  id: '',
  variant: 'surface',
  iconSrc: null,
  type: 'button',
  onClick: null,
  disabled: false,
};

Button.propTypes = {
  id: PropTypes.string,
  variant: PropTypes.oneOf(['surface', 'primary', 'caution', 'danger']),
  iconSrc: PropTypes.string,
  type: PropTypes.oneOf(['button', 'submit']),
  onClick: PropTypes.func,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
};

export default Button;
