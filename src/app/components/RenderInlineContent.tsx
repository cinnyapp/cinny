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
  InlineMEmote,
  InlineMNotice,
  InlineMText,
  InlineMLocation,
  EmptyContent,
  FallbackContent,
} from './message';
import { MsgType } from '../../types/matrix/common';
import { rContent } from '../../client/reader';
import { MessageEvent } from '../../types/matrix/room';

type InlineTextSize = 'T300' | 'T200' | 'T400';

type RenderInlineContentProps = {
  size?: InlineTextSize;
  displayName: string;
  eventType: string;
  edited?: boolean;
  content: object;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};

export function RenderInlineContent({
  size = 'T300',
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
        <Text size={size} priority="300" truncate>
          <i>Sticker</i>
        </Text>
      </FallbackContent>
    );
  }

  if (eventType !== MessageEvent.RoomMessage) {
    return <UnsupportedContent size={size} eventType={eventType} truncate />;
  }

  const msgType = rContent.msgtype(content);

  if (msgType === MsgType.Text) {
    return (
      <InlineMText
        size={size}
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
      <InlineMEmote
        size={size}
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
      <InlineMNotice
        size={size}
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
        <Text size={size} priority="300" truncate>
          <i>Image</i>
        </Text>
      </FallbackContent>
    );
  }

  if (msgType === MsgType.Video) {
    return (
      <FallbackContent iconSrc={Icons.Vlc}>
        <Text size={size} priority="300" truncate>
          <i>Video</i>
        </Text>
      </FallbackContent>
    );
  }

  if (msgType === MsgType.Audio) {
    return (
      <FallbackContent iconSrc={Icons.Play}>
        <Text size={size} priority="300" truncate>
          <i>Audio</i>
        </Text>
      </FallbackContent>
    );
  }

  if (msgType === MsgType.File) {
    return (
      <FallbackContent iconSrc={Icons.File}>
        <Text size={size} priority="300" truncate>
          <i>File</i>
        </Text>
      </FallbackContent>
    );
  }

  if (msgType === MsgType.Location) {
    return <InlineMLocation size={size} content={content} />;
  }

  if (Object.keys(content).length === 0) {
    return <EmptyContent size={size} truncate />;
  }

  return (
    <InlineMText
      size={size}
      edited={edited}
      content={content}
      highlightRegex={highlightRegex}
      htmlReactParserOptions={htmlReactParserOptions}
      linkifyOpts={linkifyOpts}
    />
  );
}
