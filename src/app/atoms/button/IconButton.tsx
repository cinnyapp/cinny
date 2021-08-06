// @ts-check
// eslint-disable-next-line no-use-before-define
import React, { FunctionComponent, MouseEventHandler } from 'react';
import './IconButton.scss';

import Tippy from '@tippyjs/react';
import RawIcon from '../system-icons/RawIcon';
import { blurOnBubbling } from './script';
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

export const IconButton: FunctionComponent<IconButtonProps> = ({
  variant = 'surface',
  size = 'normal',
  type = 'button',
  tooltip = '',
  tooltipPlacement = 'top',
  src = '',
  onClick = () => undefined,
}: IconButtonProps) => (
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
      // onMouseUp={(e) => blurOnBubbling(e, `.ic-btn-${variant}`)}
      onClick={onClick}
      type={type === 'button' ? 'button' : 'submit'}
    >
      <RawIcon size={size} src={src} />
    </button>
  </Tippy>
);
