import { ReactNode, useCallback, useEffect } from 'react';
import { IThumbnailContent } from '../../../../types/matrix/common';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { getFileSrcUrl } from './util';

export type ThumbnailContentProps = {
  info: IThumbnailContent;
  renderImage: (src: string) => ReactNode;
};
export function ThumbnailContent({ info, renderImage }: ThumbnailContentProps) {
  const mx = useMatrixClient();

  const [thumbSrcState, loadThumbSrc] = useAsyncCallback(
    useCallback(() => {
      const thumbInfo = info.thumbnail_info;
      const thumbMxcUrl = info.thumbnail_file?.url ?? info.thumbnail_url;
      if (typeof thumbMxcUrl !== 'string' || typeof thumbInfo?.mimetype !== 'string') {
        throw new Error('Failed to load thumbnail');
      }
      return getFileSrcUrl(
        mx.mxcUrlToHttp(thumbMxcUrl) ?? '',
        thumbInfo.mimetype,
        info.thumbnail_file
      );
    }, [mx, info])
  );

  useEffect(() => {
    loadThumbSrc();
  }, [loadThumbSrc]);

  return thumbSrcState.status === AsyncStatus.Success ? renderImage(thumbSrcState.data) : null;
}
