import { AvatarFallback, AvatarImage, Icon, Icons, color } from 'folds';
import React, {
  ComponentProps,
  ReactEventHandler,
  ReactNode,
  forwardRef,
  useCallback,
  useState,
} from 'react';
import classNames from 'classnames';
import * as css from './RoomAvatar.css';
import { getRoomIconSrc } from '../../utils/room';
import colorMXID from '../../../util/colorMXID';
import { JoinRule } from '../../../types/matrix/room';
import { useDocumentVisibilityChange } from '../../hooks/useDocumentVisibilityChange';
import { useDocumentFocusChange } from '../../hooks/useDocumentFocusChange';

type RoomAvatarErrorProps = {
  roomId: string;
  setError: (error: boolean) => void;
  children: ReactNode;
};
function RoomAvatarError({ roomId, setError, children }: RoomAvatarErrorProps) {
  const handleVisibilityChange = useCallback(
    (visible: boolean) => {
      if (visible) setError(false);
    },
    [setError]
  );

  useDocumentVisibilityChange(handleVisibilityChange);
  useDocumentFocusChange(handleVisibilityChange);

  return (
    <AvatarFallback
      style={{ backgroundColor: colorMXID(roomId ?? ''), color: color.Surface.Container }}
      className={css.RoomAvatar}
    >
      {children}
    </AvatarFallback>
  );
}

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

  if (!src) {
    return (
      <AvatarFallback
        style={{ backgroundColor: colorMXID(roomId ?? ''), color: color.Surface.Container }}
        className={css.RoomAvatar}
      >
        {renderFallback()}
      </AvatarFallback>
    );
  }

  if (error) {
    return (
      <RoomAvatarError roomId={roomId} setError={setError}>
        {renderFallback()}
      </RoomAvatarError>
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
    roomType?: string;
  }
>(({ joinRule, roomType, ...props }, ref) => (
  <Icon src={getRoomIconSrc(Icons, roomType, joinRule)} {...props} ref={ref} />
));
