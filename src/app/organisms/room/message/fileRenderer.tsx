import React from 'react';
import { MatrixEvent } from 'matrix-js-sdk';
import { IFileContent } from '../../../../types/matrix/common';
import {
  Attachment,
  AttachmentBox,
  AttachmentContent,
  AttachmentHeader,
} from '../../../components/message';
import { FileHeader } from './FileHeader';
import { FileContent } from './FileContent';
import { FALLBACK_MIMETYPE } from '../../../utils/mimeTypes';

export const fileRenderer = (mEventId: string, mEvent: MatrixEvent) => {
  const content = mEvent.getContent<IFileContent>();

  const fileInfo = content?.info;
  const mxcUrl = content.file?.url ?? content.url;

  if (typeof mxcUrl !== 'string') {
    return null;
  }

  return (
    <Attachment>
      <AttachmentHeader>
        <FileHeader
          body={content.body ?? 'Unnamed File'}
          mimeType={fileInfo?.mimetype ?? FALLBACK_MIMETYPE}
        />
      </AttachmentHeader>
      <AttachmentBox>
        <AttachmentContent>
          <FileContent
            body={content.body ?? 'File'}
            info={fileInfo ?? {}}
            mimeType={fileInfo?.mimetype ?? FALLBACK_MIMETYPE}
            url={mxcUrl}
            encInfo={content.file}
          />
        </AttachmentContent>
      </AttachmentBox>
    </Attachment>
  );
};
