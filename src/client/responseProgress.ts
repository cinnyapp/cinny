/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

export type ProgressCallback = (receivedBytes: number, totalBytes?: number) => void;

export const responseProgress = async (response: Response, onProgress: ProgressCallback) => {
  const contentLength = response.headers.get('Content-Length');
  if (contentLength === null) {
    console.warn('Content-Length not available. Cannot track progress accurately.');
  }
  const total = contentLength ? parseInt(contentLength, 10) : undefined;
  let loaded = 0;

  const { body } = response;
  if (!body) {
    console.warn('Request body not available. Cannot track progress accurately.');
    return;
  }
  const reader = body.getReader();

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    if (done) break;

    loaded += value.length;
    onProgress(loaded, total);
  }

  if (total === undefined) {
    onProgress(loaded, loaded);
  }
};

export function createFakeProgress() {
  let slowdownFactor: number | undefined;
  return (bytes: number) => {
    if (!slowdownFactor) {
      slowdownFactor = bytes;
      return 0;
    }
    return bytes / (bytes + slowdownFactor * 100);
  };
}
