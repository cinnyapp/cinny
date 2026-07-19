import { AvatarFallback, AvatarImage, Icon, Icons, color } from 'folds';
import React, { ComponentProps, ReactEventHandler, ReactNode, forwardRef, useState } from 'react';
import classNames from 'classnames';
import * as css from './RoomAvatar.css';
import { joinRuleToIconSrc } from '../../utils/room';
import colorMXID from '../../../util/colorMXID';
import { JoinRule } from '../../../types/matrix/room';

type RoomAvatarProps = {
  roomId: string;
  src?: string;
  alt?: string;
  renderFallback: () => ReactNode;
};
export function RoomAvatar({ roomId, src, alt, renderFallback }: RoomAvatarProps) {
  const [error, setError] = useState(false);

  const handleLoad: ReactEventHandler<HTMLImageElement> = (evt) => {
    evt.currentTarget.setAttribute('data-image-loaded', 'true');
  };

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
      className={classNames(css.RoomAvatar, css.RoomAvatarImg)}
      src={src}
      alt={alt}
      onError={() => setError(true)}
      onLoad={handleLoad}
      draggable={false}
    />
  );
}

export const RoomIcon = forwardRef<
  SVGSVGElement,
  Omit<ComponentProps<typeof Icon>, 'src'> & {
    joinRule?: JoinRule;
    space?: boolean;
  }
>(({ joinRule, space, ...props }, ref) => (
  <Icon
    src={
      joinRuleToIconSrc(Icons, joinRule ?? 'invite', space || false) ??
      (space ? Icons.Space : Icons.Hash)
    }
    {...props}
    ref={ref}
  />
));
