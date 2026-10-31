import { AvatarFallback, AvatarImage, Text, color } from 'folds';
import React, { ReactEventHandler, ReactNode, useEffect, useState } from 'react';
import classNames from 'classnames';
import * as css from './UserAvatar.css';
import colorMXID from '../../../util/colorMXID';
import { nameInitials } from '../../utils/common';

type UserAvatarProps = {
  className?: string;
  userId: string;
  src?: string;
  /** Tried when `src` fails to load (e.g. a bridged chat's picture for its contact). */
  fallbackSrc?: string;
  alt?: string;
  renderFallback: () => ReactNode;
};
export function UserAvatar({
  className,
  userId,
  src,
  fallbackSrc,
  alt,
  renderFallback,
}: UserAvatarProps) {
  // 0 = showing src, 1 = src failed → showing fallbackSrc, 2 = both failed.
  const [failed, setFailed] = useState(0);
  // A new picture (e.g. the contact changed theirs) deserves a fresh try.
  useEffect(() => setFailed(0), [src, fallbackSrc]);

  const candidates = [src, fallbackSrc].filter((s): s is string => !!s && s.length > 0);
  const current = candidates[failed];

  const handleLoad: ReactEventHandler<HTMLImageElement> = (evt) => {
    evt.currentTarget.setAttribute('data-image-loaded', 'true');
  };

  if (!current) {
    return (
      <AvatarFallback
        style={{ backgroundColor: colorMXID(userId), color: color.Surface.Container }}
        className={classNames(css.UserAvatar, className)}
      >
        {renderFallback()}
      </AvatarFallback>
    );
  }

  return (
    <AvatarImage
      className={classNames(css.UserAvatar, className)}
      key={current}
      src={current}
      alt={alt}
      onError={() => setFailed((n) => n + 1)}
      onLoad={handleLoad}
      draggable={false}
    />
  );
}

type UserInitialsProps = {
  name?: string | null;
  size?: 'H4' | 'H5' | 'H6' | 'T200' | 'T300' | 'T400';
};
/** The coloured-initial placeholder used when a person has no picture. */
export function UserInitials({ name, size = 'H6' }: UserInitialsProps) {
  return (
    <Text as="span" size={size}>
      {nameInitials(name)}
    </Text>
  );
}
