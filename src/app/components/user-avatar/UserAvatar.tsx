import { AvatarFallback, AvatarImage } from 'folds';
import React, { ReactEventHandler, ReactNode, useState } from 'react';
import * as css from './UserAvatar.css';

type UserAvatarProps = {
  src?: string;
  alt?: string;
  renderFallback: () => ReactNode;
};
export function UserAvatar({ src, alt, renderFallback }: UserAvatarProps) {
  const [error, setError] = useState(false);

  const handleLoad: ReactEventHandler<HTMLImageElement> = (evt) => {
    evt.currentTarget.setAttribute('data-image-loaded', 'true');
  };

  if (!src || error) {
    return <AvatarFallback className={css.UserAvatar}>{renderFallback()}</AvatarFallback>;
  }

  return (
    <AvatarImage
      className={css.UserAvatar}
      src={src}
      alt={alt}
      onError={() => setError(true)}
      onLoad={handleLoad}
    />
  );
}
