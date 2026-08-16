import React from 'react';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts } from 'linkifyjs';
import { Text } from 'folds';
import {
  MessageAudioContent,
  MessageFileContent,
  MessageImageContent,
  MessageStickerContent,
  MessageVideoContent,
  UnsupportedContent,
  ReplyMEmote,
  ReplyMNotice,
  ReplyMText,
  ReplyMLocation,
} from './message';
import { MsgType } from '../../types/matrix/common';
import { rContent } from '../../client/reader';
import { MessageEvent } from '../../types/matrix/room';

type RenderReplyContentProps = {
  displayName: string;
  eventType: string;
  edited?: boolean;
  content: object;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};

export function RenderReplyContent({
  displayName,
  eventType,
  edited,
  content,
  highlightRegex,
  htmlReactParserOptions,
  linkifyOpts,
}: RenderReplyContentProps) {
  if (eventType === MessageEvent.Sticker) {
    return (
      <Text size="T300" priority="300">
        <MessageStickerContent />
      </Text>
    );
  }

  if (eventType !== MessageEvent.RoomMessage) {
    return <UnsupportedContent size="T300" />;
  }

  const msgType = rContent.msgtype(content);

  if (msgType === MsgType.Text) {
    return (
      <ReplyMText
        edited={edited}
        content={content}
        highlightRegex={highlightRegex}
        htmlReactParserOptions={htmlReactParserOptions}
        linkifyOpts={linkifyOpts}
      />
    );
  }

  if (msgType === MsgType.Emote) {
    return (
      <ReplyMEmote
        displayName={displayName}
        edited={edited}
        content={content}
        highlightRegex={highlightRegex}
        htmlReactParserOptions={htmlReactParserOptions}
        linkifyOpts={linkifyOpts}
      />
    );
  }

  if (msgType === MsgType.Notice) {
    return (
      <ReplyMNotice
        edited={edited}
        content={content}
        highlightRegex={highlightRegex}
        htmlReactParserOptions={htmlReactParserOptions}
        linkifyOpts={linkifyOpts}
      />
    );
  }

  if (msgType === MsgType.Image) {
    return (
      <Text size="T300" priority="300">
        <MessageImageContent />
      </Text>
    );
  }

  if (msgType === MsgType.Video) {
    return (
      <Text size="T300" priority="300">
        <MessageVideoContent />
      </Text>
    );
  }

  if (msgType === MsgType.Audio) {
    return (
      <Text size="T300" priority="300">
        <MessageAudioContent />
      </Text>
    );
  }

  if (msgType === MsgType.File) {
    return (
      <Text size="T300" priority="300">
        <MessageFileContent />
      </Text>
    );
  }

  if (msgType === MsgType.Location) {
    return <ReplyMLocation content={content} />;
  }

  return (
    <ReplyMText
      edited={edited}
      content={content}
      highlightRegex={highlightRegex}
      htmlReactParserOptions={htmlReactParserOptions}
      linkifyOpts={linkifyOpts}
    />
  );
}
