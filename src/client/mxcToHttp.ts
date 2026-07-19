import {
  getDownload,
  getThumbnail,
  GetThumbnailSearchParams,
} from 'neurone/lib/api/matrix/client/v1/media';
import { getDownload as getDownloadUnauthenticated } from 'neurone/lib/api/matrix/media/v3/download';
import { getThumbnail as getThumbnailUnauthenticated } from 'neurone/lib/api/matrix/media/v3/thumbnail';

export const mxcToHttp = (baseUrl: string, mxc: string, authenticated = true) => {
  // TODO: validate mxc:
  const [serverName, mediaId] = mxc.slice(6).split('/');

  const api = {
    url: (): string => {
      const endpoint = authenticated
        ? getDownload({ pathParams: { serverName, mediaId } })
        : getDownloadUnauthenticated({ pathParams: { serverName, mediaId } });

      const url = new URL(endpoint.path, baseUrl);
      return url.href;
    },
    thumbnail: (params: GetThumbnailSearchParams): string => {
      const endpoint = authenticated
        ? getThumbnail({
            pathParams: { serverName, mediaId },
            searchParams: params,
          })
        : getThumbnailUnauthenticated({
            pathParams: { serverName, mediaId },
            searchParams: params,
          });

      const url = new URL(endpoint.path, baseUrl);
      return url.href;
    },
  };

  return api;
};
