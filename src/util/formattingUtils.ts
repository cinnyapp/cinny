/**
 * format a key into groups of 4 characters, for easier visual inspection
 *
 * @param {string} key key to format
 *
 * @return {string}
 */
// eslint-disable-next-line import/prefer-default-export
export const formatCryptoKey = (key: string): string => key.match(/.{1,4}/g).join(' ');
