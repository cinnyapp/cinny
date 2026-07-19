import {
  getDownload,
  getThumbnail,
  GetThumbnailSearchParams,
} from 'neurone/lib/api/matrix/client/v1/media';
import { getDownload as getDownloadUnauthenticated } from 'neurone/lib/api/matrix/media/v3/download';
import { getThumbnail as getThumbnailUnauthenticated } from 'neurone/lib/api/matrix/media/v3/thumbnail';

type ParsedMxcUrl = {
  serverName: string;
  mediaId: string;
};

export function parseMxcUrl(value: string): ParsedMxcUrl | null {
  try {
    const url = new URL(value);

    if (url.protocol !== 'mxc:' || !url.host || url.pathname.length <= 1) {
      return null;
    }

    return {
      serverName: url.host, // includes port if present
      mediaId: url.pathname.slice(1),
    };
  } catch {
    return null;
  }
}

export const mxcToHttp = (baseUrl: string, mxc: string, authenticated = true) => {
  const { serverName = '', mediaId = '' } = parseMxcUrl(mxc) ?? {};

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
