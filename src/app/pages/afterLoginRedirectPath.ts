/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

const AFTER_LOGIN_REDIRECT_PATH_KEY = 'after_login_redirect_url';

export const setAfterLoginRedirectPath = (url: string): void => {
  localStorage.setItem(AFTER_LOGIN_REDIRECT_PATH_KEY, url);
};
export const getAfterLoginRedirectPath = (): string | undefined => {
  const url = localStorage.getItem(AFTER_LOGIN_REDIRECT_PATH_KEY);
  return url ?? undefined;
};
export const deleteAfterLoginRedirectPath = (): void => {
  localStorage.removeItem(AFTER_LOGIN_REDIRECT_PATH_KEY);
};
