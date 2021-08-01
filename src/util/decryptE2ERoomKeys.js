// https://github.com/matrix-org/matrix-react-sdk/blob/e78a1adb6f1af2ea425b0bae9034fb7344a4b2e8/src/utils/MegolmExportEncryption.js

const subtleCrypto = window.crypto.subtle || window.crypto.webkitSubtle;

/**
 * Make an Error object which has a friendlyText property which is already
 * translated and suitable for showing to the user.
 *
 * @param {string} msg   message for the exception
 * @param {string} friendlyText
 * @returns {Error}
 */
function friendlyError(msg, friendlyText) {
  const e = new Error(msg);
  e.friendlyText = friendlyText;
  return e;
}

function cryptoFailMsg() {
  return 'Your browser does not support the required cryptography extensions';
}
/**
 * Derive the AES and HMAC-SHA-256 keys for the file
 *
 * @param {Unit8Array} salt  salt for pbkdf
 * @param {Number} iterations number of pbkdf iterations
 * @param {String} password  password
 * @return {Promise<[CryptoKey, CryptoKey]>} promise for [aes key, hmac key]
 */
async function deriveKeys(salt, iterations, password) {
  const start = new Date();

  let key;
  try {
    key = await subtleCrypto.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits'],
    );
  } catch (e) {
    throw friendlyError(`subtleCrypto.importKey failed: ${e}`, cryptoFailMsg());
  }

  let keybits;
  try {
    keybits = await subtleCrypto.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-512',
      },
      key,
      512,
    );
  } catch (e) {
    throw friendlyError(`subtleCrypto.deriveBits failed: ${e}`, cryptoFailMsg());
  }

  const now = new Date();
  console.log(`E2e import/export: deriveKeys took ${(now - start)}ms`);

  const aesKey = keybits.slice(0, 32);
  const hmacKey = keybits.slice(32);

  const aesProm = subtleCrypto.importKey(
    'raw',
    aesKey,
    { name: 'AES-CTR' },
    false,
    ['encrypt', 'decrypt'],
  ).catch((e) => {
    throw friendlyError(`subtleCrypto.importKey failed for AES key: ${e}`, cryptoFailMsg());
  });

  const hmacProm = subtleCrypto.importKey(
    'raw',
    hmacKey,
    {
      name: 'HMAC',
      hash: { name: 'SHA-256' },
    },
    false,
    ['sign', 'verify'],
  ).catch((e) => {
    throw friendlyError(`subtleCrypto.importKey failed for HMAC key: ${e}`, cryptoFailMsg());
  });

  // eslint-disable-next-line no-return-await
  return await Promise.all([aesProm, hmacProm]);
}

/**
 * Decode a base64 string to a typed array of uint8.
 * @param {string} base64 The base64 to decode.
 * @return {Uint8Array} The decoded data.
 */
function decodeBase64(base64) {
  // window.atob returns a unicode string with codepoints in the range 0-255.
  const latin1String = window.atob(base64);
  // Encode the string as a Uint8Array
  const uint8Array = new Uint8Array(latin1String.length);
  for (let i = 0; i < latin1String.length; i += 1) {
    uint8Array[i] = latin1String.charCodeAt(i);
  }
  return uint8Array;
}

const HEADER_LINE = '-----BEGIN MEGOLM SESSION DATA-----';
const TRAILER_LINE = '-----END MEGOLM SESSION DATA-----';

/**
 * Unbase64 an ascii-armoured megolm key file
 *
 * Strips the header and trailer lines, and unbase64s the content
 *
 * @param {ArrayBuffer} data  input file
 * @return {Uint8Array} unbase64ed content
 */
function unpackMegolmKeyFile(data) {
  // parse the file as a great big String. This should be safe, because there
  // should be no non-ASCII characters, and it means that we can do string
  // comparisons to find the header and footer, and feed it into window.atob.
  const fileStr = new TextDecoder().decode(new Uint8Array(data));

  // look for the start line
  let lineStart = 0;
  while (1) {
    const lineEnd = fileStr.indexOf('\n', lineStart);
    if (lineEnd < 0) {
      throw new Error('Header line not found');
    }
    const line = fileStr.slice(lineStart, lineEnd).trim();

    // start the next line after the newline
    lineStart = lineEnd + 1;

    if (line === HEADER_LINE) {
      break;
    }
  }

  const dataStart = lineStart;

  // look for the end line
  while (1) {
    const lineEnd = fileStr.indexOf('\n', lineStart);
    const line = fileStr.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).trim();
    if (line === TRAILER_LINE) {
      break;
    }

    if (lineEnd < 0) {
      throw new Error('Trailer line not found');
    }

    // start the next line after the newline
    lineStart = lineEnd + 1;
  }

  const dataEnd = lineStart;
  return decodeBase64(fileStr.slice(dataStart, dataEnd));
}

export default async function decryptMegolmKeyFile(data, password) {
  const body = unpackMegolmKeyFile(data);

  // check we have a version byte
  if (body.length < 1) {
    throw friendlyError('Invalid file: too short', 'Not a valid keyfile');
  }

  const version = body[0];
  if (version !== 1) {
    throw friendlyError('Unsupported version', 'Not a valid keyfile');
  }

  const ciphertextLength = body.length - (1 + 16 + 16 + 4 + 32);
  if (ciphertextLength < 0) {
    throw friendlyError('Invalid file: too short', 'Not a valid keyfile');
  }

  const salt = body.subarray(1, 1 + 16);
  const iv = body.subarray(17, 17 + 16);
  const iterations = body[33] << 24 | body[34] << 16 | body[35] << 8 | body[36];
  const ciphertext = body.subarray(37, 37 + ciphertextLength);
  const hmac = body.subarray(-32);

  const [aesKey, hmacKey] = await deriveKeys(salt, iterations, password);
  const toVerify = body.subarray(0, -32);

  let isValid;
  try {
    isValid = await subtleCrypto.verify(
      { name: 'HMAC' },
      hmacKey,
      hmac,
      toVerify,
    );
  } catch (e) {
    throw friendlyError(`subtleCrypto.verify failed: ${e}`, cryptoFailMsg());
  }
  if (!isValid) {
    throw friendlyError('hmac mismatch', 'Authentication check failed: Incorrect password?');
  }

  let plaintext;
  try {
    plaintext = await subtleCrypto.decrypt(
      {
        name: 'AES-CTR',
        counter: iv,
        length: 64,
      },
      aesKey,
      ciphertext,
    );
  } catch (e) {
    throw friendlyError(`subtleCrypto.decrypt failed: ${e}`, cryptoFailMsg());
  }

  return new TextDecoder().decode(new Uint8Array(plaintext));
}
