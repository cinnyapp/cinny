import React from 'react';
import PropTypes from 'prop-types';
import './IconButton.scss';

import Tippy from '@tippyjs/react';
import RawIcon from '../system-icons/RawIcon';
import { blurOnBubbling } from './script';
import Text from '../text/Text';

// TODO:
// 1. [done] an icon only button have "src"
// 2. have multiple variant
// 3. [done] should have a smart accessibility "label" arial-label
// 4. [done] have size as RawIcon

const IconButton = React.forwardRef(({
  variant, size, type,
  tooltip, tooltipPlacement, src, onClick,
}, ref) => (
  <Tippy
    content={<Text variant="b2">{tooltip}</Text>}
    className="ic-btn-tippy"
    touch="hold"
    arrow={false}
    maxWidth={250}
    placement={tooltipPlacement}
    delay={[0, 0]}
    duration={[100, 0]}
  >
    <button
      ref={ref}
      className={`ic-btn-${variant}`}
      onMouseUp={(e) => blurOnBubbling(e, `.ic-btn-${variant}`)}
      onClick={onClick}
      type={type === 'button' ? 'button' : 'submit'}
    >
      <RawIcon size={size} src={src} />
    </button>
  </Tippy>
));

IconButton.defaultProps = {
  variant: 'surface',
  size: 'normal',
  type: 'button',
  tooltipPlacement: 'top',
  onClick: null,
};

IconButton.propTypes = {
  variant: PropTypes.oneOf(['surface']),
  size: PropTypes.oneOf(['normal', 'small', 'extra-small']),
  type: PropTypes.oneOf(['button', 'submit']),
  tooltip: PropTypes.string.isRequired,
  tooltipPlacement: PropTypes.oneOf(['top', 'right', 'bottom', 'left']),
  src: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

export default IconButton;
