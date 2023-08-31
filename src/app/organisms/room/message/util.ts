import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { decryptFile } from '../../../utils/matrix';

export const getFileSrcUrl = async (
  httpUrl: string,
  mimeType: string,
  encInfo?: EncryptedAttachmentInfo
): Promise<string> => {
  if (encInfo) {
    if (typeof httpUrl !== 'string') throw new Error('Malformed event');
    const encRes = await fetch(httpUrl, { method: 'GET' });
    const encData = await encRes.arrayBuffer();
    const decryptedBlob = await decryptFile(encData, mimeType, encInfo);
    return URL.createObjectURL(decryptedBlob);
  }
  return httpUrl;
};

export const getSrcFile = async (src: string): Promise<Blob> => {
  const res = await fetch(src, { method: 'GET' });
  const blob = await res.blob();
  return blob;
};
