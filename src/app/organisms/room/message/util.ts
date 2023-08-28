import { IEncryptedFile } from '../../../../types/matrix/common';
import { decryptFile } from '../../../utils/matrix';

export const getFileSrcUrl = async (
  httpUrl: string,
  mimeType: string,
  encFile?: IEncryptedFile
): Promise<string> => {
  if (encFile) {
    if (typeof httpUrl !== 'string') throw new Error('Malformed event');
    const encRes = await fetch(httpUrl, { method: 'GET' });
    const encData = await encRes.arrayBuffer();
    const decryptedBlob = await decryptFile(encData, mimeType, encFile);
    return URL.createObjectURL(decryptedBlob);
  }
  return httpUrl;
};
