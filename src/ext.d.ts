/// <reference types="vite/client" />

declare module 'browser-encrypt-attachment' {
  export interface EncryptedAttachmentInfo {
    v: string;
    key: {
      alg: string;
      key_ops: string[];
      kty: string;
      k: string;
      ext: boolean;
    };
    iv: string;
    hashes: {
      [alg: string]: string;
    };
  }

  export interface EncryptedAttachment {
    data: ArrayBuffer;
    info: EncryptedAttachmentInfo;
  }

  export function encryptAttachment(dataBuffer: ArrayBuffer): Promise<EncryptedAttachment>;

  export function decryptAttachment(
    dataBuffer: ArrayBuffer,
    info: EncryptedAttachmentInfo
  ): Promise<ArrayBuffer>;
}

declare module '*.svg' {
  const content: string;
  export default content;
}
