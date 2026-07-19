import { MatrixError, parseMatrixResp } from 'neurone/lib/matrix-request';
import {
  postPassword,
  PostPasswordBody,
  PostPasswordOK,
} from 'neurone/lib/api/matrix/client/v3/account';
import { AuthResponse } from '../../../utils/matrix-uia';
import { getJSONRequest } from '../../../../client/request';

export type ResetPasswordResponse = Record<string, never>;
export type ResetPasswordResult =
  | [AuthResponse, undefined, undefined]
  | [undefined, MatrixError, undefined]
  | [undefined, undefined, ResetPasswordResponse];
export const resetPassword = async (
  baseUrl: string,
  requestData: PostPasswordBody
): Promise<ResetPasswordResult> => {
  const requestJSON = getJSONRequest(baseUrl);
  const response = await requestJSON(postPassword({ body: requestData }));
  const [passwordError, passwordResult] = await parseMatrixResp<PostPasswordOK>(response);

  if (passwordError) {
    if (passwordError.status === 401) {
      const authData = passwordError.data as AuthResponse;
      return [authData, undefined, undefined];
    }
    return [undefined, passwordError, undefined];
  }
  return [undefined, undefined, passwordResult];
};
