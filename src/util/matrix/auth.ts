import { Err, Ok, Result } from "../../types/result";

const historical_localpart_regex = /^[!-9|;-~]+$/;
const signup_localpart_regex = /^[a-z0-9_\-.=/]+$/;

const STRINGS = {
  validation_errors: {
    bad_login_username: "Username must contain only a-z, 0-9 and . _ + - /",
    user_id_too_long:
      "Your user ID, including the hostname, can't be more than 255 characters long.",
  },
};

const BAD_LOCALPART_ERROR =
  "Username must contain only a-z, 0-9, ., _, =, -, and /.";

export const isLoginUserIdValid = (
  localpart: string,
  homeserver: string
): Result<string, boolean> => {
  if (!historical_localpart_regex.test(localpart)) {
    return Err(STRINGS.validation_errors.bad_login_username);
  }

  return Ok(true);
};

export const isSignupUserIdValid = (localpart: string, homeserver: string) => {
  if (!signup_localpart_regex.test(localpart)) {
    return Err(STRINGS.validation_errors.bad_login_username);
  }
  if (`@${localpart}:${homeserver}`.length > 255) {
    return Err(STRINGS.validation_errors.user_id_too_long);
  }
  return Ok(true);
};
