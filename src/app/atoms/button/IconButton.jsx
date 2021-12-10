import React from 'react';
import PropTypes from 'prop-types';
import './IconButton.scss';

import RawIcon from '../system-icons/RawIcon';
import Tooltip from '../tooltip/Tooltip';
import { blurOnBubbling } from './script';
import Text from '../text/Text';

const IconButton = React.forwardRef(({
  variant, size, type,
  tooltip, tooltipPlacement, src, onClick, tabIndex,
}, ref) => {
  const btn = (
    <button
      ref={ref}
      className={`ic-btn ic-btn-${variant}`}
      onMouseUp={(e) => blurOnBubbling(e, `.ic-btn-${variant}`)}
      onClick={onClick}
      // eslint-disable-next-line react/button-has-type
      type={type}
      tabIndex={tabIndex}
    >
      <RawIcon size={size} src={src} />
    </button>
  );
  if (tooltip === null) return btn;
  return (
    <Tooltip
      placement={tooltipPlacement}
      content={<Text variant="b2">{tooltip}</Text>}
    >
      {btn}
    </Tooltip>
  );
});

IconButton.defaultProps = {
  variant: 'surface',
  size: 'normal',
  type: 'button',
  tooltip: null,
  tooltipPlacement: 'top',
  onClick: null,
  tabIndex: 0,
};

IconButton.propTypes = {
  variant: PropTypes.oneOf(['surface', 'primary', 'positive', 'caution', 'danger']),
  size: PropTypes.oneOf(['normal', 'small', 'extra-small']),
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  tooltip: PropTypes.string,
  tooltipPlacement: PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
  src: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  tabIndex: PropTypes.number,
};

export default IconButton;
