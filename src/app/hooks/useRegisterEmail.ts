import { IRequestTokenResponse, MatrixClient, MatrixError } from 'matrix-js-sdk';
import { useCallback, useRef } from 'react';
import { AsyncState, useAsyncCallback } from './useAsyncCallback';

export type RegisteredEmailResponse = {
  email: string;
  result: IRequestTokenResponse;
};
export type RegisterEmailCallback = (
  email: string,
  clientSecret: string,
  nextLink?: string
) => Promise<RegisteredEmailResponse>;
export const useRegisterEmail = (
  mx: MatrixClient
): [AsyncState<RegisteredEmailResponse, MatrixError>, RegisterEmailCallback] => {
  const sendAttemptRef = useRef(1);

  const registerEmailCallback: RegisterEmailCallback = useCallback(
    async (email, clientSecret, nextLink) => {
      const sendAttempt = sendAttemptRef.current;
      sendAttemptRef.current += 1;
      const result = await mx.requestRegisterEmailToken(email, clientSecret, sendAttempt, nextLink);
      return {
        email,
        result,
      };
    },
    [mx]
  );

  const [registerEmailState, registerEmail] = useAsyncCallback<
    RegisteredEmailResponse,
    MatrixError,
    Parameters<RegisterEmailCallback>
  >(registerEmailCallback);

  return [registerEmailState, registerEmail];
};
