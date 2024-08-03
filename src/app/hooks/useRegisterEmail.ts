import { MatrixClient, MatrixError } from 'matrix-js-sdk';
import { useCallback, useRef } from 'react';
import { AsyncState, useAsyncCallback } from './useAsyncCallback';
import { RequestEmailTokenCallback, RequestEmailTokenResponse } from './types';

export const useRegisterEmail = (
  mx: MatrixClient
): [AsyncState<RequestEmailTokenResponse, MatrixError>, RequestEmailTokenCallback] => {
  const sendAttemptRef = useRef(1);

  const registerEmailCallback: RequestEmailTokenCallback = useCallback(
    async (email, clientSecret, nextLink) => {
      const sendAttempt = sendAttemptRef.current;
      sendAttemptRef.current += 1;
      const result = await mx.requestRegisterEmailToken(email, clientSecret, sendAttempt, nextLink);
      return {
        email,
        clientSecret,
        result,
      };
    },
    [mx]
  );

  const [registerEmailState, registerEmail] = useAsyncCallback<
    RequestEmailTokenResponse,
    MatrixError,
    Parameters<RequestEmailTokenCallback>
  >(registerEmailCallback);

  return [registerEmailState, registerEmail];
};
