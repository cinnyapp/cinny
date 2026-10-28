import type { MatrixClient } from 'matrix-js-sdk/lib/client';
import { getMxIdLocalPart } from '../../utils/matrix';

export const friendDisplayName = (mx: MatrixClient, userId: string): string => {
  const name = mx.getUser(userId)?.displayName;
  if (name && name !== userId) return name;
  return getMxIdLocalPart(userId) ?? userId;
};

export const friendAvatarUrl = (
  mx: MatrixClient,
  userId: string,
  useAuthentication: boolean
): string | undefined => {
  const mxc = mx.getUser(userId)?.avatarUrl;
  if (!mxc) return undefined;
  return mx.mxcUrlToHttp(mxc, 96, 96, 'crop', undefined, false, useAuthentication) ?? undefined;
};
