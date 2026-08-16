import React, { CSSProperties } from 'react';
import { Box, Chip, Icon, Icons, Text, toRem } from 'folds';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts } from 'linkifyjs';
import { JUMBO_EMOJI_REG, URL_REG } from '../../utils/regex';
import { trimReplyFromBody } from '../../utils/room';
import { MessageTextBody } from './layout';
import {
  AudioContent,
  FileContent,
  ImageContent,
  MessageBadEncryptedContent,
  MessageBrokenContent,
  MessageDeletedContent,
  MessageEditedContent,
  UnsupportedMessageEventType,
  MessageUnsupportedContent,
  VideoContent,
} from './content';
import { FALLBACK_MIMETYPE, getBlobSafeMimeType } from '../../utils/mimeTypes';
import { parseGeoUri, scaleYDimension } from '../../utils/common';
import { Attachment, AttachmentBox, AttachmentContent, AttachmentHeader } from './attachment';
import { FileHeader, FileDownloadButton } from './FileHeader';
import { RenderBody } from './RenderBody';
import { rContent, rEncryptedFile, rInfo } from '../../../client/reader';
import { UrlPreviewCard, UrlPreviewHolder } from '../url-preview';
import { testMatrixTo } from '../../plugins/matrix-to';

type TextProps = {
  size?: 'T400' | 'T300';
};

export function MBadEncrypted({ size }: TextProps) {
  return (
    <Text size={size}>
      <MessageBadEncryptedContent />
    </Text>
  );
}

type RedactedContentProps = TextProps & {
  reason?: string;
};

export function RedactedContent({ size, reason }: RedactedContentProps) {
  return (
    <Text size={size}>
      <MessageDeletedContent reason={reason} />
    </Text>
  );
}

export function UnsupportedContent({ size, eventType }: TextProps & { eventType?: string }) {
  return (
    <Text size={size}>
      {eventType ? (
        <UnsupportedMessageEventType eventType={eventType} />
      ) : (
        <MessageUnsupportedContent />
      )}
    </Text>
  );
}

export function BrokenContent({ size }: TextProps) {
  return (
    <Text size={size}>
      <MessageBrokenContent />
    </Text>
  );
}

type UrlPreviewProps = {
  body: string;
  ts: number;
};
function UrlPreview({ body, ts }: UrlPreviewProps) {
  const urlsMatch = body.match(URL_REG);
  const urls = urlsMatch ? [...new Set(urlsMatch)] : undefined;

  if (!urls) return null;

  const filteredUrls = urls.filter((url) => !testMatrixTo(url));
  if (filteredUrls.length === 0) return null;

  return (
    <UrlPreviewHolder>
      {filteredUrls.map((url) => (
        <UrlPreviewCard key={url} url={url} ts={ts} />
      ))}
    </UrlPreviewHolder>
  );
}

type MTextProps = {
  edited?: boolean;
  content: object;
  urlPreview?: boolean;
  ts: number;
  style?: CSSProperties;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};
export function MText({
  edited,
  content,
  urlPreview,
  ts,
  style,
  highlightRegex,
  linkifyOpts,
  htmlReactParserOptions,
}: MTextProps) {
  const body = rContent.body(content);
  const customBody = rContent.formattedBody(content);
  const trimmedBody = trimReplyFromBody(body ?? '');

  if (typeof body !== 'string') return <BrokenContent />;

  return (
    <>
      <MessageTextBody
        preWrap={typeof customBody !== 'string'}
        jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
        style={style}
      >
        <RenderBody
          body={trimmedBody}
          customBody={customBody}
          highlightRegex={highlightRegex}
          htmlReactParserOptions={htmlReactParserOptions}
          linkifyOpts={linkifyOpts}
        />
        {edited && <MessageEditedContent />}
      </MessageTextBody>
      {urlPreview && <UrlPreview body={trimmedBody} ts={ts} />}
    </>
  );
}

type MEmoteProps = {
  displayName: string;
  edited?: boolean;
  content: object;
  urlPreview?: boolean;
  ts: number;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};
export function MEmote({
  displayName,
  edited,
  content,
  urlPreview,
  ts,
  highlightRegex,
  linkifyOpts,
  htmlReactParserOptions,
}: MEmoteProps) {
  const body = rContent.body(content);
  const customBody = rContent.formattedBody(content);

  if (typeof body !== 'string') return <BrokenContent />;
  const trimmedBody = trimReplyFromBody(body);

  return (
    <>
      <MessageTextBody
        emote
        preWrap={typeof customBody !== 'string'}
        jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
      >
        <b>{`${displayName} `}</b>
        <RenderBody
          body={trimmedBody}
          customBody={customBody}
          highlightRegex={highlightRegex}
          htmlReactParserOptions={htmlReactParserOptions}
          linkifyOpts={linkifyOpts}
        />
        {edited && <MessageEditedContent />}
      </MessageTextBody>
      {urlPreview && <UrlPreview body={trimmedBody} ts={ts} />}
    </>
  );
}

type MNoticeProps = {
  edited?: boolean;
  content: object;
  urlPreview?: boolean;
  ts: number;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};
export function MNotice({
  edited,
  content,
  urlPreview,
  ts,
  highlightRegex,
  linkifyOpts,
  htmlReactParserOptions,
}: MNoticeProps) {
  const body = rContent.body(content);
  const customBody = rContent.formattedBody(content);

  if (typeof body !== 'string') return <BrokenContent />;
  const trimmedBody = trimReplyFromBody(body);

  return (
    <>
      <MessageTextBody
        notice
        preWrap={typeof customBody !== 'string'}
        jumboEmoji={JUMBO_EMOJI_REG.test(trimmedBody)}
      >
        <RenderBody
          body={trimmedBody}
          customBody={customBody}
          highlightRegex={highlightRegex}
          htmlReactParserOptions={htmlReactParserOptions}
          linkifyOpts={linkifyOpts}
        />
        {edited && <MessageEditedContent />}
      </MessageTextBody>
      {urlPreview && <UrlPreview body={trimmedBody} ts={ts} />}
    </>
  );
}

type MImageProps = {
  content: object;
  mediaAutoLoad?: boolean;
  outlined?: boolean;
};
export function MImage({ content, mediaAutoLoad, outlined }: MImageProps) {
  const info = rContent.info(content);
  const mxcUrl = rEncryptedFile.url(rContent.file(content)) ?? rContent.url(content);

  if (typeof mxcUrl !== 'string') {
    return <BrokenContent />;
  }

  const height = scaleYDimension(rInfo.w(info) || 400, 400, rInfo.h(info) || 400);

  return (
    <Attachment outlined={outlined}>
      <AttachmentBox
        style={{
          height: toRem(height < 48 ? 48 : height),
        }}
      >
        <ImageContent
          body={rContent.body(content) ?? 'Image'}
          info={info}
          mimeType={rInfo.mimetype(info)}
          url={mxcUrl}
          encInfo={rContent.file(content)}
          autoPlay={mediaAutoLoad}
          markedAsSpoiler={rContent.spoiler(content)}
          spoilerReason={rContent.spoilerReason(content)}
        />
      </AttachmentBox>
    </Attachment>
  );
}

type MFileProps = {
  content: object;
  outlined?: boolean;
};
export function MFile({ content, outlined }: MFileProps) {
  const fileInfo = rContent.info(content);
  const mxcUrl = rEncryptedFile.url(rContent.file(content)) ?? rContent.url(content);

  if (typeof mxcUrl !== 'string') {
    return <BrokenContent />;
  }

  const body = rContent.filename(content) ?? rContent.body(content) ?? 'Unnamed File';
  const mimeType = rInfo.mimetype(fileInfo) ?? FALLBACK_MIMETYPE;

  return (
    <Attachment outlined={outlined}>
      <AttachmentHeader>
        <FileHeader body={body} mimeType={mimeType} />
      </AttachmentHeader>
      <AttachmentBox>
        <AttachmentContent>
          <FileContent
            body={body}
            mimeType={mimeType}
            info={fileInfo ?? {}}
            url={mxcUrl}
            encInfo={rContent.file(content)}
          />
        </AttachmentContent>
      </AttachmentBox>
    </Attachment>
  );
}

type MVideoProps = {
  content: object;
  mediaAutoLoad?: boolean;
  outlined?: boolean;
};
export function MVideo({ content, mediaAutoLoad, outlined }: MVideoProps) {
  const videoInfo = rContent.info(content);
  const mxcUrl = rEncryptedFile.url(rContent.file) ?? rContent.url(content);
  const safeMimeType = getBlobSafeMimeType(rInfo.mimetype(videoInfo) ?? '');

  if (!videoInfo || !safeMimeType.startsWith('video') || typeof mxcUrl !== 'string') {
    if (mxcUrl) {
      return <MFile content={content} outlined={outlined} />;
    }
    return <BrokenContent />;
  }

  const height = scaleYDimension(rInfo.w(videoInfo) || 400, 400, rInfo.h(videoInfo) || 400);

  const filename = rContent.filename(content) ?? rContent.body(content) ?? 'Video';

  return (
    <Attachment outlined={outlined}>
      <AttachmentHeader>
        <FileHeader
          body={filename}
          mimeType={safeMimeType}
          after={
            <FileDownloadButton
              filename={filename}
              url={mxcUrl}
              mimeType={safeMimeType}
              encInfo={rContent.file(content)}
            />
          }
        />
      </AttachmentHeader>
      <AttachmentBox
        style={{
          height: toRem(height < 48 ? 48 : height),
        }}
      >
        <VideoContent
          body={rContent.body(content) || 'Video'}
          info={videoInfo}
          mimeType={safeMimeType}
          url={mxcUrl}
          encInfo={rContent.file(content)}
          mediaAutoLoad={mediaAutoLoad}
          markedAsSpoiler={rContent.spoiler(content)}
          spoilerReason={rContent.spoilerReason(content)}
        />
      </AttachmentBox>
    </Attachment>
  );
}

type MAudioProps = {
  content: object;
  outlined?: boolean;
};
export function MAudio({ content, outlined }: MAudioProps) {
  const audioInfo = rContent.info(content);
  const mxcUrl = rEncryptedFile.url(rContent.file(content)) ?? rContent.url(content);
  const safeMimeType = getBlobSafeMimeType(rInfo.mimetype(audioInfo) ?? '');

  if (!audioInfo || !safeMimeType.startsWith('audio') || typeof mxcUrl !== 'string') {
    if (mxcUrl) {
      return <MFile content={content} outlined={outlined} />;
    }
    return <BrokenContent />;
  }

  const filename = rContent.filename(content) ?? rContent.body(content) ?? 'Audio';
  return (
    <Attachment outlined={outlined}>
      <AttachmentHeader>
        <FileHeader
          body={filename}
          mimeType={safeMimeType}
          after={
            <FileDownloadButton
              filename={filename}
              url={mxcUrl}
              mimeType={safeMimeType}
              encInfo={rContent.file(content)}
            />
          }
        />
      </AttachmentHeader>
      <AttachmentBox>
        <AttachmentContent>
          <AudioContent
            info={audioInfo}
            mimeType={safeMimeType}
            url={mxcUrl}
            encInfo={rContent.file(content)}
          />
        </AttachmentContent>
      </AttachmentBox>
    </Attachment>
  );
}

type MLocationProps = {
  content: object;
};
export function MLocation({ content }: MLocationProps) {
  const geoUri = rContent.geoUri(content);
  if (!geoUri) return <BrokenContent />;
  const location = parseGeoUri(geoUri);
  if (!location) return <BrokenContent />;

  return (
    <Box direction="Column" alignItems="Start" gap="100">
      <Text size="T400">{geoUri}</Text>
      <Chip
        as="a"
        size="400"
        href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}
        target="_blank"
        rel="noreferrer noopener"
        variant="Primary"
        radii="Pill"
        before={<Icon src={Icons.External} size="50" />}
      >
        <Text size="B300">Open Location</Text>
      </Chip>
    </Box>
  );
}

type MStickerProps = {
  content: object;
  mediaAutoLoad?: boolean;
  outlineAttachment?: boolean;
};
export function MSticker({ content, mediaAutoLoad, outlineAttachment }: MStickerProps) {
  const imgInfo = rContent.info(content);
  const mxcUrl = rEncryptedFile.url(rContent.file(content)) ?? rContent.url(content);

  if (typeof mxcUrl !== 'string') {
    return <MessageBrokenContent />;
  }
  const height = scaleYDimension(rInfo.w(imgInfo) || 152, 152, rInfo.h(imgInfo) || 152);

  return (
    <AttachmentBox
      style={{
        height: toRem(height < 48 ? 48 : height),
        width: toRem(152),
      }}
    >
      <MImage content={content} mediaAutoLoad={mediaAutoLoad} outlined={outlineAttachment} />
    </AttachmentBox>
  );
}
