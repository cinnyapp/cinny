import React from 'react';
import { as, toRem } from 'folds';
import { MatrixEvent } from 'matrix-js-sdk';
import {
  AttachmentBox,
  MessageBrokenContent,
  MessageDeletedContent,
} from '../../../components/message';
import { ImageContent } from './ImageContent';
import { scaleDimension } from '../../../utils/common';
import { IImageContent } from '../../../../types/matrix/common';

type StickerContentProps = {
  mEvent: MatrixEvent;
  autoPlay: boolean;
};
export const StickerContent = as<'div', StickerContentProps>(
  ({ mEvent, autoPlay, ...props }, ref) => {
    if (mEvent.isRedacted()) return <MessageDeletedContent />;
    const content = mEvent.getContent<IImageContent>();
    const imgInfo = content?.info;
    const mxcUrl = content.file?.url ?? content.url;
    if (typeof mxcUrl !== 'string') {
      return <MessageBrokenContent />;
    }
    const scaled = scaleDimension(imgInfo?.w || 152, imgInfo?.h || 152, 16, 16, 152, 152);

    return (
      <AttachmentBox
        style={{
          height: toRem(scaled.h),
          width: toRem(scaled.w),
        }}
        {...props}
        ref={ref}
      >
        <ImageContent
          autoPlay={autoPlay}
          body={content.body || 'Image'}
          info={imgInfo}
          mimeType={imgInfo?.mimetype}
          url={mxcUrl}
          encInfo={content.file}
          imageWidth={scaled.w}
          imageHeight={scaled.h}
        />
      </AttachmentBox>
    );
  }
);
