import React from 'react';
import PropTypes from 'prop-types';
import './Button.scss';

import Text from '../text/Text';
import RawIcon from '../system-icons/RawIcon';
import { blurOnBubbling } from './script';

const Button = React.forwardRef(({
  id, className, variant, iconSrc,
  type, onClick, children, disabled,
}, ref) => {
  const iconClass = (iconSrc === null) ? '' : `btn-${variant}--icon`;
  return (
    <button
      ref={ref}
      id={id === '' ? undefined : id}
      className={`${className ? `${className} ` : ''}btn-${variant} ${iconClass} noselect`}
      onMouseUp={(e) => blurOnBubbling(e, `.btn-${variant}`)}
      onClick={onClick}
      // eslint-disable-next-line react/button-has-type
      type={type}
      disabled={disabled}
    >
      {iconSrc !== null && <RawIcon size="small" src={iconSrc} />}
      {typeof children === 'string' && <Text variant="b1">{ children }</Text>}
      {typeof children !== 'string' && children }
    </button>
  );
});

Button.defaultProps = {
  id: '',
  className: null,
  variant: 'surface',
  iconSrc: null,
  type: 'button',
  onClick: null,
  disabled: false,
};

Button.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['surface', 'primary', 'positive', 'caution', 'danger']),
  iconSrc: PropTypes.string,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  onClick: PropTypes.func,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool,
};

export default Button;
