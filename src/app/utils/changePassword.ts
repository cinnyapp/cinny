import to from 'await-to-js';
import { AuthDict, IAuthData, MatrixClient, MatrixError } from 'matrix-js-sdk';

export type ChangePasswordResponse = Record<string, never>;
export type ChangePasswordResult = [IAuthData, undefined] | [undefined, ChangePasswordResponse];

/**
 * Change the user's password using the Matrix password change API
 * @param mx Matrix client instance
 * @param authDict Authentication dictionary for UIA (undefined for initial request)
 * @param newPassword The new password to set
 * @param logoutDevices Whether to logout other devices (defaults to true for security)
 * @returns Tuple with either auth data (for UIA continuation) or success response
 */
export const changePassword = async (
  mx: MatrixClient,
  authDict: AuthDict | undefined,
  newPassword: string,
  logoutDevices = true
): Promise<ChangePasswordResult> => {

  // For the initial request, pass undefined instead of null
  // This ensures the auth field is omitted from the request body
  const [err, res] = await to<ChangePasswordResponse, MatrixError>(
    mx.setPassword(authDict, newPassword, logoutDevices)
  );

  if (err) {
    console.log('Password change error:', err.httpStatus, err.data);
    // If we get a 401, it means we need to perform UIA
    if (err.httpStatus === 401) {
      const authData = err.data as IAuthData;
      return [authData, undefined];
    }
    // Any other error should be thrown
    throw err;
  }

  console.log('Password change successful:', res);
  // Success case - return empty response
  return [undefined, res];
};
