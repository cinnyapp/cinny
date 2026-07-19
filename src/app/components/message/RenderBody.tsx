import React from 'react';
import parse, { HTMLReactParserOptions } from 'html-react-parser';
import Linkify from 'linkify-react';
import { Chip, Text } from 'folds';
import { Opts } from 'linkifyjs';
import { MessageEmptyContent } from './content';
import { sanitizeCustomHtml } from '../../utils/sanitize';
import { highlightText, scaleSystemEmoji } from '../../plugins/react-custom-html-parser';

export function shouldTruncate(
  body: string,
  customBody?: string,
  maxLines = 15,
  charPerLine = 100
) {
  // Count text characters (strip HTML tags)
  const text = customBody?.replace(/<[^>]+>/g, '') || body;

  const newlines = (body.match(/\n/g) || []).length;

  return text.length > maxLines * charPerLine || newlines > maxLines;
}

const NEXT_LINE_ONLY_REGEX = /^\n+$/;

type RenderBodyProps = {
  body: string;
  customBody?: string;
  highlightRegex?: RegExp;
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: Opts;
};
export function RenderBody({
  body,
  customBody,
  highlightRegex,
  htmlReactParserOptions,
  linkifyOpts,
}: RenderBodyProps) {
  if (body === '' || NEXT_LINE_ONLY_REGEX.test(body)) return <MessageEmptyContent />;
  if (typeof customBody === 'string') {
    if (customBody === '') return <MessageEmptyContent />;
    return parse(sanitizeCustomHtml(customBody), htmlReactParserOptions);
  }
  return (
    <Linkify options={linkifyOpts}>
      {highlightRegex
        ? highlightText(highlightRegex, scaleSystemEmoji(body))
        : scaleSystemEmoji(body)}
    </Linkify>
  );
}

export function ViewMoreLessButton({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <Chip
      type="button"
      variant="Primary"
      fill="Soft"
      radii="300"
      onClick={onToggle}
      outlined
      style={{
        position: collapsed ? 'sticky' : 'initial',
        bottom: '0',
        borderBottomLeftRadius: collapsed ? 0 : undefined,
        borderBottomRightRadius: collapsed ? 0 : undefined,
      }}
    >
      <Text size="L400">{collapsed ? 'View More' : 'View Less'}</Text>
    </Chip>
  );
}
