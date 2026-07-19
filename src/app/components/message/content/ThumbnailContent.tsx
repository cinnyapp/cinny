import React, { useCallback, useEffect } from 'react';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { decryptFile, downloadEncryptedMedia } from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { FALLBACK_MIMETYPE } from '../../../utils/mimeTypes';
import { rEncryptedFile, rInfo, rThumbnailInfo } from '../../../../client/reader';
import { Image } from '../../media';
import { useClient } from '../../../hooks/useClient';
import { mxcToHttp } from '../../../../client/mxcToHttp';

export type ThumbnailContentProps = {
  info: object;
};
export function ThumbnailContent({ info }: ThumbnailContentProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();

  const [thumbSrcState, loadThumbSrc] = useAsyncCallback(
    useCallback(async () => {
      const thumbInfo = rInfo.thumbnailInfo(info);
      const encInfo = rInfo.thumbnailFile(info);
      const thumbMxcUrl = rEncryptedFile.url(encInfo) ?? rInfo.thumbnailUrl(info);
      const mimeType = rThumbnailInfo.mimetype(thumbInfo);

      if (typeof thumbMxcUrl !== 'string' || typeof mimeType !== 'string') {
        throw new Error('Failed to load thumbnail');
      }

      const mediaUrl =
        mxcToHttp(ct.session.baseUrl, thumbMxcUrl, useAuthentication).url() ?? thumbMxcUrl;
      if (encInfo) {
        const fileContent = await downloadEncryptedMedia(mediaUrl, (encBuf) =>
          decryptFile(encBuf, mimeType ?? FALLBACK_MIMETYPE, encInfo as EncryptedAttachmentInfo)
        );
        return URL.createObjectURL(fileContent);
      }

      return mediaUrl;
    }, [ct, info, useAuthentication])
  );

  useEffect(() => {
    loadThumbSrc();
  }, [loadThumbSrc]);

  return thumbSrcState.status === AsyncStatus.Success ? (
    <Image alt="Thumbnail" title="Thumbnail" src={thumbSrcState.data} loading="lazy" />
  ) : null;
}
