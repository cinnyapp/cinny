// @ts-check
// eslint-disable-next-line no-use-before-define
import React, { FunctionComponent, MouseEventHandler } from 'react';
import './IconButton.scss';

import Tippy from '@tippyjs/react';
import RawIcon from '../system-icons/RawIcon';
import { Text } from '../text/Text';

// TODO:
// 1. [done] an icon only button have "src"
// 2. have multiple variant
// 3. [done] should have a smart accessibility "label" arial-label
// 4. [done] have size as RawIcon

type IconButtonProps = {
  variant?: 'surface',
  size?: 'extra-small' | 'small' | 'normal',
  type?: 'button' | 'submit',
  tooltip: string,
  tooltipPlacement?: 'top' | 'right' | 'bottom' | 'left',
  src: string,
  onClick: MouseEventHandler<HTMLButtonElement>,
}

// eslint-disable-next-line max-len
export const IconButton: FunctionComponent<IconButtonProps> = React.forwardRef<HTMLButtonElement, IconButtonProps>(({
  variant = 'surface',
  size = 'normal',
  type = 'button',
  tooltip = '',
  tooltipPlacement = 'top',
  src = '',
  onClick = () => undefined,
}: IconButtonProps, ref) => (
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
      className={`ic-btn-${variant}`}
      ref={ref}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      type={type === 'button' ? 'button' : 'submit'}
    >
      <RawIcon size={size} src={src} />
    </button>
  </Tippy>
));
