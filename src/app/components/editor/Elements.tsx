import { Scroll, Text } from 'folds';
import React from 'react';
import { RenderElementProps, RenderLeafProps, useFocused, useSelected } from 'slate-react';

import * as css from './Elements.css';
import { EmoticonElement, LinkElement, MentionElement } from './slate';
import { useMatrixClient } from '../../hooks/useMatrixClient';

export enum MarkType {
  Bold = 'bold',
  Italic = 'italic',
  Underline = 'underline',
  StrikeThrough = 'strikeThrough',
  Code = 'code',
  Spoiler = 'spoiler',
}

export enum BlockType {
  Paragraph = 'paragraph',
  Heading = 'heading',
  CodeLine = 'code-line',
  CodeBlock = 'code-block',
  QuoteLine = 'quote-line',
  BlockQuote = 'block-quote',
  ListItem = 'list-item',
  OrderedList = 'ordered-list',
  UnorderedList = 'unordered-list',
  Mention = 'mention',
  Emoticon = 'emoticon',
  Link = 'link',
}

// Put this at the start and end of an inline component to work around this Chromium bug:
// https://bugs.chromium.org/p/chromium/issues/detail?id=1249405
function InlineChromiumBugfix() {
  return (
    <span className={css.InlineChromiumBugfix} contentEditable={false}>
      {String.fromCodePoint(160) /* Non-breaking space */}
    </span>
  );
}

function RenderMentionElement({
  attributes,
  element,
  children,
}: { element: MentionElement } & RenderElementProps) {
  const selected = useSelected();
  const focused = useFocused();

  return (
    <span
      {...attributes}
      className={css.Mention({
        highlight: element.highlight,
        focus: selected && focused,
      })}
      contentEditable={false}
    >
      {element.name}
      {children}
    </span>
  );
}

function RenderEmoticonElement({
  attributes,
  element,
  children,
}: { element: EmoticonElement } & RenderElementProps) {
  const mx = useMatrixClient();
  const selected = useSelected();
  const focused = useFocused();

  return (
    <span className={css.EmoticonBase} {...attributes}>
      <span
        className={css.Emoticon({
          focus: selected && focused,
        })}
        contentEditable={false}
      >
        {element.key.startsWith('mxc://') ? (
          <img
            className={css.EmoticonImg}
            src={mx.mxcUrlToHttp(element.key) ?? element.key}
            alt={element.shortcode}
          />
        ) : (
          element.key
        )}
        {children}
      </span>
    </span>
  );
}

function RenderLinkElement({
  attributes,
  element,
  children,
}: { element: LinkElement } & RenderElementProps) {
  return (
    <a href={element.href} {...attributes}>
      <InlineChromiumBugfix />
      {children}
    </a>
  );
}

export function RenderElement({ attributes, element, children }: RenderElementProps) {
  switch (element.type) {
    case BlockType.Paragraph:
      return (
        <Text {...attributes} className={css.Paragraph}>
          {children}
        </Text>
      );
    case BlockType.Heading:
      if (element.level === 1)
        return (
          <Text className={css.Heading} as="h2" size="H2" {...attributes}>
            {children}
          </Text>
        );
      if (element.level === 2)
        return (
          <Text className={css.Heading} as="h3" size="H3" {...attributes}>
            {children}
          </Text>
        );
      if (element.level === 3)
        return (
          <Text className={css.Heading} as="h4" size="H4" {...attributes}>
            {children}
          </Text>
        );
      return (
        <Text className={css.Heading} as="h3" size="H3" {...attributes}>
          {children}
        </Text>
      );
    case BlockType.CodeLine:
      return <div {...attributes}>{children}</div>;
    case BlockType.CodeBlock:
      return (
        <Text as="pre" className={css.CodeBlock} {...attributes}>
          <Scroll direction="Horizontal" variant="Warning" size="300" visibility="Hover" hideTrack>
            <div className={css.CodeBlockInternal}>{children}</div>
          </Scroll>
        </Text>
      );
    case BlockType.QuoteLine:
      return <div {...attributes}>{children}</div>;
    case BlockType.BlockQuote:
      return (
        <Text as="blockquote" className={css.BlockQuote} {...attributes}>
          {children}
        </Text>
      );
    case BlockType.ListItem:
      return (
        <Text as="li" {...attributes}>
          {children}
        </Text>
      );
    case BlockType.OrderedList:
      return (
        <ol className={css.List} {...attributes}>
          {children}
        </ol>
      );
    case BlockType.UnorderedList:
      return (
        <ul className={css.List} {...attributes}>
          {children}
        </ul>
      );
    case BlockType.Mention:
      return (
        <RenderMentionElement attributes={attributes} element={element}>
          {children}
        </RenderMentionElement>
      );
    case BlockType.Emoticon:
      return (
        <RenderEmoticonElement attributes={attributes} element={element}>
          {children}
        </RenderEmoticonElement>
      );
    case BlockType.Link:
      return (
        <RenderLinkElement attributes={attributes} element={element}>
          {children}
        </RenderLinkElement>
      );
    default:
      return (
        <Text className={css.Paragraph} {...attributes}>
          {children}
        </Text>
      );
  }
}

export function RenderLeaf({ attributes, leaf, children }: RenderLeafProps) {
  let child = children;
  if (leaf.bold)
    child = (
      <strong {...attributes}>
        <InlineChromiumBugfix />
        {child}
      </strong>
    );
  if (leaf.italic)
    child = (
      <i {...attributes}>
        <InlineChromiumBugfix />
        {child}
      </i>
    );
  if (leaf.underline)
    child = (
      <u {...attributes}>
        <InlineChromiumBugfix />
        {child}
      </u>
    );
  if (leaf.strikeThrough)
    child = (
      <s {...attributes}>
        <InlineChromiumBugfix />
        {child}
      </s>
    );
  if (leaf.code)
    child = (
      <code className={css.Code} {...attributes}>
        <InlineChromiumBugfix />
        {child}
      </code>
    );
  if (leaf.spoiler)
    child = (
      <span className={css.Spoiler} {...attributes}>
        <InlineChromiumBugfix />
        {child}
      </span>
    );

  if (child !== children) return child;

  return <span {...attributes}>{child}</span>;
}
