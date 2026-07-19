import { useCallback, useRef, useMemo } from 'react';
import {
  PostEmailRegisterTokenOK,
  postEmailRequestToken,
} from 'neurone/lib/api/matrix/client/v3/register';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { AsyncState, useAsyncCallback } from './useAsyncCallback';
import { RequestEmailTokenCallback, RequestEmailTokenResult } from './types';
import { getJSONRequest } from '../../client/request';

export const useRegisterEmail = (
  baseUrl: string
): [AsyncState<RequestEmailTokenResult, Error>, RequestEmailTokenCallback] => {
  const requestJSON = useMemo(() => getJSONRequest(baseUrl), [baseUrl]);
  const sendAttemptRef = useRef(1);

  const registerEmailCallback: RequestEmailTokenCallback = useCallback(
    async (email, clientSecret, nextLink) => {
      const sendAttempt = sendAttemptRef.current;
      sendAttemptRef.current += 1;

      const response = await requestJSON(
        postEmailRequestToken({
          body: {
            email,
            client_secret: clientSecret,
            next_link: nextLink,
            send_attempt: sendAttempt,
          },
        })
      );

      const [error, result] = await parseMatrixResp<PostEmailRegisterTokenOK>(response);

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

  const [registerEmailState, registerEmail] = useAsyncCallback<
    RequestEmailTokenResult,
    Error,
    Parameters<RequestEmailTokenCallback>
  >(registerEmailCallback);

  return [registerEmailState, registerEmail];
};
