import { Err, Ok, Result } from "../../types/result";

const historical_localpart_regex = /^[!-9|;-~]+$/;
const signup_localpart_regex = /^[a-z0-9_\-.=/]+$/;

const STRINGS = {
  validation_errors: {
    bad_login_username: "Username must contain only a-z, 0-9 and . _ + - /",
    bad_signup_username: "Username must contain only a-z, 0-9 and . _ + - /",
    user_id_too_long:
      "Your user ID, including the hostname, can't be more than 255 characters long.",
  },
};

/**
 * An `Err` will contain a user-facing error explanation. An `Ok` will contain
 * true.
 */
type UserIdValid = Result<string, boolean>;

/**
 * Returns a Result of whether the user ID is valid for login or not.
 *
 * This cannot be swapped with `signup` as login has more relaxed user ID
 * requirements.
 *
 * @param localpart The raw user input for their localpart
 * @param homeserver The raw user input for their homeserver.
 * @returns
 */
export const isUserIdValidForLogin = (
  localpart: string,
  homeserver: string
): UserIdValid => {
  if (!historical_localpart_regex.test(localpart))
    return Err(STRINGS.validation_errors.bad_login_username);

  return Ok(true);
};

/**
 * Returns a Result of whether the user ID is valid for signup or not.
 *
 * @param localpart The raw user input for their localpart
 * @param homeserver The raw user input for their homeserver
 * @returns
 */
export const isUserIdValidForSignup = (
  localpart: string,
  homeserver: string
): UserIdValid => {
  if (!signup_localpart_regex.test(localpart))
    return Err(STRINGS.validation_errors.bad_login_username);
  if (`@${localpart}:${homeserver}`.length > 255)
    return Err(STRINGS.validation_errors.user_id_too_long);

  return Ok(true);
};
