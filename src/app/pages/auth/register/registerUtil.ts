import {
  postRegister,
  PostRegisterBody,
  PostRegisterOK,
} from 'neurone/lib/api/matrix/client/v3/register';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginPathSearchParams } from '../../paths';
import { ErrorCode } from '../../../cs-errorcode';
import {
  deleteAfterLoginRedirectPath,
  getAfterLoginRedirectPath,
} from '../../afterLoginRedirectPath';
import { getHomePath, getLoginPath, withSearchParam } from '../../pathUtils';
import { getMxIdLocalPart, getMxIdServer } from '../../../utils/matrix';
import { setFallbackSession } from '../../../state/sessions';
import { AuthResponse } from '../../../utils/matrix-uia';
import { getJSONRequest } from '../../../../client/request';

export enum RegisterError {
  UserTaken = 'UserTaken',
  UserInvalid = 'UserInvalid',
  UserExclusive = 'UserExclusive',
  PasswordWeak = 'PasswordWeak',
  PasswordShort = 'PasswordShort',
  InvalidRequest = 'InvalidRequest',
  Forbidden = 'Forbidden',
  RateLimited = 'RateLimited',
  Unknown = 'Unknown',
}

export type CustomRegisterResponse = {
  baseUrl: string;
  response: PostRegisterOK;
};

export type RegisterErrorData = {
  error: RegisterError;
  message?: string;
};

export type RegisterResult =
  | [AuthResponse, undefined, undefined]
  | [undefined, RegisterErrorData, undefined]
  | [undefined, undefined, CustomRegisterResponse];

export const register = async (
  baseUrl: string,
  requestData: PostRegisterBody
): Promise<RegisterResult> => {
  const requestJSON = getJSONRequest(baseUrl);
  const response = await requestJSON(postRegister({ body: requestData }));
  const [registerError, registerResult] = await parseMatrixResp<PostRegisterOK>(response);

  if (registerError) {
    if (registerError.status === 401) {
      const authData = registerError.data as AuthResponse;
      return [authData, undefined, undefined];
    }

    if (registerError.data.errcode === ErrorCode.M_USER_IN_USE) {
      return [
        undefined,
        { error: RegisterError.UserTaken, message: registerError.data.error },
        undefined,
      ];
    }
    if (registerError.data.errcode === ErrorCode.M_INVALID_USERNAME) {
      return [
        undefined,
        { error: RegisterError.UserInvalid, message: registerError.data.error },
        undefined,
      ];
    }
    if (registerError.data.errcode === ErrorCode.M_EXCLUSIVE) {
      return [
        undefined,
        { error: RegisterError.UserExclusive, message: registerError.data.error },
        undefined,
      ];
    }
    if (registerError.data.errcode === ErrorCode.M_WEAK_PASSWORD) {
      return [
        undefined,
        { error: RegisterError.PasswordWeak, message: registerError.data.error },
        undefined,
      ];
    }
    if (registerError.data.errcode === ErrorCode.M_PASSWORD_TOO_SHORT) {
      return [
        undefined,
        { error: RegisterError.PasswordShort, message: registerError.data.error },
        undefined,
      ];
    }

    if (registerError.status === 429) {
      return [
        undefined,
        { error: RegisterError.RateLimited, message: registerError.data.error },
        undefined,
      ];
    }

    if (registerError.status === 400) {
      return [
        undefined,
        { error: RegisterError.InvalidRequest, message: registerError.data.error },
        undefined,
      ];
    }

    if (registerError.status === 403) {
      return [
        undefined,
        { error: RegisterError.Forbidden, message: registerError.data.error },
        undefined,
      ];
    }

    return [
      undefined,
      { error: RegisterError.Unknown, message: registerError.data.error },
      undefined,
    ];
  }

  return [
    undefined,
    undefined,
    {
      baseUrl,
      response: registerResult,
    },
  ];
};

export const useRegisterComplete = (data?: CustomRegisterResponse) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (data) {
      const { response, baseUrl } = data;

      const userId = response.user_id;
      const accessToken = response.access_token;
      const deviceId = response.device_id;

      if (accessToken && deviceId) {
        setFallbackSession(accessToken, deviceId, userId, baseUrl);
        const afterLoginRedirectPath = getAfterLoginRedirectPath();
        deleteAfterLoginRedirectPath();
        navigate(afterLoginRedirectPath ?? getHomePath(), { replace: true });
      } else {
        const username = getMxIdLocalPart(userId);
        const userServer = getMxIdServer(userId);
        navigate(
          withSearchParam<LoginPathSearchParams>(getLoginPath(userServer), {
            username,
          }),
          { replace: true }
        );
      }
    }
  }, [data, navigate]);
};
