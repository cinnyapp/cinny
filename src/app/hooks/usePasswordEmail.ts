/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useCallback, useMemo, useRef } from 'react';
import {
  postPasswordEmailRequestToken,
  PostPasswordEmailRequestTokenOK,
} from 'neurone/lib/api/matrix/client/v3/account';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { AsyncState, useAsyncCallback } from './useAsyncCallback';
import { RequestEmailTokenCallback, RequestEmailTokenResult } from './types';
import { getJSONRequest } from '../../client/request';

export const usePasswordEmail = (
  baseUrl: string
): [AsyncState<RequestEmailTokenResult, Error>, RequestEmailTokenCallback] => {
  const sendAttemptRef = useRef(1);
  const requestJSON = useMemo(() => getJSONRequest(baseUrl), [baseUrl]);

  const passwordEmailCallback: RequestEmailTokenCallback = useCallback(
    async (email, clientSecret, nextLink) => {
      const sendAttempt = sendAttemptRef.current;
      sendAttemptRef.current += 1;

      const response = await requestJSON(
        postPasswordEmailRequestToken({
          body: {
            email,
            client_secret: clientSecret,
            send_attempt: sendAttempt,
            next_link: nextLink,
          },
        })
      );

      const [error, result] = await parseMatrixResp<PostPasswordEmailRequestTokenOK>(response);

      if (error) return [error, undefined];

      return [
        undefined,
        {
          email,
          clientSecret,
          result,
        },
      ];
    },
    [requestJSON]
  );

  const [passwordEmailState, passwordEmail] = useAsyncCallback<
    RequestEmailTokenResult,
    Error,
    Parameters<RequestEmailTokenCallback>
  >(passwordEmailCallback);

  return [passwordEmailState, passwordEmail];
};
