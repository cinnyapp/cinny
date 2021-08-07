import {
  err, ok, Result,
} from '../../types/result';

// This regex validates historical usernames, which don't satisy today's username requirements.
// See https://matrix.org/docs/spec/appendices#id13 for more info.
const historicalLocalpartRegex = /^[!-9|;-~]+$/;
const signupLocalpartRegex = /^[a-z0-9_\-.=/]+$/;

const STRINGS = {
  validation_errors: {
    badLoginUsername: 'Username must contain only a-z, 0-9 and . _ + - /',
    badSignupUsername: 'Username must contain only a-z, 0-9 and . _ + - /',
    userIdTooLong:
      'Your user ID, including the hostname, can\'t be more than 255 characters long.',
  },
};

/**
 * An `Ok` will contain true. An `Err` will contain a user-facing error
 * explanation.
 */
type UserIdValid = Result<boolean, string>;

/**
 * Returns a Result of whether the user ID is valid for login or not.
 *
 * This cannot be swapped with `signup` as login has more relaxed user ID
 * requirements.
 *
 * @param localpart The raw user input for their localpart
 * @returns
 */
export const isUserIdValidForLogin = (
  localpart: string,
): UserIdValid => {
  if (!historicalLocalpartRegex.test(localpart)) {
    return err(STRINGS.validation_errors.badLoginUsername);
  }

  return ok(true);
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
  homeserver: string,
): UserIdValid => {
  if (!signupLocalpartRegex.test(localpart)) {
    return err(STRINGS.validation_errors.badLoginUsername);
  }
  if (`@${localpart}:${homeserver}`.length > 255) return err(STRINGS.validation_errors.userIdTooLong);

  return ok(true);
};
