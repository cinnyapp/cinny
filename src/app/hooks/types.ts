import { IRequestTokenResponse } from 'matrix-js-sdk';

export type RequestEmailTokenResponse = {
  email: string;
  clientSecret: string;
  result: IRequestTokenResponse;
};
export type RequestEmailTokenCallback = (
  email: string,
  clientSecret: string,
  nextLink?: string
) => Promise<RequestEmailTokenResponse>;
