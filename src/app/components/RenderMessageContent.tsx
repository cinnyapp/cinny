import React from 'react';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts } from 'linkifyjs';
import { config } from 'folds';
import {
  MAudio,
  MEmote,
  MFile,
  MImage,
  MLocation,
  MNotice,
  MSticker,
  MText,
  MVideo,
  UnsupportedContent,
} from './message';
import { MsgType } from '../../types/matrix/common';
import { rContent } from '../../client/reader';
import { MessageEvent } from '../../types/matrix/room';

type RenderMessageContentProps = {
  displayName: string;
  eventType: string;
  ts: number;
  edited?: boolean;
  content: object;
  mediaAutoLoad?: boolean;
  urlPreview?: boolean;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
  outlineAttachment?: boolean;
};
export function RenderMessageContent({
  displayName,
  eventType,
  ts,
  edited,
  content,
  mediaAutoLoad,
  urlPreview,
  highlightRegex,
  htmlReactParserOptions,
  linkifyOpts,
  outlineAttachment,
}: RenderMessageContentProps) {
  if (eventType === MessageEvent.Sticker) {
    return (
      <MSticker
        content={content}
        mediaAutoLoad={mediaAutoLoad}
        outlineAttachment={outlineAttachment}
      />
    );
  }

  if (eventType !== MessageEvent.RoomMessage) {
    return <UnsupportedContent eventType={eventType} />;
  }

  const renderCaption = () => {
    const filename = rContent.filename(content);
    const body = rContent.body(content);

    if (filename && filename !== body && body) {
      return (
        <MText
          style={{ marginTop: config.space.S100 }}
          edited={edited}
          content={content}
          urlPreview={urlPreview}
          ts={ts}
          highlightRegex={highlightRegex}
          htmlReactParserOptions={htmlReactParserOptions}
          linkifyOpts={linkifyOpts}
        />
      );
    }
    return null;
  };

  const msgType = rContent.msgtype(content);

  if (msgType === MsgType.Text) {
    return (
      <MText
        edited={edited}
        content={content}
        urlPreview={urlPreview}
        ts={ts}
        highlightRegex={highlightRegex}
        htmlReactParserOptions={htmlReactParserOptions}
        linkifyOpts={linkifyOpts}
      />
    );
  }

  if (msgType === MsgType.Emote) {
    return (
      <MEmote
        displayName={displayName}
        edited={edited}
        content={content}
        urlPreview={urlPreview}
        ts={ts}
        highlightRegex={highlightRegex}
        htmlReactParserOptions={htmlReactParserOptions}
        linkifyOpts={linkifyOpts}
      />
    );
  }

  if (msgType === MsgType.Notice) {
    return (
      <MNotice
        edited={edited}
        content={content}
        urlPreview={urlPreview}
        ts={ts}
        highlightRegex={highlightRegex}
        htmlReactParserOptions={htmlReactParserOptions}
        linkifyOpts={linkifyOpts}
      />
    );
  }

  if (msgType === MsgType.Image) {
    return (
      <>
        <MImage content={content} mediaAutoLoad={mediaAutoLoad} outlined={outlineAttachment} />
        {renderCaption()}
      </>
    );
  }

  if (msgType === MsgType.Video) {
    return (
      <>
        <MVideo content={content} mediaAutoLoad={mediaAutoLoad} outlined={outlineAttachment} />
        {renderCaption()}
      </>
    );
  }

  if (msgType === MsgType.Audio) {
    return (
      <>
        <MAudio content={content} outlined={outlineAttachment} />
        {renderCaption()}
      </>
    );
  }

  if (msgType === MsgType.File) {
    return (
      <>
        <MFile content={content} outlined={outlineAttachment} />
        {renderCaption()}
      </>
    );
  }

  if (msgType === MsgType.Location) {
    return <MLocation content={content} />;
  }

  return (
    <MText
      edited={edited}
      content={content}
      urlPreview={urlPreview}
      ts={ts}
      highlightRegex={highlightRegex}
      htmlReactParserOptions={htmlReactParserOptions}
      linkifyOpts={linkifyOpts}
    />
  );
}
