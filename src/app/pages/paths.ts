export const ROOT_PATH = '/';

export type LoginPathSearchParams = {
  username?: string;
  email?: string;
  loginToken?: string;
};
export const LOGIN_PATH = '/login/:server?/';

export type RegisterPathSearchParams = {
  username?: string;
  email?: string;
  token?: string;
};
export const REGISTER_PATH = '/register/:server?/';

export const RESET_PASSWORD_PATH = '/reset-password/:server?/';
