import { AvatarImage as FoldsAvatarImage } from 'folds';
import React, { ReactEventHandler, useState } from 'react';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import bgColorImg from '../../../util/bgColorImg';
import * as css from './RoomAvatar.css';

type AvatarImageProps = {
  src: string;
  alt?: string;
  uniformIcons?: boolean;
  onError: () => void;
};

export function AvatarImage({ src, alt, uniformIcons, onError }: AvatarImageProps) {
  const [uniformIconsSetting] = useSetting(settingsAtom, 'uniformIcons');
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);
  const normalizedBg = image ? bgColorImg(image) : undefined;
  const useUniformIcons = uniformIconsSetting && uniformIcons === true;

  const handleLoad: ReactEventHandler<HTMLImageElement> = (evt) => {
    evt.currentTarget.setAttribute('data-image-loaded', 'true');
    setImage(evt.currentTarget);
  };

  return (
    <FoldsAvatarImage
      // We sample avatar pixels in bgColorImg() via canvas getImageData().
      // Firefox blocks cross-origin canvas pixel reads to mitigate data exfiltration risk.
      // Matrix media is cross-origin by design, so we opt into CORS mode for this image.
      // https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image
      crossOrigin="anonymous"
      className={css.RoomAvatar}
      style={{ backgroundColor: useUniformIcons ? normalizedBg : undefined }}
      src={src}
      alt={alt}
      onError={() => {
        setImage(undefined);
        onError();
      }}
      onLoad={handleLoad}
      draggable={false}
    />
  );
}
