import { MatrixEndpointStruct } from 'neurone/lib/api/MatrixEndpoint';
import {
  makeRequest,
  MatrixErrorData,
  MatrixRequest,
  MatrixResponseResult,
} from 'neurone/lib/matrix-request';

export function getJSONRequest(baseUrl: string): MatrixRequest {
  const request = makeRequest(fetch, baseUrl, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  return request;
}

export function getAuthJSONRequest(baseUrl: string, accessToken: string): MatrixRequest {
  const request = makeRequest(fetch, baseUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  return request;
}

export type UploadProgress = {
  loaded: number;
  total: number;
};

export type UploadProgressCallback = (progress: UploadProgress) => void;

type MediaRequest<D extends object, ED = MatrixErrorData> = (
  matrixEndpointStruct: MatrixEndpointStruct,
  abortSignal?: AbortSignal
) => Promise<MatrixResponseResult<D, ED>>;

export function getAuthUploadRequest<D extends object, ED = MatrixErrorData>(
  baseUrl: string,
  accessToken: string,
  onProgress?: UploadProgressCallback
): MediaRequest<D, ED> {
  const request: MediaRequest<D, ED> = (endpoint, signal) =>
    new Promise((resolve, reject) => {
      const { path, body } = endpoint;
      const xhr = new XMLHttpRequest();

      if (body instanceof Blob === false && body instanceof FormData === false) {
        reject(
          TypeError(`Invalid body type. Requires Blob or FormData but received ${typeof body}`)
        );
        return;
      }

      let url: URL;

      try {
        url = new URL(path, baseUrl);
        xhr.open(endpoint.method, url);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      } catch (e) {
        reject(e);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress?.({
            loaded: event.loaded,
            total: event.total,
          });
        }
      };

      xhr.onload = () => {
        const contentType = xhr.getResponseHeader('Content-Type');
        if (contentType !== 'application/json') {
          reject(
            new TypeError(`Expected JSON response but received "${contentType || 'unknown'}"`)
          );
          return;
        }

        const jsonResponse = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve([undefined, jsonResponse as D]);
          return;
        }
        resolve([
          {
            status: xhr.status,
            url: url.href,
            data: jsonResponse as ED,
          },
          undefined,
        ]);
      };

      xhr.onerror = () => {
        reject(new Error('Network Error'));
      };

      xhr.onabort = () => {
        reject(new DOMException('The request was aborted!', 'AbortError'));
      };

      xhr.ontimeout = () => {
        reject(new DOMException(`Request timed out after ${xhr.timeout}ms`, 'TimeoutError'));
      };

      xhr.send(body);

      signal?.addEventListener('abort', () => xhr.abort());
    });

  return request;
}
