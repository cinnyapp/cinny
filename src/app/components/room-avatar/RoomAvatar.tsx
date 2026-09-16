import { JoinRule } from 'matrix-js-sdk';
import { AvatarFallback, Icon, Icons, color } from 'folds';
import React, { ComponentProps, ReactNode, forwardRef, useState } from 'react';
import * as css from './RoomAvatar.css';
import { getRoomIconSrc } from '../../utils/room';
import colorMXID from '../../../util/colorMXID';
import { AvatarImage } from './AvatarImage';

type RoomAvatarProps = {
  roomId: string;
  src?: string;
  alt?: string;
  renderFallback: () => ReactNode;
  uniformIcons?: boolean;
};

export function RoomAvatar({ roomId, src, alt, renderFallback, uniformIcons }: RoomAvatarProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <AvatarFallback
        style={{ backgroundColor: colorMXID(roomId ?? ''), color: color.Surface.Container }}
        className={css.RoomAvatar}
      >
        {renderFallback()}
      </AvatarFallback>
    );
  }

  return (
    <AvatarImage
      src={src}
      alt={alt}
      uniformIcons={uniformIcons}
      onError={() => setError(true)}
    />
  );
}

export const RoomIcon = forwardRef<
  SVGSVGElement,
  Omit<ComponentProps<typeof Icon>, 'src'> & {
    joinRule?: JoinRule;
    roomType?: string;
  }
>(({ joinRule, roomType, ...props }, ref) => (
  <Icon src={getRoomIconSrc(Icons, roomType, joinRule)} {...props} ref={ref} />
));
