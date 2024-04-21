import { JoinRule } from 'matrix-js-sdk';
import { AvatarFallback, AvatarImage, Icon, Icons } from 'folds';
import React, { ComponentProps, ReactEventHandler, ReactNode, forwardRef, useState } from 'react';
import * as css from './RoomAvatar.css';
import { joinRuleToIconSrc } from '../../utils/room';

type RoomAvatarProps = {
  src?: string;
  alt?: string;
  renderInitials: () => ReactNode;
};
export function RoomAvatar({ src, alt, renderInitials }: RoomAvatarProps) {
  const [error, setError] = useState(false);

  const handleLoad: ReactEventHandler<HTMLImageElement> = (evt) => {
    evt.currentTarget.setAttribute('data-image-loaded', 'true');
  };

  if (!src || error) {
    return <AvatarFallback className={css.RoomAvatar}>{renderInitials()}</AvatarFallback>;
  }

  return (
    <AvatarImage
      className={css.RoomAvatar}
      src={src}
      alt={alt}
      onError={() => setError(true)}
      onLoad={handleLoad}
    />
  );
}

export const RoomIcon = forwardRef<
  SVGSVGElement,
  Omit<ComponentProps<typeof Icon>, 'src'> & {
    joinRule: JoinRule;
    space?: boolean;
  }
>(({ joinRule, space, ...props }, ref) => (
  <Icon
    src={joinRuleToIconSrc(Icons, joinRule, space || false) ?? Icons.Hash}
    {...props}
    ref={ref}
  />
));
