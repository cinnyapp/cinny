import { PostEmailRegisterTokenOK } from 'neurone/lib/api/matrix/client/v3/register';
import { MatrixError } from 'neurone/lib/matrix-request';

export type RequestEmailTokenResponse = {
  email: string;
  clientSecret: string;
  result: PostEmailRegisterTokenOK;
};
export type RequestEmailTokenResult =
  | [undefined, RequestEmailTokenResponse]
  | [MatrixError, undefined];

export type RequestEmailTokenCallback = (
  email: string,
  clientSecret: string,
  nextLink?: string
) => Promise<RequestEmailTokenResult>;
