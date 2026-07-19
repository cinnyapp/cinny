// https://github.com/matrix-org/matrix-js-sdk/blob/c7a75c882479fc54f24eadce963a0c5c0d3c4788/src/randomstring.ts

/**
 * String representing the lowercase latin alphabet for use in {@link secureRandomStringFrom}
 * (can be combined with other such exports or other characters by appending strings)
 */
export const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';

/**
 * String representing the uppercase latin alphabet for use in secureRandomStringFrom
 * (can be combined with other such exports or other characters by appending strings)
 */
export const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * String representing the arabic numerals for use in secureRandomStringFrom
 * (can be combined with other such exports or other characters by appending strings)
 */
export const DIGITS = '0123456789';

/**
 * Generate a cryptographically secure random string using characters given.
 *
 * @param len - The length of the string to generate (must be positive and less than 32768).
 * @param chars - The characters to use in the random string (between 2 and 256 characters long).
 * @returns Random string of characters of length `len`.
 */
export function secureRandomStringFrom(len: number, chars: string): string {
  // This is intended for latin strings so 256 possibilities should be more than enough and
  // means we can use random bytes, minimising the amount of entropy we need to ask for.
  if (chars.length < 2 || chars.length > 256) {
    throw new Error('Character set must be between 2 and 256 characters long');
  }

  if (len < 1 || len > 32768) {
    throw new Error('Requested random string length must be between 1 and 32768');
  }

  // We'll generate random unsigned bytes, so get the largest number less than 256 that is a multiple
  // of the length of the character set: We'll need to discard any random values that are larger than
  // this as we can't possibly map them onto the character set while keeping each character equally
  // likely to be chosen (minus 1 to convert to indices in a string). (Essentially, we're using a d8
  // to choose between 7 possibilities and re-rolling on an 8, keeping all 7 outcomes equally likely.)
  // Our random values must be strictly less than this
  const randomValueCutoff = 256 - (256 % chars.length);

  // Grab 30% more entropy than we need. This should be enough that we can discard the values that are
  // too high without having to go back and grab more unless we're super unlucky.
  const entropyBuffer = new Uint8Array(Math.floor(len * 1.3));
  // Mark all of this buffer as used to start with (we haven't populated it with entropy yet) so it will
  // be filled on the first iteration.
  let entropyBufferPos = entropyBuffer.length;

  const result = [];
  while (result.length < len) {
    if (entropyBufferPos === entropyBuffer.length) {
      globalThis.crypto.getRandomValues(entropyBuffer);
      entropyBufferPos = 0;
    }

    const randomByte = entropyBuffer[entropyBufferPos];
    entropyBufferPos += 1;

    if (randomByte < randomValueCutoff) {
      result.push(chars[randomByte % chars.length]);
    }
  }

  return result.join('');
}

/**
 * Generates a random string of uppercase and lowercase letters plus digits using a
 * cryptographically secure random number generator.
 * @param len The length of the string to generate
 * @returns Random string of uppercase and lowercase letters plus digits of length `len`
 */
export function secureRandomString(len: number): string {
  return secureRandomStringFrom(len, UPPERCASE + LOWERCASE + DIGITS);
}

export function generateClientSecret(): string {
  return secureRandomString(32);
}
