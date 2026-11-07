/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, { CSSProperties } from 'react';
import { Text } from 'folds';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts } from 'linkifyjs';
import { trimReplyFromBody } from '../../utils/room';
import { MessageTextBody } from './layout';
import { MessageEditedContent } from './content';
import { RenderBody } from './RenderBody';
import { rContent } from '../../../client/reader';
import { parseGeoUri } from '../../utils/common';
import { BrokenContent } from './MsgTypeRenderers';

type InlineTextSize = 'T300' | 'T200' | 'T400';

type InlineMTextProps = {
  size?: InlineTextSize;
  edited?: boolean;
  content: object;
  style?: CSSProperties;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};

export function InlineMText({
  size = 'T300',
  edited,
  content,
  style,
  highlightRegex,
  linkifyOpts,
  htmlReactParserOptions,
}: InlineMTextProps) {
  const body = rContent.body(content);
  const customBody = rContent.formattedBody(content);
  const trimmedBody = trimReplyFromBody(body ?? '');

  if (typeof body !== 'string') return <BrokenContent />;

  return (
    <MessageTextBody size={size} style={style} truncate>
      <RenderBody
        body={trimmedBody}
        customBody={customBody}
        highlightRegex={highlightRegex}
        htmlReactParserOptions={htmlReactParserOptions}
        linkifyOpts={linkifyOpts}
      />
      {edited && <MessageEditedContent />}
    </MessageTextBody>
  );
}

type InlineMEmoteProps = {
  size?: InlineTextSize;
  displayName: string;
  edited?: boolean;
  content: object;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};

export function InlineMEmote({
  size = 'T300',
  displayName,
  edited,
  content,
  highlightRegex,
  linkifyOpts,
  htmlReactParserOptions,
}: InlineMEmoteProps) {
  const body = rContent.body(content);
  const customBody = rContent.formattedBody(content);

  if (typeof body !== 'string') return <BrokenContent />;
  const trimmedBody = trimReplyFromBody(body);

  return (
    <MessageTextBody size={size} emote truncate>
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
  );
}

type InlineMNoticeProps = {
  size?: InlineTextSize;
  edited?: boolean;
  content: object;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};

export function InlineMNotice({
  size = 'T300',
  edited,
  content,
  highlightRegex,
  linkifyOpts,
  htmlReactParserOptions,
}: InlineMNoticeProps) {
  const body = rContent.body(content);
  const customBody = rContent.formattedBody(content);

  if (typeof body !== 'string') return <BrokenContent />;
  const trimmedBody = trimReplyFromBody(body);

  return (
    <MessageTextBody size={size} notice truncate>
      <RenderBody
        body={trimmedBody}
        customBody={customBody}
        highlightRegex={highlightRegex}
        htmlReactParserOptions={htmlReactParserOptions}
        linkifyOpts={linkifyOpts}
      />
      {edited && <MessageEditedContent />}
    </MessageTextBody>
  );
}

type InlineMLocationProps = {
  size?: InlineTextSize;
  content: object;
};

export function InlineMLocation({ size = 'T300', content }: InlineMLocationProps) {
  const geoUri = rContent.geoUri(content);
  if (!geoUri) return <BrokenContent />;
  const location = parseGeoUri(geoUri);
  if (!location) return <BrokenContent />;

  return (
    <Text size={size} truncate>
      {geoUri}
    </Text>
  );
}
