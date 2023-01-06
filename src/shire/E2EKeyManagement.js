import initMatrix from '../client/initMatrix';
import { encryptMegolmKeyFile } from '../util/cryptE2ERoomKeys';

async function getE2ERoomKeys() {
  try {
    const keys = await initMatrix.matrixClient.exportRoomKeys();
    // TODO ShireApp: change the password parameter with a proper secret key
    // for encryption or just export the keys
    const encKeys = await encryptMegolmKeyFile(JSON.stringify(keys), 'root');
    console.log('########## keys before encryption');
    console.log(keys);
    console.log(JSON.stringify(keys));

    console.log('########## keys after encryption');
    console.log(encKeys);
    console.log(encKeys.toString());
    return encKeys;
  } catch (e) {
    return 'error';
    // TODO fill in the catch function
  }
}

export default getE2ERoomKeys;
