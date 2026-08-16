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

type ReplyMTextProps = {
  edited?: boolean;
  content: object;
  style?: CSSProperties;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};
export function ReplyMText({
  edited,
  content,
  style,
  highlightRegex,
  linkifyOpts,
  htmlReactParserOptions,
}: ReplyMTextProps) {
  const body = rContent.body(content);
  const customBody = rContent.formattedBody(content);
  const trimmedBody = trimReplyFromBody(body ?? '');

  if (typeof body !== 'string') return <BrokenContent />;

  return (
    <MessageTextBody size="T300" style={style} truncate>
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

type ReplyMEmoteProps = {
  displayName: string;
  edited?: boolean;
  content: object;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};
export function ReplyMEmote({
  displayName,
  edited,
  content,
  highlightRegex,
  linkifyOpts,
  htmlReactParserOptions,
}: ReplyMEmoteProps) {
  const body = rContent.body(content);
  const customBody = rContent.formattedBody(content);

  if (typeof body !== 'string') return <BrokenContent />;
  const trimmedBody = trimReplyFromBody(body);

  return (
    <MessageTextBody size="T300" emote preWrap={typeof customBody !== 'string'} truncate>
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

type ReplyMNoticeProps = {
  edited?: boolean;
  content: object;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};
export function ReplyMNotice({
  edited,
  content,
  highlightRegex,
  linkifyOpts,
  htmlReactParserOptions,
}: ReplyMNoticeProps) {
  const body = rContent.body(content);
  const customBody = rContent.formattedBody(content);

  if (typeof body !== 'string') return <BrokenContent />;
  const trimmedBody = trimReplyFromBody(body);

  return (
    <MessageTextBody size="T300" notice preWrap={typeof customBody !== 'string'} truncate>
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

type ReplyMLocationProps = {
  content: object;
};
export function ReplyMLocation({ content }: ReplyMLocationProps) {
  const geoUri = rContent.geoUri(content);
  if (!geoUri) return <BrokenContent />;
  const location = parseGeoUri(geoUri);
  if (!location) return <BrokenContent />;

  return <Text size="T300">{geoUri}</Text>;
}
