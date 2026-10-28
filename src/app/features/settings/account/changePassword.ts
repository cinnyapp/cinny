import { AuthDict, AuthType, MatrixClient, MatrixError } from 'matrix-js-sdk';

// Proves the user knows their current password, for the interactive auth on /account/password.
export const currentPasswordAuth = (userId: string, password: string): AuthDict => ({
  type: AuthType.Password,
  identifier: { type: 'm.id.user', user: userId },
  password,
});

export const changePasswordErrorMessage = (error: unknown): string => {
  if (error instanceof MatrixError) {
    if (error.httpStatus === 401 || error.errcode === 'M_FORBIDDEN') {
      return 'Current password is incorrect.';
    }
    if (error.errcode === 'M_WEAK_PASSWORD') {
      return error.data?.error ?? 'New password is too weak.';
    }
    return error.data?.error ?? error.message;
  }
  return error instanceof Error ? error.message : "Couldn't change the password.";
};

// Keeps the other sessions signed in, so their encryption keys stay usable.
export const changePassword = (
  mx: MatrixClient,
  currentPassword: string,
  newPassword: string
): Promise<unknown> =>
  mx.setPassword(currentPasswordAuth(mx.getSafeUserId(), currentPassword), newPassword, false);
