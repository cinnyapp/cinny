import React from 'react';
import { MsgType } from 'matrix-js-sdk';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts } from 'linkifyjs';
import {
  AudioContent,
  DownloadFile,
  FileContent,
  ImageContent,
  MAudio,
  MBadEncrypted,
  MEmote,
  MFile,
  MImage,
  MLocation,
  MNotice,
  MText,
  MVideo,
  ReadPdfFile,
  ReadTextFile,
  RenderBody,
  ThumbnailContent,
  UnsupportedContent,
  VideoContent,
} from './message';
import { UrlPreviewCard, UrlPreviewHolder } from './url-preview';
import { Image, MediaControl, Video } from './media';
import { ImageViewer } from './image-viewer';
import { PdfViewer } from './Pdf-viewer';
import { TextViewer } from './text-viewer';
import { testMatrixTo } from '../plugins/matrix-to';

type RenderMessageContentProps = {
  displayName: string;
  msgType: string;
  ts: number;
  edited?: boolean;
  getContent: <T>() => T;
  mediaAutoLoad?: boolean;
  urlPreview?: boolean;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
  outlineAttachment?: boolean;
};
export function RenderMessageContent({
  displayName,
  msgType,
  ts,
  edited,
  getContent,
  mediaAutoLoad,
  urlPreview,
  highlightRegex,
  htmlReactParserOptions,
  linkifyOpts,
  outlineAttachment,
}: RenderMessageContentProps) {
  const renderUrlsPreview = (urls: string[]) => {
    const filteredUrls = urls.filter((url) => !testMatrixTo(url));
    if (filteredUrls.length === 0) return undefined;
    return (
      <UrlPreviewHolder>
        {filteredUrls.map((url) => (
          <UrlPreviewCard key={url} url={url} ts={ts} />
        ))}
      </UrlPreviewHolder>
    );
  };

  const renderFile = () => (
    <MFile
      content={getContent()}
      renderFileContent={({ body, mimeType, info, encInfo, url }) => (
        <FileContent
          body={body}
          mimeType={mimeType}
          renderAsPdfFile={() => (
            <ReadPdfFile
              body={body}
              mimeType={mimeType}
              url={url}
              encInfo={encInfo}
              renderViewer={(p) => <PdfViewer {...p} />}
            />
          )}
          renderAsTextFile={() => (
            <ReadTextFile
              body={body}
              mimeType={mimeType}
              url={url}
              encInfo={encInfo}
              renderViewer={(p) => <TextViewer {...p} />}
            />
          )}
        >
          <DownloadFile body={body} mimeType={mimeType} url={url} encInfo={encInfo} info={info} />
        </FileContent>
      )}
      outlined={outlineAttachment}
    />
  );

  if (msgType === MsgType.Text) {
    return (
      <MText
        edited={edited}
        content={getContent()}
        renderBody={(props) => (
          <RenderBody
            {...props}
            highlightRegex={highlightRegex}
            htmlReactParserOptions={htmlReactParserOptions}
            linkifyOpts={linkifyOpts}
          />
        )}
        renderUrlsPreview={urlPreview ? renderUrlsPreview : undefined}
      />
    );
  }

  if (msgType === MsgType.Emote) {
    return (
      <MEmote
        displayName={displayName}
        edited={edited}
        content={getContent()}
        renderBody={(props) => (
          <RenderBody
            {...props}
            highlightRegex={highlightRegex}
            htmlReactParserOptions={htmlReactParserOptions}
            linkifyOpts={linkifyOpts}
          />
        )}
        renderUrlsPreview={urlPreview ? renderUrlsPreview : undefined}
      />
    );
  }

  if (msgType === MsgType.Notice) {
    return (
      <MNotice
        edited={edited}
        content={getContent()}
        renderBody={(props) => (
          <RenderBody
            {...props}
            highlightRegex={highlightRegex}
            htmlReactParserOptions={htmlReactParserOptions}
            linkifyOpts={linkifyOpts}
          />
        )}
        renderUrlsPreview={urlPreview ? renderUrlsPreview : undefined}
      />
    );
  }

  if (msgType === MsgType.Image) {
    return (
      <MImage
        content={getContent()}
        renderImageContent={(props) => (
          <ImageContent
            {...props}
            autoPlay={mediaAutoLoad}
            renderImage={(p) => <Image {...p} loading="lazy" />}
            renderViewer={(p) => <ImageViewer {...p} />}
          />
        )}
        outlined={outlineAttachment}
      />
    );
  }

  if (msgType === MsgType.Video) {
    return (
      <MVideo
        content={getContent()}
        renderAsFile={renderFile}
        renderVideoContent={({ body, info, mimeType, url, encInfo }) => (
          <VideoContent
            body={body}
            info={info}
            mimeType={mimeType}
            url={url}
            encInfo={encInfo}
            renderThumbnail={
              mediaAutoLoad
                ? () => (
                    <ThumbnailContent
                      info={info}
                      renderImage={(src) => (
                        <Image alt={body} title={body} src={src} loading="lazy" />
                      )}
                    />
                  )
                : undefined
            }
            renderVideo={(p) => <Video {...p} />}
          />
        )}
        outlined={outlineAttachment}
      />
    );
  }

  if (msgType === MsgType.Audio) {
    return (
      <MAudio
        content={getContent()}
        renderAsFile={renderFile}
        renderAudioContent={(props) => (
          <AudioContent {...props} renderMediaControl={(p) => <MediaControl {...p} />} />
        )}
        outlined={outlineAttachment}
      />
    );
  }

  if (msgType === MsgType.File) {
    return renderFile();
  }

  if (msgType === MsgType.Location) {
    return <MLocation content={getContent()} />;
  }

  if (msgType === 'm.bad.encrypted') {
    return <MBadEncrypted />;
  }

  return <UnsupportedContent />;
}
