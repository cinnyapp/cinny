import { generatePath } from 'react-router-dom';
import { LOGIN_PATH, REGISTER_PATH, RESET_PASSWORD_PATH, ROOT_PATH } from './paths';

export const withSearchParam = <T extends Record<string, string>>(
  path: string,
  searchParam: T
): string => {
  const params = new URLSearchParams(searchParam);

  return `${path}?${params}`;
};

export const getRootPath = (): string => ROOT_PATH;

export const getLoginPath = (server?: string): string => {
  const params = server ? { server: encodeURIComponent(server) } : undefined;
  return generatePath(LOGIN_PATH, params);
};

export const getRegisterPath = (server?: string): string => {
  const params = server ? { server: encodeURIComponent(server) } : undefined;
  return generatePath(REGISTER_PATH, params);
};

export const getResetPasswordPath = (server?: string): string => {
  const params = server ? { server: encodeURIComponent(server) } : undefined;
  return generatePath(RESET_PASSWORD_PATH, params);
};
