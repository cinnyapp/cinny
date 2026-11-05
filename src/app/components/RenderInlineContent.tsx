/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React from 'react';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts } from 'linkifyjs';
import { Icons, Text } from 'folds';
import {
  UnsupportedContent,
  ReplyMEmote,
  ReplyMNotice,
  ReplyMText,
  ReplyMLocation,
  EmptyContent,
  FallbackContent,
} from './message';
import { MsgType } from '../../types/matrix/common';
import { rContent } from '../../client/reader';
import { MessageEvent } from '../../types/matrix/room';

type RenderInlineContentProps = {
  displayName: string;
  eventType: string;
  edited?: boolean;
  content: object;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};

export function RenderInlineContent({
  displayName,
  eventType,
  edited,
  content,
  highlightRegex,
  htmlReactParserOptions,
  linkifyOpts,
}: RenderInlineContentProps) {
  if (eventType === MessageEvent.Sticker) {
    return (
      <FallbackContent iconSrc={Icons.Sticker}>
        <Text size="T300" priority="300" truncate>
          <i>Sticker</i>
        </Text>
      </FallbackContent>
    );
  }

  if (eventType !== MessageEvent.RoomMessage) {
    return <UnsupportedContent size="T300" eventType={eventType} truncate />;
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
      <FallbackContent iconSrc={Icons.Photo}>
        <Text size="T300" priority="300" truncate>
          <i>Image</i>
        </Text>
      </FallbackContent>
    );
  }

  if (msgType === MsgType.Video) {
    return (
      <FallbackContent iconSrc={Icons.Vlc}>
        <Text size="T300" priority="300" truncate>
          <i>Video</i>
        </Text>
      </FallbackContent>
    );
  }

  if (msgType === MsgType.Audio) {
    return (
      <FallbackContent iconSrc={Icons.Play}>
        <Text size="T300" priority="300" truncate>
          <i>Audio</i>
        </Text>
      </FallbackContent>
    );
  }

  if (msgType === MsgType.File) {
    return (
      <FallbackContent iconSrc={Icons.File}>
        <Text size="T300" priority="300" truncate>
          <i>File</i>
        </Text>
      </FallbackContent>
    );
  }

  if (msgType === MsgType.Location) {
    return <ReplyMLocation content={content} />;
  }

  if (Object.keys(content).length === 0) {
    return <EmptyContent size="T300" truncate />;
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
